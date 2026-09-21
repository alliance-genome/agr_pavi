# Local EC2 Deployment Plan

**Goal:** Replace Elastic Beanstalk with fully local EC2 deployment for dev-pavi.alliancegenome.org

## Current State

| Component | Status |
|-----------|--------|
| EC2 Instance | Running (ip-172-31-62-216, private IP only) |
| Nginx | Configured on port 80, proxying to API:8000 and WebUI:3000 |
| FastAPI | Running on port 8000 |
| Next.js | Running on port 3000 |
| Route 53 | Points to EB load balancer (needs update) |
| SSL | Not configured (HTTP only) |
| EB Environment | `PAVI-webui-dev` (to be terminated) |

## Migration Steps

### Phase 1: Infrastructure Setup

#### 1.1 Allocate Elastic IP
```bash
# Allocate new Elastic IP
aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text

# Get this instance ID
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)

# Associate Elastic IP with this instance
aws ec2 associate-address --instance-id $INSTANCE_ID --allocation-id <allocation-id>
```

#### 1.2 Update Security Group
Ensure security group allows:
- Port 80 (HTTP) from anywhere
- Port 443 (HTTPS) from anywhere
- Port 22 (SSH) from trusted IPs

#### 1.3 Update Route 53
```bash
# Update dev-pavi.alliancegenome.org to point to Elastic IP
aws route53 change-resource-record-sets \
  --hosted-zone-id Z007692222A6W93AZVSPD \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "dev-pavi.alliancegenome.org",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "<ELASTIC-IP>"}]
      }
    }]
  }'
```

### Phase 2: SSL/HTTPS Setup

#### 2.1 Install Certbot (Let's Encrypt)
```bash
sudo dnf install -y certbot python3-certbot-nginx
```

#### 2.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d dev-pavi.alliancegenome.org --non-interactive --agree-tos -m admin@alliancegenome.org
```

#### 2.3 Verify Nginx HTTPS Config
Certbot will auto-configure nginx. Verify `/etc/nginx/conf.d/pavi.conf` has:
- Listen 443 ssl
- SSL certificate paths
- HTTP to HTTPS redirect

### Phase 3: Local Pipeline Setup

#### 3.1 Verify Prerequisites
```bash
# Check Python 3.12
python3.12 --version

# Check Clustal Omega
which clustalo || echo "Need to install clustalo"

# Check directories
ls -la /var/lib/pavi/
```

#### 3.2 Install Clustal Omega (if missing)
```bash
cd /tmp
wget http://www.clustal.org/omega/clustal-omega-1.2.4.tar.gz
tar xzf clustal-omega-1.2.4.tar.gz
cd clustal-omega-1.2.4
./configure --prefix=/usr/local
make -j$(nproc)
sudo make install
```

#### 3.3 Set Up API Virtual Environment
```bash
cd /home/ec2-user/agr_pavi/api
make install-deps
```

#### 3.4 Set Up seq_retrieval Virtual Environment
```bash
cd /home/ec2-user/agr_pavi/pipeline_components/seq_retrieval
make install-deps
```

### Phase 4: Systemd Services

#### 4.1 Create API Service
Create `/etc/systemd/system/pavi-api.service`:
```ini
[Unit]
Description=PAVI API Server
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/agr_pavi/api/src
Environment=USE_LOCAL_PIPELINE=true
Environment=PAVI_ENVIRONMENT=local
Environment=PAVI_LOCAL_JOBS_PATH=/var/lib/pavi/jobs
Environment=PAVI_LOCAL_RESULTS_PATH=/var/lib/pavi/results
Environment=PAVI_LOCAL_WORK_PATH=/var/lib/pavi/work
Environment=PAVI_LOCAL_MAX_WORKERS=4
ExecStart=/home/ec2-user/agr_pavi/api/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### 4.2 Create WebUI Service
Create `/etc/systemd/system/pavi-webui.service`:
```ini
[Unit]
Description=PAVI WebUI Server
After=network.target pavi-api.service

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/agr_pavi/webui
Environment=NODE_ENV=production
Environment=PAVI_API_BASE_URL=http://127.0.0.1:8000
ExecStart=/home/ec2-user/.nvm/versions/node/v24.0.0/bin/npm run start -- -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### 4.3 Enable Services
```bash
sudo systemctl daemon-reload
sudo systemctl enable pavi-api pavi-webui
sudo systemctl start pavi-api pavi-webui
```

### Phase 5: Terminate Elastic Beanstalk

#### 5.1 Verify Local Deployment Works
```bash
curl -s https://dev-pavi.alliancegenome.org/api/health
curl -s https://dev-pavi.alliancegenome.org/health
```

#### 5.2 Terminate EB Environment
```bash
aws elasticbeanstalk terminate-environment --environment-name PAVI-webui-dev
```

### Phase 6: Verification & Cleanup

#### 6.1 Test Full Pipeline
Submit a test job through the WebUI and verify:
- Job creation works
- Sequence retrieval executes
- Alignment completes
- Results are returned

#### 6.2 Set Up Log Rotation
```bash
# Create /etc/logrotate.d/pavi
cat << 'EOF' | sudo tee /etc/logrotate.d/pavi
/var/log/pavi/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
}
EOF
```

#### 6.3 Set Up Job Cleanup Cron
```bash
# Clean up jobs older than 30 days
echo "0 3 * * * ec2-user cd /home/ec2-user/agr_pavi/api && .venv/bin/python -c 'from src.local_job_store import get_local_job_store; get_local_job_store().cleanup_old_jobs(30)'" | sudo tee /etc/cron.d/pavi-cleanup
```

---

## Architecture After Migration

```
Internet
    │
    ▼
Route 53: dev-pavi.alliancegenome.org
    │
    ▼
Elastic IP: <to-be-assigned>
    │
    ▼
EC2 Instance (ip-172-31-62-216)
    │
    ├── nginx (ports 80/443)
    │   ├── /api/* → localhost:8000 (FastAPI)
    │   └── /* → localhost:3000 (Next.js)
    │
    ├── pavi-api.service (systemd)
    │   └── FastAPI + LocalPipelineRunner
    │       ├── SQLite: /var/lib/pavi/jobs/jobs.db
    │       ├── Work: /var/lib/pavi/work/{job_id}/
    │       └── Results: /var/lib/pavi/results/{job_id}/
    │
    └── pavi-webui.service (systemd)
        └── Next.js production server
```

## Rollback Plan

If issues occur:
1. Re-create Route 53 alias to EB load balancer
2. Restart EB environment if terminated
3. Keep EB environment running for 48 hours after migration as backup

## Estimated Downtime

- Route 53 propagation: 0-5 minutes (TTL 300s)
- Total switchover: ~10 minutes

## Cost Savings

| Resource | Before (EB) | After (Local) |
|----------|-------------|---------------|
| EC2 Instances | 2+ (WebUI + API) | 1 (shared) |
| Load Balancers | 2 ALBs | 0 |
| Estimated Monthly | ~$150-200 | ~$50-80 |
