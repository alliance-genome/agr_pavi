# Local Step Functions Testing

Test the PAVI Step Functions pipeline locally using Docker without deploying to AWS.

## Prerequisites

- Docker Desktop running
- AWS CLI installed (for local endpoint commands)

## Quick Start

```bash
cd pipeline_components/aws_infra/local-testing

# Run automated test
./run-local-test.sh
```

## Manual Testing

### 1. Start Services

```bash
docker compose up -d
```

This starts:
- **Step Functions Local** on port 8083
- **Mock Batch Server** on port 8084

### 2. Create State Machine

```bash
aws stepfunctions create-state-machine \
    --endpoint-url http://localhost:8083 \
    --name "pavi-pipeline-sfn-poc" \
    --definition file://state-machine.asl.json \
    --role-arn "arn:aws:iam::123456789012:role/mock-role" \
    --type EXPRESS \
    --region us-east-1 \
    --no-sign-request
```

### 3. Run Execution

```bash
aws stepfunctions start-sync-execution \
    --endpoint-url http://localhost:8083 \
    --state-machine-arn "arn:aws:states:us-east-1:123456789012:stateMachine:pavi-pipeline-sfn-poc" \
    --input file://test-input.json \
    --region us-east-1 \
    --no-sign-request
```

### 4. View Logs

```bash
# Step Functions logs
docker compose logs stepfunctions-local -f

# Mock Batch server logs
docker compose logs mock-batch -f
```

### 5. Stop Services

```bash
docker compose down
```

## Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Container orchestration |
| `state-machine.asl.json` | Step Functions definition (ASL) |
| `mock-config.json` | Step Functions Local configuration |
| `mock-batch-server.py` | Simulates AWS Batch API |
| `test-input.json` | Sample pipeline input |
| `run-local-test.sh` | Automated test script |

## What This Tests

- State machine flow and transitions
- Input/output transformations
- Map state parallelization
- Error handling paths

## Limitations

- **No actual Batch jobs**: Mock server returns instant success
- **No S3 operations**: File I/O is simulated
- **No real IAM**: All permissions are mocked

For full integration testing, deploy to AWS with `cdk deploy`.

## Troubleshooting

### Port already in use
```bash
docker compose down
lsof -i :8083  # Check what's using the port
```

### State machine definition errors
```bash
# Validate ASL JSON
cat state-machine.asl.json | python3 -m json.tool
```

### Connection refused
```bash
# Check containers are running
docker compose ps

# Check container logs
docker compose logs
```
