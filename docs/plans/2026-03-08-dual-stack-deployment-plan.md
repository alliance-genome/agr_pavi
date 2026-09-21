# Dual-Stack Deployment & Branching Strategy

**Date**: 2026-03-08
**Jira**: KANBAN-832
**Approach**: Trunk-based development + two deployment stacks on same EC2

---

## Architecture

```
Internet → Caddy (HTTPS/Let's Encrypt)
              ├── pavi.alliancegenome.org      → localhost:3000 (WebUI prod)
              │                                → localhost:8000 (API prod)
              └── dev-pavi.alliancegenome.org   → localhost:3001 (WebUI dev)
                                               → localhost:8001 (API dev)
```

Each stack has its own:
- Port pair (3000/8000 for prod, 3001/8001 for dev)
- Directory (`/home/ec2-user/agr_pavi` for prod, `/home/ec2-user/agr_pavi_dev` for dev)
- SQLite database (separate job histories)
- Pipeline output directory

---

## Branching Strategy

```
feature/* ──▶ PR ──▶ main ──▶ auto-deploy to dev-pavi (continuous)
                        │
                        └──▶ manual promote to pavi (production)
```

- **`main`** deploys automatically to `dev-pavi.alliancegenome.org` — testing/staging
- **Production** (`pavi.alliancegenome.org`) promoted manually via script/make target
- No `develop` branch — PRs gate quality via lint, type-check, tests, CDK diff
- Production promotions use tagged releases or specific commits

### Why Trunk-Based Over Git Flow

| Factor | Trunk-Based | Git Flow |
|--------|-------------|----------|
| Complexity | Low — one permanent branch | High — main + develop + release branches |
| Merge conflicts | Rare — short-lived feature branches | Common — long-lived develop branch |
| Team size fit | Small teams (< 10) | Large teams with release managers |
| Safety buffer | dev→prod promotion step | develop→main merge |
| CI/CD | Simple — one pipeline | Complex — separate pipelines per branch |

---

## Implementation Plan

### Phase 1: Infrastructure Setup

#### 1.1 Directory Structure

```bash
/home/ec2-user/
├── agr_pavi/              # Production (checked out at tagged release)
│   ├── api/
│   ├── webui/
│   ├── pipeline_components/
│   └── data/
│       ├── pavi.db        # Production SQLite
│       └── pipeline_output/
├── agr_pavi_dev/          # Dev (tracks main branch HEAD)
│   ├── api/
│   ├── webui/
│   ├── pipeline_components/
│   └── data/
│       ├── pavi.db        # Dev SQLite
│       └── pipeline_output/
└── deploy/
    ├── deploy-dev.sh
    ├── deploy-prod.sh
    └── systemd/
        ├── pavi-api-prod.service
        ├── pavi-webui-prod.service
        ├── pavi-api-dev.service
        └── pavi-webui-dev.service
```

#### 1.2 Caddyfile

```
pavi.alliancegenome.org {
    handle /api/* {
        reverse_proxy localhost:8000
    }
    handle {
        reverse_proxy localhost:3000
    }
}

dev-pavi.alliancegenome.org {
    handle /api/* {
        reverse_proxy localhost:8001
    }
    handle {
        reverse_proxy localhost:3001
    }
}
```

#### 1.3 Systemd Services

**Production API** (`/etc/systemd/system/pavi-api-prod.service`):
```ini
[Unit]
Description=PAVI API (Production)
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/agr_pavi/api/src
Environment=USE_LOCAL_PIPELINE=true
Environment=API_EXECUTION_ENV=production
Environment=PIPELINE_COMPONENTS_DIR=/home/ec2-user/agr_pavi/pipeline_components
ExecStart=/home/ec2-user/agr_pavi/api/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Production WebUI** (`/etc/systemd/system/pavi-webui-prod.service`):
```ini
[Unit]
Description=PAVI WebUI (Production)
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/agr_pavi/webui
Environment=PAVI_API_BASE_URL=http://localhost:8000
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Dev API** (`/etc/systemd/system/pavi-api-dev.service`):
```ini
[Unit]
Description=PAVI API (Dev)
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/agr_pavi_dev/api/src
Environment=USE_LOCAL_PIPELINE=true
Environment=API_EXECUTION_ENV=development
Environment=PIPELINE_COMPONENTS_DIR=/home/ec2-user/agr_pavi_dev/pipeline_components
ExecStart=/home/ec2-user/agr_pavi_dev/api/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Dev WebUI** (`/etc/systemd/system/pavi-webui-dev.service`):
```ini
[Unit]
Description=PAVI WebUI (Dev)
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/agr_pavi_dev/webui
Environment=PAVI_API_BASE_URL=http://localhost:8001
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- -p 3001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### 1.4 Environment Configuration

Each stack needs its own environment variables. Key differences:

| Variable | Production | Dev |
|----------|-----------|-----|
| `API_EXECUTION_ENV` | `production` | `development` |
| API port | 8000 | 8001 |
| WebUI port | 3000 | 3001 |
| `PIPELINE_COMPONENTS_DIR` | `/home/ec2-user/agr_pavi/pipeline_components` | `/home/ec2-user/agr_pavi_dev/pipeline_components` |
| SQLite path | `agr_pavi/data/pavi.db` | `agr_pavi_dev/data/pavi.db` |

---

### Phase 2: Deployment Scripts

#### 2.1 Dev Deploy Script (`deploy/deploy-dev.sh`)

```bash
#!/bin/bash
set -euo pipefail

DEPLOY_DIR="/home/ec2-user/agr_pavi_dev"
cd "$DEPLOY_DIR"

echo "Pulling latest main..."
git fetch origin
git reset --hard origin/main

echo "Installing API dependencies..."
cd api
make install-deps
cd ..

echo "Building WebUI..."
cd webui
npm ci --strict-peer-deps
PAVI_API_BASE_URL=http://localhost:8001 npm run build
cd ..

echo "Restarting services..."
sudo systemctl restart pavi-api-dev
sudo systemctl restart pavi-webui-dev

echo "Dev deployment complete."
```

#### 2.2 Production Deploy Script (`deploy/deploy-prod.sh`)

```bash
#!/bin/bash
set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Usage: deploy-prod.sh <tag-or-commit>"
    echo "Example: deploy-prod.sh v1.2.3"
    exit 1
fi

TARGET="$1"
DEPLOY_DIR="/home/ec2-user/agr_pavi"
cd "$DEPLOY_DIR"

echo "Deploying $TARGET to production..."
git fetch origin
git checkout "$TARGET"

echo "Installing API dependencies..."
cd api
make install-deps
cd ..

echo "Building WebUI..."
cd webui
npm ci --strict-peer-deps
PAVI_API_BASE_URL=http://localhost:8000 npm run build
cd ..

echo "Restarting services..."
sudo systemctl restart pavi-api-prod
sudo systemctl restart pavi-webui-prod

echo "Production deployment of $TARGET complete."
```

#### 2.3 GitHub Actions Auto-Deploy (Optional)

Add to `.github/workflows/main-build-and-deploy.yml`:

```yaml
deploy-dev-ec2:
  name: Deploy to dev-pavi
  needs: [all-validation-jobs]
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-24.04
  steps:
    - name: Deploy via SSH
      uses: appleboy/ssh-action@v1
      with:
        host: dev-pavi.alliancegenome.org
        username: ec2-user
        key: ${{ secrets.EC2_SSH_KEY }}
        script: /home/ec2-user/deploy/deploy-dev.sh
```

---

### Phase 3: DNS & Verification

1. Request DNS A/CNAME record for `pavi.alliancegenome.org` → EC2 public IP
2. Verify Caddy auto-provisions TLS for both domains
3. Test both stacks independently:
   - Submit job on dev-pavi, verify it runs
   - Submit job on pavi, verify it runs with separate results
4. Verify health endpoints respond on both domains

---

### Phase 4: Monitoring

1. Add `/api/health` checks for both environments to existing monitoring
2. Separate log files per environment via systemd journal tags
3. Optional: uptime monitoring via external service (e.g., UptimeRobot)

---

## Operational Procedures

### Regular Development

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Develop, commit, push
git push -u origin feature/my-feature

# 3. Create PR → automated validation runs
# 4. Merge to main → auto-deploys to dev-pavi
# 5. Verify on dev-pavi.alliancegenome.org
```

### Production Release

```bash
# 1. Tag a release from main
git tag v1.2.3
git push origin v1.2.3

# 2. Deploy to production
ssh ec2-user@pavi.alliancegenome.org
./deploy/deploy-prod.sh v1.2.3

# 3. Verify on pavi.alliancegenome.org
```

### Rollback

```bash
# Deploy the previous known-good tag
./deploy/deploy-prod.sh v1.2.2
```

---

## Verification Checklist

- [ ] Production directory created and git clone set up
- [ ] Dev directory tracks main branch
- [ ] Caddyfile routes both domains correctly
- [ ] All 4 systemd services start and stay running
- [ ] Dev auto-deploy works on merge to main
- [ ] Production manual deploy works with tagged release
- [ ] Both stacks have independent SQLite databases
- [ ] Both stacks have independent pipeline output
- [ ] Health endpoints respond on both domains
- [ ] TLS certificates provisioned for both domains
