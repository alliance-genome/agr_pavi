# Troubleshooting Guide

This guide covers common issues and their solutions for PAVI components.

## Quick Diagnostics

### Health Check Commands

```bash
# API health
curl http://localhost:8000/api/health

# Detailed deployment status
curl http://localhost:8000/api/deployment-status

# WebUI health (if running)
curl http://localhost:3000/health
```

### Log Locations

| Component | Location |
|-----------|----------|
| API (local) | stdout/stderr |
| API (Docker) | `docker logs pavi-api` |
| WebUI (local) | stdout/stderr |
| WebUI (Docker) | `docker logs pavi-webui` |
| Local Pipeline Work | `/var/lib/pavi/work/{job_id}/` |
| SQLite Database | `/var/lib/pavi/jobs/jobs.db` |
| AWS CloudWatch | `/aws/stepfunctions/pavi-pipeline-{env}` |

---

## API Issues

### API Won't Start

**Symptom:** `uvicorn` fails to start or crashes immediately.

**Common Causes:**

1. **Port already in use:**
   ```bash
   # Check what's using port 8000
   lsof -i :8000

   # Kill the process
   kill -9 <PID>
   ```

2. **Missing dependencies:**
   ```bash
   cd api
   make install-deps
   ```

3. **Invalid configuration:**
   ```bash
   # Validate environment variables
   python -c "from config import PipelineConfig; print(PipelineConfig.from_env())"
   ```

### Job Submission Returns 500

**Symptom:** `POST /api/pipeline-job/` returns 500 Internal Server Error.

**Diagnostic Steps:**

1. Check API logs for stack trace
2. Verify request body format:
   ```bash
   # Valid request format
   curl -X POST http://localhost:8000/api/pipeline-job/ \
     -H "Content-Type: application/json" \
     -d '[{"base_seq_name": "test", "unique_entry_id": "1", ...}]'
   ```

3. Check AWS credentials (Step Functions mode):
   ```bash
   aws sts get-caller-identity
   ```

### Job Status Returns 404

**Symptom:** `GET /api/pipeline-job/{uuid}` returns 404 Not Found.

**Possible Causes:**

1. **Typo in UUID** - Verify the UUID from job submission response
2. **Wrong execution mode** - Job created in different mode than current
3. **DynamoDB table mismatch** - Check `DYNAMODB_JOBS_TABLE` variable
4. **Job expired (TTL)** - DynamoDB jobs expire after 30 days

### Results Not Ready (400)

**Symptom:** Result endpoints return `{"detail": "Results not ready. Job status: running"}`.

**Solutions:**

1. Wait for job completion - poll status endpoint
2. Check job stage for progress
3. If stuck, check pipeline logs for errors

---

## WebUI Issues

### "Failed to fetch" Errors

**Symptom:** Browser console shows "Failed to fetch" for API calls.

**Common Causes:**

1. **API not running:**
   ```bash
   curl http://localhost:8000/api/health
   ```

2. **CORS issues (development):**
   - Ensure API is running with CORS enabled
   - Check `PAVI_API_BASE_URL` is correct

3. **Wrong API URL:**
   ```bash
   # Check configured URL
   echo $PAVI_API_BASE_URL
   ```

### Alignment Visualization Not Rendering

**Symptom:** Alignment page shows blank or error.

**Diagnostic Steps:**

1. Check browser console for JavaScript errors
2. Verify alignment file is valid Clustal format:
   ```bash
   curl http://localhost:8000/api/pipeline-job/{uuid}/result/alignment
   ```
3. Check seq-info file is valid JSON:
   ```bash
   curl http://localhost:8000/api/pipeline-job/{uuid}/result/seq-info | jq .
   ```

### Nightingale Components Not Loading

**Symptom:** MSA viewer shows loading spinner indefinitely.

**Solutions:**

1. Clear browser cache
2. Check network tab for failed requests
3. Verify alignment data format in browser DevTools

---

## Pipeline Issues

### Sequence Retrieval Failures

**Symptom:** Job fails at `SEQUENCE_RETRIEVAL` stage.

**Common Errors:**

1. **FASTA file not accessible:**
   ```
   Error: Missing index file matching path...
   ```
   **Solution:** Verify FASTA URL is accessible and has `.fai` index

2. **Invalid coordinates:**
   ```
   Error: Variant ... out of boundaries of SeqRegion...
   ```
   **Solution:** Check exon/CDS region coordinates are within sequence bounds

3. **Variant API errors:**
   ```
   Error: Failed to fetch variant ZFIN:ZDB-ALT-...
   ```
   **Solution:** Verify variant ID exists in Alliance database

4. **Species sequences appear truncated or incorrect:**

   **Symptom:** Protein sequences for certain species (e.g., Xenopus) appear as very short fragments (15-25 amino acids instead of expected 400+ aa) or contain premature stop codons.

   **Root Cause:** Assembly version mismatch between JBrowse track coordinates and FASTA genome files. This occurs when:
   - Alliance updates JBrowse tracks to use coordinates from a newer genome assembly
   - But the FASTA URL in the cached constants still points to an older assembly

   **Diagnostic Steps:**
   ```bash
   # Check what FASTA URL is being used
   grep "jBrowsefastaurl" webui/next.lock/data/https_raw.githubusercontent.com/alliance-genome_agr_ui_main_src_constants_*.js | grep -i xenopus

   # Compare with current Alliance constants
   curl -s https://raw.githubusercontent.com/alliance-genome/agr_ui/main/src/constants.js | grep -A2 "Xenopus"

   # Check JBrowse2 config for FASTA URL
   curl -s https://www.alliancegenome.org/jbrowse2/config.json | grep -o '"fastaLocation"[^}]*}' | grep -i xen
   ```

   **Solution:** Update the cached constants files in `webui/next.lock/data/` with the correct FASTA URLs from upstream Alliance, then update the integrity hashes in `webui/next.lock/lock.json`.

   **Historical Examples:**
   - Feb 2026: Xenopus assemblies updated from v9.1/v9.2 to v10.0/v10.1

### Alignment Failures

**Symptom:** Job fails at `ALIGNMENT` stage.

**Common Causes:**

1. **Clustal Omega not found (local mode):**
   ```bash
   # Check if clustalo is installed
   which clustalo
   clustalo --version
   ```

2. **Memory issues:**
   - Large alignments may require more memory
   - Check system memory usage: `free -h`

3. **Invalid FASTA input:**
   - Sequences must be valid amino acid sequences
   - Check for non-standard characters

### Step Functions Execution Failures

**Symptom:** Job fails in AWS with cryptic error.

**Diagnostic Steps:**

1. Check CloudWatch Logs:
   ```bash
   aws logs tail /aws/stepfunctions/pavi-pipeline-{env} --follow
   ```

2. Check Step Functions console for execution details

3. Check AWS Batch job logs for container errors

---

## Local Pipeline Issues

### SQLite Database Errors

**Symptom:** Database-related errors in local mode.

**Solutions:**

1. **Permission denied:**
   ```bash
   sudo chown -R $(whoami):$(whoami) /var/lib/pavi
   ```

2. **Corrupted database:**
   ```bash
   # Backup and recreate
   mv /var/lib/pavi/jobs/jobs.db /var/lib/pavi/jobs/jobs.db.bak
   # Database will be recreated on next API start
   ```

3. **Disk full:**
   ```bash
   df -h /var/lib/pavi
   ```

### Work Directory Issues

**Symptom:** Jobs fail with file permission or space errors.

**Solutions:**

1. **Check permissions:**
   ```bash
   ls -la /var/lib/pavi/
   ```

2. **Check disk space:**
   ```bash
   df -h /var/lib/pavi
   du -sh /var/lib/pavi/*
   ```

3. **Clean old work files:**
   ```bash
   find /var/lib/pavi/work -type d -mtime +7 -exec rm -rf {} +
   ```

### Clustal Omega Build Issues

**Symptom:** `clustalo` command not found or fails.

**Rebuild Steps:**
```bash
# See docs/clustal-omega-build.md for full instructions
cd /tmp
git clone https://github.com/GSLBiotech/clustal-omega.git
cd clustal-omega
autoreconf -i
./configure
make
sudo make install
```

---

## AWS Issues

### DynamoDB Access Denied

**Symptom:** `AccessDeniedException` when accessing DynamoDB.

**Solutions:**

1. Check IAM role/user permissions
2. Verify table name matches configuration
3. Check AWS region is correct

### S3 Access Denied

**Symptom:** Cannot read/write to S3 buckets.

**Solutions:**

1. Check bucket policy allows access
2. Verify bucket name matches configuration
3. Check IAM permissions for S3 actions

### Step Functions Execution Stuck

**Symptom:** Execution stays in "RUNNING" state indefinitely.

**Diagnostic Steps:**

1. Check execution history in AWS Console
2. Look for stuck Lambda or Batch tasks
3. Check CloudWatch Logs for errors
4. Consider canceling and resubmitting

---

## Docker Issues

### Container Won't Start

**Symptom:** `docker-compose up` fails.

**Common Causes:**

1. **Image not built:**
   ```bash
   make container-image
   ```

2. **Port conflict:**
   ```bash
   docker-compose down
   lsof -i :8080
   ```

3. **Volume mount issues:**
   ```bash
   # Check volume permissions
   ls -la /var/lib/pavi
   ```

### Container Runs But API Unreachable

**Symptom:** Container starts but API returns connection refused.

**Solutions:**

1. Check container logs:
   ```bash
   docker logs pavi-api
   ```

2. Verify port mapping:
   ```bash
   docker ps
   ```

3. Check container health:
   ```bash
   docker exec pavi-api curl localhost:8080/api/health
   ```

---

## Development Issues

### Type Check Failures (mypy)

**Symptom:** `make run-type-checks` fails.

**Common Fixes:**

1. Install type stubs:
   ```bash
   mypy --install-types --non-interactive
   ```

2. Check for untyped function parameters
3. Add `# type: ignore` comments for false positives (sparingly)

### Lint Failures (flake8/eslint)

**Symptom:** Style checks fail.

**Solutions:**

1. **Python (flake8):**
   ```bash
   # Auto-format with black (if installed)
   black src/

   # Check specific file
   flake8 src/file.py
   ```

2. **TypeScript (eslint):**
   ```bash
   # Auto-fix
   npm run lint -- --fix
   ```

### Test Failures

**Symptom:** Unit or integration tests fail.

**Diagnostic Steps:**

1. Run specific test with verbose output:
   ```bash
   # Python
   pytest tests/a_unit/test_main.py -v

   # TypeScript
   npm run test:dev -- --testPathPattern="TestName"
   ```

2. Check test fixtures are up to date
3. Verify mock data matches current API format

---

## Recovery Procedures

### Reset Local Pipeline State

```bash
# Stop API
pkill -f uvicorn

# Backup current data
sudo mv /var/lib/pavi /var/lib/pavi.bak.$(date +%Y%m%d)

# Recreate directories
sudo mkdir -p /var/lib/pavi/{jobs,results,work}
sudo chown -R $(whoami):$(whoami) /var/lib/pavi

# Restart API
cd api/src && USE_LOCAL_PIPELINE=true ../.venv/bin/uvicorn main:app
```

### Clear Job History (Local Mode)

```bash
# Remove SQLite database
rm /var/lib/pavi/jobs/jobs.db

# Clear results
rm -rf /var/lib/pavi/results/*

# Clear work files
rm -rf /var/lib/pavi/work/*
```

### Force Cancel AWS Execution

```bash
# List running executions
aws stepfunctions list-executions \
  --state-machine-arn arn:aws:states:... \
  --status-filter RUNNING

# Stop specific execution
aws stepfunctions stop-execution \
  --execution-arn arn:aws:states:...
```

---

## Getting Help

If you can't resolve an issue:

1. Check existing GitHub issues: https://github.com/alliance-genome/agr_pavi/issues
2. Create a new issue with:
   - Error message and stack trace
   - Steps to reproduce
   - Environment details (OS, Python version, etc.)
   - Relevant configuration (with secrets redacted)

## Related Documentation

- [Configuration Reference](configuration-reference.md) - All environment variables
- [API Reference](api-reference.md) - Endpoint documentation
- [Local EC2 Deployment](local-ec2-deployment.md) - Local deployment guide
- [Step Functions Design](step-functions-design.md) - AWS architecture
