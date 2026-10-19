"""
Local job storage module for PAVI API.

This module provides SQLite-based job persistence for local EC2 deployment,
replacing DynamoDB for job tracking when running outside of AWS infrastructure.
"""

import json
import os
import sqlite3
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

from log_mgmt.log_manager import get_logger

log = get_logger(__name__)


class LocalJobStore:
    """
    SQLite-based job storage for local deployment.

    Thread-safe implementation using connection-per-thread pattern.
    """

    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize the local job store.

        Args:
            db_path: Path to SQLite database file. If None, uses default location.
        """
        if db_path is None:
            # Default to /tmp/pavi/jobs/jobs.db
            default_dir = os.environ.get("PAVI_LOCAL_JOBS_PATH", "/tmp/pavi/jobs")
            Path(default_dir).mkdir(parents=True, exist_ok=True)
            db_path = os.path.join(default_dir, "jobs.db")

        self.db_path = db_path
        self._local = threading.local()
        self._init_database()

    def _get_connection(self) -> sqlite3.Connection:
        """Get thread-local database connection."""
        if not hasattr(self._local, "connection") or self._local.connection is None:
            self._local.connection = sqlite3.connect(
                self.db_path,
                check_same_thread=False,
                detect_types=sqlite3.PARSE_DECLTYPES,
            )
            self._local.connection.row_factory = sqlite3.Row
        conn: sqlite3.Connection = self._local.connection
        return conn

    def _init_database(self) -> None:
        """Initialize the database schema."""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                job_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                stage TEXT,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                input_count INTEGER DEFAULT 0,
                sequences_processed INTEGER DEFAULT 0,
                error_message TEXT,
                input_data TEXT,
                result_path TEXT
            )
        """
        )
        # task_events is append-only JSON of per-stage/per-sequence
        # progress events for the /progress UI timeline. Added via
        # ALTER so existing jobs.db files keep working (SQLite ignores
        # the duplicate add on re-init via try/except).
        try:
            cursor.execute("ALTER TABLE jobs ADD COLUMN task_events TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists — fresh schemas get it from CREATE too in future

        # Create index for faster status queries
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)
        """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC)
        """
        )

        # Share tokens: a short URL-safe token that grants read-only access
        # to a specific job's results without needing the UUID. The job UUID
        # is kept out of the public URL to avoid letting someone sweep /jobs.
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS share_tokens (
                token       TEXT PRIMARY KEY,
                job_id      TEXT NOT NULL,
                created_at  TEXT NOT NULL,
                expires_at  TEXT,
                revoked_at  TEXT,
                last_used   TEXT,
                use_count   INTEGER DEFAULT 0,
                FOREIGN KEY (job_id) REFERENCES jobs(job_id)
            )
            """
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_share_tokens_job_id ON share_tokens(job_id)"
        )

        # Access log: one row per API request, written by the HTTP
        # middleware. `path_template` is the UUID-normalised route
        # ("/api/pipeline-job/{uuid}/export") so Top-N aggregates don't
        # fragment per job; `job_uuid` and `export_format` are extracted
        # when present so the stats endpoint can group without re-parsing
        # path strings every query.
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS access_log (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                ts             TEXT NOT NULL,
                method         TEXT NOT NULL,
                path           TEXT NOT NULL,
                path_template  TEXT NOT NULL,
                status         INTEGER NOT NULL,
                duration_ms    REAL,
                job_uuid       TEXT,
                export_format  TEXT
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_access_log_ts ON access_log(ts)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_access_log_job_uuid ON access_log(job_uuid)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_access_log_path_template ON access_log(path_template)")

        conn.commit()
        log.info(f"Initialized local job store at {self.db_path}")

    # ------------------------------------------------------------------
    # Access-log methods
    # ------------------------------------------------------------------

    # Access-log retention: rows older than this get swept on write.
    # ~90 days is enough history for weekly review while bounding the
    # table at roughly `requests_per_day * 90` — on the dev box with
    # a few hundred req/day that's at most tens of thousands of rows.
    ACCESS_LOG_RETENTION_DAYS = 90
    # Probability of running the sweep on any given write. Keeps the
    # amortised cost of logging near-zero (one DELETE per ~100 writes
    # instead of one per write) while still trimming regularly on a
    # live system.
    ACCESS_LOG_SWEEP_PROBABILITY = 0.01

    def log_access(
        self,
        ts: str,
        method: str,
        path: str,
        path_template: str,
        status: int,
        duration_ms: float,
        job_uuid: Optional[str] = None,
        export_format: Optional[str] = None,
    ) -> None:
        """Append one row to the access log. Must be cheap: called on
        every request. Errors are logged and swallowed — losing a telemetry
        row must never surface as a 500 to the user."""
        try:
            conn = self._get_connection()
            conn.execute(
                "INSERT INTO access_log "
                "(ts, method, path, path_template, status, duration_ms, job_uuid, export_format) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (ts, method, path, path_template, status, duration_ms, job_uuid, export_format),
            )
            conn.commit()
        except Exception as e:  # intentionally broad: never crash the hot path
            log.warning(f"Failed to persist access log row: {e}")
            return

        # Opportunistic retention sweep: cheap on average, keeps the table
        # bounded without needing a separate scheduler process.
        import random
        if random.random() < self.ACCESS_LOG_SWEEP_PROBABILITY:
            try:
                self.trim_access_log()
            except Exception as e:
                log.warning(f"Access log trim failed: {e}")

    # ------------------------------------------------------------------
    # Task events (per-sequence progress timeline)
    # ------------------------------------------------------------------

    def append_task_event(self, job_id: str, message: str, entry_id: Optional[str] = None) -> None:
        """
        Append a task event to a job's running timeline. Each event is
        {ts, message, entry_id?}. Stored as the full JSON list so a
        single UPDATE replaces the whole value — tiny lists (one per
        sequence), so cost is negligible vs. a separate events table.
        """
        try:
            conn = self._get_connection()
            row = conn.execute(
                "SELECT task_events FROM jobs WHERE job_id = ?",
                (job_id,),
            ).fetchone()
            if row is None:
                return
            existing: list[dict[str, Any]] = []
            raw = row[0]
            if raw:
                try:
                    existing = json.loads(raw)
                    if not isinstance(existing, list):
                        existing = []
                except (ValueError, TypeError):
                    existing = []
            event: dict[str, Any] = {
                "ts": datetime.utcnow().isoformat() + "Z",
                "message": message,
            }
            if entry_id is not None:
                event["entry_id"] = entry_id
            existing.append(event)
            conn.execute(
                "UPDATE jobs SET task_events = ? WHERE job_id = ?",
                (json.dumps(existing), job_id),
            )
            conn.commit()
        except Exception as e:
            # Telemetry failure must never crash the pipeline.
            log.warning(f"Failed to append task event for {job_id}: {e}")

    def get_task_events(self, job_id: str) -> list[dict[str, Any]]:
        """Return the task-event list for a job, or [] if none."""
        try:
            conn = self._get_connection()
            row = conn.execute(
                "SELECT task_events FROM jobs WHERE job_id = ?",
                (job_id,),
            ).fetchone()
            if row is None or not row[0]:
                return []
            parsed = json.loads(row[0])
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []

    # ------------------------------------------------------------------
    # Backup
    # ------------------------------------------------------------------

    def snapshot(self, out_path: Path) -> int:
        """
        Online SQLite backup to `out_path`. Safe to call while the DB
        is live — SQLite's backup API locks pages one at a time instead
        of taking the whole DB. Returns the on-disk size of the snapshot.
        """
        out_path.parent.mkdir(parents=True, exist_ok=True)
        src = self._get_connection()
        with sqlite3.connect(str(out_path)) as dst:
            src.backup(dst)
        return out_path.stat().st_size

    def list_snapshots(self, snapshot_dir: Path) -> list[dict[str, Any]]:
        """Return metadata for every *.sqlite file in `snapshot_dir`."""
        if not snapshot_dir.exists():
            return []
        rows = []
        for p in sorted(snapshot_dir.glob("jobs-*.sqlite")):
            try:
                st = p.stat()
            except OSError:
                continue
            rows.append({
                "name": p.name,
                "bytes": st.st_size,
                "created_at": datetime.fromtimestamp(st.st_mtime).isoformat() + "Z",
            })
        return rows

    def prune_snapshots(self, snapshot_dir: Path, keep: int) -> int:
        """Delete all but the `keep` most recent snapshots. Returns the
        number removed. Keeps the newest files by mtime, which matches
        the backup script's intent (latest history takes precedence)."""
        if not snapshot_dir.exists() or keep < 0:
            return 0
        snaps = sorted(
            snapshot_dir.glob("jobs-*.sqlite"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        removed = 0
        for p in snaps[keep:]:
            try:
                p.unlink()
                removed += 1
            except OSError as e:
                log.warning(f"Failed to prune snapshot {p}: {e}")
        return removed

    def trim_access_log(self, retention_days: Optional[int] = None) -> int:
        """Delete access_log rows older than `retention_days`. Returns
        the number of rows removed. Safe to call manually from an admin
        endpoint for a forced sweep."""
        days = retention_days if retention_days is not None else self.ACCESS_LOG_RETENTION_DAYS
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"
        conn = self._get_connection()
        cur = conn.execute("DELETE FROM access_log WHERE ts < ?", (cutoff,))
        conn.commit()
        return cur.rowcount

    # ------------------------------------------------------------------
    # Share-token methods
    # ------------------------------------------------------------------

    def create_share_token(
        self, token: str, job_id: str, expires_at: Optional[str] = None
    ) -> dict[str, Any]:
        """Store a new share token for a job."""
        conn = self._get_connection()
        conn.execute(
            "INSERT INTO share_tokens (token, job_id, created_at, expires_at) "
            "VALUES (?, ?, ?, ?)",
            (token, job_id, datetime.utcnow().isoformat(), expires_at),
        )
        conn.commit()
        return {"token": token, "job_id": job_id, "expires_at": expires_at}

    def resolve_share_token(self, token: str) -> Optional[dict[str, Any]]:
        """
        Resolve a share token to its job_id. Returns None if the token is
        unknown, revoked, or expired. Also bumps last_used / use_count.
        """
        conn = self._get_connection()
        row = conn.execute(
            "SELECT token, job_id, created_at, expires_at, revoked_at "
            "FROM share_tokens WHERE token = ?",
            (token,),
        ).fetchone()
        if row is None:
            return None
        if row["revoked_at"] is not None:
            return None
        if row["expires_at"]:
            try:
                if datetime.fromisoformat(row["expires_at"]) < datetime.utcnow():
                    return None
            except ValueError:
                pass
        conn.execute(
            "UPDATE share_tokens SET last_used = ?, use_count = use_count + 1 "
            "WHERE token = ?",
            (datetime.utcnow().isoformat(), token),
        )
        conn.commit()
        return dict(row)

    def list_share_tokens(self, job_id: str) -> list[dict[str, Any]]:
        """Return all share tokens issued for a job (including revoked)."""
        conn = self._get_connection()
        rows = conn.execute(
            "SELECT token, job_id, created_at, expires_at, revoked_at, "
            "last_used, use_count FROM share_tokens WHERE job_id = ? "
            "ORDER BY created_at DESC",
            (job_id,),
        ).fetchall()
        return [dict(r) for r in rows]

    def revoke_share_token(self, token: str) -> bool:
        """Revoke a share token. Returns True if a row was updated."""
        conn = self._get_connection()
        cur = conn.execute(
            "UPDATE share_tokens SET revoked_at = ? "
            "WHERE token = ? AND revoked_at IS NULL",
            (datetime.utcnow().isoformat(), token),
        )
        conn.commit()
        return cur.rowcount > 0

    def create_job(
        self, job_id: str, input_data: list[dict[str, Any]], input_count: int = 0
    ) -> dict[str, Any]:
        """
        Create a new job record.

        Args:
            job_id: Unique job identifier
            input_data: List of sequence region dictionaries
            input_count: Number of input sequences

        Returns:
            Dictionary with job details
        """
        now = datetime.utcnow().isoformat() + "Z"
        input_json = json.dumps(input_data)

        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO jobs (job_id, status, stage, created_at, input_count, input_data)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (job_id, "PENDING", "INITIALIZING", now, input_count, input_json),
        )

        conn.commit()
        log.info(f"Created job {job_id} with {input_count} sequences")

        return {
            "job_id": job_id,
            "status": "PENDING",
            "stage": "INITIALIZING",
            "created_at": now,
            "input_count": input_count,
            "sequences_processed": 0,
            "error_message": None,
            "completed_at": None,
            "result_path": None,
        }

    def get_job(self, job_id: str) -> Optional[dict[str, Any]]:
        """
        Get job by ID.

        Args:
            job_id: Job identifier

        Returns:
            Job dictionary or None if not found
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,))
        row = cursor.fetchone()

        if row is None:
            return None

        return dict(row)

    def update_job(self, job_id: str, **updates: Any) -> bool:
        """
        Update job fields.

        Args:
            job_id: Job identifier
            **updates: Fields to update (status, stage, error_message, etc.)

        Returns:
            True if job was updated, False if not found
        """
        if not updates:
            return False

        conn = self._get_connection()
        cursor = conn.cursor()

        # Build update query
        set_clauses = []
        values = []
        for key, value in updates.items():
            set_clauses.append(f"{key} = ?")
            values.append(value)

        values.append(job_id)

        query = f"UPDATE jobs SET {', '.join(set_clauses)} WHERE job_id = ?"
        cursor.execute(query, values)
        conn.commit()

        updated = cursor.rowcount > 0
        if updated:
            log.debug(f"Updated job {job_id}: {updates}")
        return updated

    def list_jobs(self, limit: int = 100, status: Optional[str] = None) -> list[dict[str, Any]]:
        """
        List jobs ordered by creation time (newest first).

        Args:
            limit: Maximum number of jobs to return
            status: Optional status filter

        Returns:
            List of job dictionaries
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        if status:
            cursor.execute(
                """
                SELECT * FROM jobs
                WHERE status = ?
                ORDER BY created_at DESC
                LIMIT ?
            """,
                (status, limit),
            )
        else:
            cursor.execute(
                """
                SELECT * FROM jobs
                ORDER BY created_at DESC
                LIMIT ?
            """,
                (limit,),
            )

        return [dict(row) for row in cursor.fetchall()]

    def delete_job(self, job_id: str) -> bool:
        """
        Delete a job record.

        Args:
            job_id: Job identifier

        Returns:
            True if job was deleted, False if not found
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM jobs WHERE job_id = ?", (job_id,))
        conn.commit()

        deleted = cursor.rowcount > 0
        if deleted:
            log.info(f"Deleted job {job_id}")
        return deleted

    def cleanup_old_jobs(self, days: int = 30) -> int:
        """
        Delete jobs older than specified number of days.

        Args:
            days: Number of days to retain jobs

        Returns:
            Number of jobs deleted
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        # Calculate cutoff date
        from datetime import timedelta

        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"

        cursor.execute(
            """
            DELETE FROM jobs WHERE created_at < ?
        """,
            (cutoff,),
        )
        conn.commit()

        deleted_count = cursor.rowcount
        if deleted_count > 0:
            log.info(f"Cleaned up {deleted_count} jobs older than {days} days")
        return deleted_count

    def close(self) -> None:
        """Close database connection."""
        if hasattr(self._local, "connection") and self._local.connection is not None:
            self._local.connection.close()
            self._local.connection = None


# Singleton instance
_local_job_store: Optional[LocalJobStore] = None


def get_local_job_store() -> LocalJobStore:
    """Get or create the local job store singleton."""
    global _local_job_store
    if _local_job_store is None:
        _local_job_store = LocalJobStore()
    return _local_job_store
