#!/bin/bash
# PAVI Deployment Script
# Run this to deploy or update PAVI containers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Default values
export PAVI_IMAGE_TAG="${PAVI_IMAGE_TAG:-dev}"
export PAVI_ENVIRONMENT="${PAVI_ENVIRONMENT:-dev}"

echo "=== PAVI Deployment ==="
echo "Image tag: $PAVI_IMAGE_TAG"
echo "Environment: $PAVI_ENVIRONMENT"
echo ""

# Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region us-east-1 | docker login -u AWS --password-stdin 100225593120.dkr.ecr.us-east-1.amazonaws.com

# Pull latest images
echo "Pulling latest images..."
docker-compose pull

# Stop existing containers (if any)
echo "Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Start containers
echo "Starting containers..."
docker-compose up -d

# Wait for health checks
echo "Waiting for services to be healthy..."
sleep 10

# Check health
echo ""
echo "=== Health Check ==="
echo -n "API: "
curl -sf http://localhost:8080/api/health && echo " OK" || echo " FAILED"
echo -n "WebUI: "
curl -sf http://localhost:3000/health > /dev/null && echo " OK" || echo " FAILED"

echo ""
echo "=== Container Status ==="
docker-compose ps

echo ""
echo "Deployed at $(date)"
