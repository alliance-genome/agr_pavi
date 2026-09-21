#!/bin/bash
# Run local Step Functions test with Docker

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== PAVI Step Functions Local Testing ==="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker first."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "=== Cleaning up ==="
    docker compose down 2>/dev/null || true
}
trap cleanup EXIT

# Start services
echo "=== Starting Step Functions Local + Mock Batch ==="
docker compose up -d

# Wait for services to be ready
echo ""
echo "=== Waiting for services to start ==="
sleep 5

# Check if Step Functions Local is running
echo ""
echo "=== Checking Step Functions Local health ==="
curl -s http://localhost:8083/ > /dev/null && echo "Step Functions Local: OK" || echo "Step Functions Local: FAILED"

# Create state machine
echo ""
echo "=== Creating state machine ==="
STATE_MACHINE_DEF=$(cat state-machine.asl.json)

# Use AWS CLI with local endpoint
aws stepfunctions create-state-machine \
    --endpoint-url http://localhost:8083 \
    --name "pavi-pipeline-sfn-poc" \
    --definition "$STATE_MACHINE_DEF" \
    --role-arn "arn:aws:iam::123456789012:role/mock-role" \
    --type EXPRESS \
    --region us-east-1 \
    --no-sign-request \
    2>/dev/null || echo "(State machine may already exist)"

# List state machines
echo ""
echo "=== Available state machines ==="
aws stepfunctions list-state-machines \
    --endpoint-url http://localhost:8083 \
    --region us-east-1 \
    --no-sign-request

# Run test execution
echo ""
echo "=== Running test execution ==="
TEST_INPUT=$(cat test-input.json)

RESULT=$(aws stepfunctions start-sync-execution \
    --endpoint-url http://localhost:8083 \
    --state-machine-arn "arn:aws:states:us-east-1:123456789012:stateMachine:pavi-pipeline-sfn-poc" \
    --input "$TEST_INPUT" \
    --region us-east-1 \
    --no-sign-request \
    2>&1) || true

echo ""
echo "=== Execution Result ==="
echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"

# Show logs
echo ""
echo "=== Container Logs ==="
echo "--- Step Functions Local ---"
docker compose logs stepfunctions-local --tail=20
echo ""
echo "--- Mock Batch Server ---"
docker compose logs mock-batch --tail=20

echo ""
echo "=== Test complete ==="
echo ""
echo "To keep services running for manual testing:"
echo "  docker compose up"
echo ""
echo "To run another execution manually:"
echo "  aws stepfunctions start-sync-execution \\"
echo "    --endpoint-url http://localhost:8083 \\"
echo "    --state-machine-arn 'arn:aws:states:us-east-1:123456789012:stateMachine:pavi-pipeline-sfn-poc' \\"
echo "    --input file://test-input.json \\"
echo "    --region us-east-1 \\"
echo "    --no-sign-request"
