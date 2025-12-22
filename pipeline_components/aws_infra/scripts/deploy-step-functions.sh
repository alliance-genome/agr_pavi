#!/bin/bash
#
# deploy-step-functions.sh - Deploy PAVI Step Functions pipeline to specified environment
#
# Usage:
#   ./deploy-step-functions.sh <environment> [options]
#
# Environments: dev, staging, prod
#
# Options:
#   --dry-run    Show what would be deployed without making changes
#   --force      Skip confirmation prompts
#   --diff       Show CDK diff before deploying
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 <environment> [options]"
    echo ""
    echo "Environments:"
    echo "  dev      Development environment"
    echo "  staging  Staging/pre-production environment"
    echo "  prod     Production environment"
    echo ""
    echo "Options:"
    echo "  --dry-run    Show what would be deployed without making changes"
    echo "  --force      Skip confirmation prompts"
    echo "  --diff       Show CDK diff before deploying"
    echo ""
    exit 1
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
ENVIRONMENT=""
DRY_RUN=false
FORCE=false
SHOW_DIFF=false

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|staging|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --diff)
            SHOW_DIFF=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment is required"
    usage
fi

# Stack name based on environment
STACK_NAME="PaviStepFunctionsStack-${ENVIRONMENT}"

log_info "Deploying Step Functions pipeline to ${ENVIRONMENT} environment"
log_info "Stack: ${STACK_NAME}"

# Change to infrastructure directory
cd "$INFRA_DIR"

# Install dependencies if needed
if [ ! -d ".venv" ]; then
    log_info "Creating virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

if [ ! -f ".venv/installed" ]; then
    log_info "Installing dependencies..."
    pip install -q -r requirements.txt
    touch .venv/installed
fi

# Synthesize the CDK app
log_info "Synthesizing CDK app..."
npx cdk synth "$STACK_NAME" > /dev/null

# Show diff if requested
if [ "$SHOW_DIFF" = true ]; then
    log_info "Showing CDK diff..."
    npx cdk diff "$STACK_NAME" || true
fi

# Dry run mode
if [ "$DRY_RUN" = true ]; then
    log_info "Dry run mode - showing what would be deployed"
    npx cdk diff "$STACK_NAME"
    exit 0
fi

# Confirmation for staging/prod
if [ "$FORCE" = false ] && [ "$ENVIRONMENT" != "dev" ]; then
    echo ""
    log_warn "You are about to deploy to ${ENVIRONMENT} environment!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

# Deploy
log_info "Deploying ${STACK_NAME}..."
npx cdk deploy "$STACK_NAME" --require-approval never

log_info "Deployment complete!"

# Get outputs
log_info "Stack outputs:"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[*].{Key:OutputKey,Value:OutputValue}" \
    --output table

echo ""
log_info "Deployment to ${ENVIRONMENT} completed successfully!"
