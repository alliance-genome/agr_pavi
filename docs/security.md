# Security Guide

This document describes security practices and considerations for PAVI deployment and operation.

## Overview

PAVI processes publicly available genomic data and does not handle personally identifiable information (PII). However, standard security practices are followed to protect infrastructure and ensure data integrity.

## Data Classification

| Data Type | Classification | Description |
|-----------|----------------|-------------|
| Genomic sequences | Public | From NCBI, Ensembl, Alliance |
| Variant data | Public | From Alliance Genome API |
| Alignment results | Derived | Computed from public data |
| Job metadata | Internal | UUIDs, timestamps, status |

## Authentication & Authorization

### Current State

- **API:** No authentication required
- **WebUI:** No authentication required
- **Admin Dashboard:** Password-protected (basic)

### Admin Dashboard

The admin page uses a simple password check:

```typescript
// Environment variable (not for production secrets)
NEXT_PUBLIC_ADMIN_PASSWORD=pavi-admin-2025
```

**Note:** This is not suitable for sensitive operations. Consider implementing proper authentication for production admin features.

### Recommendations for Future

For sensitive deployments:
- Implement OAuth 2.0 / OIDC for user authentication
- Add API key authentication for programmatic access
- Use AWS IAM roles for service-to-service auth
- Implement RBAC for admin operations

## API Security

### Input Validation

All API inputs are validated using Pydantic models:

```python
class Pipeline_seq_region(BaseModel):
    base_seq_name: str
    unique_entry_id: str
    seq_id: str
    seq_strand: str
    exon_seq_regions: list[str | dict[str, str | int]]
    cds_seq_regions: list[str | dict[str, str | int]]
    fasta_file_url: str
    variant_ids: list[str]
    alt_seq_name_suffix: Optional[str] = None
```

### URL Validation

FASTA file URLs are validated:
- Must be valid HTTP(S) or file:// URLs
- External URLs fetched via pysam (limited to FASTA format)
- No arbitrary file access

### Error Message Sanitization

Error messages are truncated to prevent information leakage:

```python
error_message = str(exception)[:1000]  # Max 1000 characters
```

### Rate Limiting

Currently not implemented. Recommendations:
- Add rate limiting at API gateway level
- Consider per-IP and per-endpoint limits
- Implement exponential backoff for clients

## AWS Security

### IAM Roles

PAVI uses least-privilege IAM roles:

#### API Service Role

```json
{
    "Effect": "Allow",
    "Action": [
        "states:StartExecution",
        "states:DescribeExecution"
    ],
    "Resource": "arn:aws:states:*:*:stateMachine:pavi-pipeline-*"
}
```

```json
{
    "Effect": "Allow",
    "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
    ],
    "Resource": "arn:aws:dynamodb:*:*:table/pavi-jobs-*"
}
```

```json
{
    "Effect": "Allow",
    "Action": [
        "s3:GetObject",
        "s3:PutObject"
    ],
    "Resource": "arn:aws:s3:::agr-pavi-pipeline-*/*"
}
```

#### Step Functions Execution Role

```json
{
    "Effect": "Allow",
    "Action": [
        "batch:SubmitJob",
        "batch:DescribeJobs"
    ],
    "Resource": "*"
}
```

### S3 Bucket Security

All S3 buckets have:
- Block public access enabled
- Server-side encryption (SSE-S3)
- Lifecycle policies for data retention
- Bucket policies restricting access

```json
{
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Deny",
        "Principal": "*",
        "Action": "s3:*",
        "Resource": [
            "arn:aws:s3:::agr-pavi-pipeline-*",
            "arn:aws:s3:::agr-pavi-pipeline-*/*"
        ],
        "Condition": {
            "Bool": {
                "aws:SecureTransport": "false"
            }
        }
    }]
}
```

### DynamoDB Security

- Encryption at rest enabled
- Point-in-time recovery enabled
- IAM-based access control
- TTL for automatic data expiration

### VPC Configuration

Production deployments use:
- Private subnets for compute resources
- NAT Gateway for outbound internet
- VPC endpoints for AWS services
- Security groups limiting traffic

## Network Security

### HTTPS

All production traffic uses HTTPS:
- TLS 1.2 minimum
- AWS Certificate Manager for certs
- HSTS headers recommended

### CORS

CORS is configured for the WebUI domain:

```python
# FastAPI CORS middleware
origins = [
    "https://pavi.alliancegenome.org",
    "http://localhost:3000",  # Development only
]
```

### Security Headers

Recommended headers for WebUI:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

## Local Deployment Security

### File Permissions

```bash
# Set restrictive permissions
chmod 755 /var/lib/pavi
chmod 750 /var/lib/pavi/jobs
chmod 750 /var/lib/pavi/results
chmod 750 /var/lib/pavi/work
chown -R pavi:pavi /var/lib/pavi
```

### SQLite Security

- Database file should be readable only by API user
- No network access to SQLite
- Regular backups recommended

### Service User

Run PAVI as a dedicated non-root user:

```bash
# Create service user
sudo useradd -r -s /bin/false pavi

# Run API as service user
sudo -u pavi /path/to/venv/bin/uvicorn main:app
```

## Secrets Management

### Environment Variables

Secrets should be provided via environment variables, not files:

```bash
# Bad: hardcoded in code
API_KEY = "secret123"

# Good: from environment
API_KEY = os.environ.get("API_KEY")
```

### AWS Secrets

For AWS deployments, use:
- AWS Secrets Manager for sensitive values
- Parameter Store for configuration
- IAM roles instead of access keys

### Never Commit

These should never be committed:
- `.env` files with secrets
- AWS credentials
- Private keys
- Database passwords

`.gitignore` should include:
```
.env
.env.local
*.pem
credentials.json
```

## Logging Security

### Log Sanitization

Avoid logging sensitive data:

```python
# Bad
logger.info(f"Processing request with credentials: {credentials}")

# Good
logger.info(f"Processing request for job: {job_id}")
```

### Log Retention

- CloudWatch logs: 30-day retention
- Local logs: rotate and archive
- No PII in logs

## Vulnerability Management

### Dependency Updates

- Regular dependency updates via Dependabot
- Lock files committed for reproducibility
- Security patches prioritized

### Code Analysis

- Type checking (mypy, TypeScript)
- Linting (flake8, ESLint)
- No known SAST tools currently

### Container Security

- Use official base images
- Multi-stage builds for minimal images
- Non-root container users
- Regular image updates

## Incident Response

### Security Issues

Report security issues to:
- GitHub Security Advisories (private)
- Contact maintainers directly

### Audit Trail

For compliance, maintain logs of:
- API requests (with job IDs)
- Infrastructure changes (CloudTrail)
- Deployment events

## Security Checklist

### Pre-Deployment

- [ ] All secrets in environment variables
- [ ] HTTPS configured
- [ ] CORS properly configured
- [ ] IAM roles use least privilege
- [ ] S3 buckets block public access
- [ ] Security groups configured
- [ ] Non-root service user

### Ongoing

- [ ] Dependencies updated regularly
- [ ] Logs monitored for anomalies
- [ ] Backups tested
- [ ] Access reviews conducted

## Related Documentation

- [Configuration Reference](configuration-reference.md) - Environment variables
- [Local EC2 Deployment](local-ec2-deployment.md) - Secure local setup
- [Troubleshooting](troubleshooting.md) - Security-related issues
