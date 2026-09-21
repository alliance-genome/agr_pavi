"""
Local job storage module for PAVI API.

This module provides SQLite-based job persistence for local EC2 deployment,
replacing DynamoDB for job tracking when running outside of AWS infrastructure.
"""

import json
import os
import sqlite3
import threading
from datetime import datetime
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

        conn.commit()
        log.info(f"Initialized local job store at {self.db_path}")

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
