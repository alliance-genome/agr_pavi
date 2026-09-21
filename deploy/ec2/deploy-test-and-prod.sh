#!/bin/bash
# Deploy PRODUCTION (root) and the TEST /pavi base-path instance side by side
# on one EC2 host.
#
#   Production : ECR image  -> WebUI :3000 , API :8080   -> nginx  /      , /api/
#   Test       : built here -> WebUI :3100 (base path /pavi)  -> nginx  /pavi/
#
# Production is untouched by this (same images/ports as deploy.sh). The test
# instance is an extra container built from source with the base path baked in.
#
# Usage:
#   ./deploy-test-and-prod.sh
#
# Env overrides:
#   PAVI_IMAGE_TAG   ECR tag for the production images       (default: dev)
#   PAVI_ENVIRONMENT PAVI_ENVIRONMENT for the API            (default: dev)
#   PAVI_SRC_DIR     repo checkout used to build /pavi image (default: $HOME/agr_pavi)
#   SKIP_NGINX=1     don't touch nginx (just run containers)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

export PAVI_IMAGE_TAG="${PAVI_IMAGE_TAG:-dev}"
export PAVI_ENVIRONMENT="${PAVI_ENVIRONMENT:-dev}"
export PAVI_SRC_DIR="${PAVI_SRC_DIR:-$HOME/agr_pavi}"
ECR="100225593120.dkr.ecr.us-east-1.amazonaws.com"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.pavi.yml)

echo "=== PAVI deploy: production (root) + test (/pavi) ==="
echo "  production image tag : $PAVI_IMAGE_TAG"
echo "  /pavi build source   : $PAVI_SRC_DIR/webui"
echo

# The /pavi image is built from source; production still comes from ECR.
if [ ! -d "$PAVI_SRC_DIR/webui" ]; then
    echo "ERROR: WebUI source not found at $PAVI_SRC_DIR/webui" >&2
    echo "  The /pavi image is built from source. Clone the repo, e.g.:" >&2
    echo "    git clone https://github.com/alliance-genome/agr_pavi.git \"$PAVI_SRC_DIR\"" >&2
    echo "  or set PAVI_SRC_DIR to your checkout." >&2
    exit 1
fi

echo "--> Logging into ECR (for production images)..."
aws ecr get-login-password --region us-east-1 \
    | docker login -u AWS --password-stdin "$ECR"

echo "--> Pulling production images..."
"${COMPOSE[@]}" pull api webui

echo "--> Building the /pavi test image (NEXT_PUBLIC_BASE_PATH=/pavi)..."
"${COMPOSE[@]}" build webui-pavi

echo "--> Starting api + production webui + /pavi test webui..."
"${COMPOSE[@]}" up -d

if [ "${SKIP_NGINX:-0}" != "1" ] && command -v nginx >/dev/null 2>&1; then
    echo "--> Installing nginx config (/, /pavi/, /api/)..."
    sudo cp nginx.conf /etc/nginx/conf.d/pavi.conf
    sudo nginx -t && sudo systemctl reload nginx
else
    echo "--> Skipping nginx (SKIP_NGINX=1 or nginx not installed)."
fi

echo "--> Waiting for services..."
sleep 12

echo
echo "=== Health ==="
ok() { curl -sf "$1" >/dev/null 2>&1 && echo "OK" || echo "FAILED"; }
printf "  API (8080)          : %s\n" "$(ok http://localhost:8080/api/health)"
printf "  Production WebUI (/) : %s\n" "$(ok http://localhost:3000/health)"
printf "  Test WebUI (/pavi)   : %s\n" "$(ok http://localhost:3100/pavi/health)"

echo
"${COMPOSE[@]}" ps
echo
echo "Done $(date)."
echo "  Production : http://<host>/        (and /api/)"
echo "  Test       : http://<host>/pavi/"
