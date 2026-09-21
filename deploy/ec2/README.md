# PAVI EC2 Deployment

Simple EC2-based deployment for PAVI (WebUI + API).

## Architecture

```
EC2 t3.medium
├── Docker
│   ├── WebUI container (port 3000)
│   └── API container (port 8080)
├── Nginx (port 80)
│   ├── / → WebUI
│   └── /api/ → API
└── Pipeline jobs run on AWS Batch (existing)
```

## Prerequisites

1. EC2 instance in AGR VPC (vpc-55522232)
2. Security group allowing: 22 (SSH), 80 (HTTP), 443 (HTTPS)
3. IAM role with ECR pull, S3, DynamoDB, Batch permissions
4. SSH key pair

## Quick Start

### 1. Launch EC2 Instance

Via AWS Console:
- AMI: Amazon Linux 2023
- Type: t3.medium
- VPC: vpc-55522232
- Public subnet with auto-assign public IP
- Storage: 50 GiB gp3
- Tag: Name=pavi-dev

### 2. Upload Files to EC2

```bash
scp -i your-key.pem *.sh *.yml *.conf ec2-user@<ec2-ip>:~/
```

### 3. Run Setup

```bash
ssh -i your-key.pem ec2-user@<ec2-ip>
chmod +x setup.sh deploy.sh
./setup.sh
```

### 4. Deploy

```bash
# After logging out/in for docker group:
cd /opt/pavi
./deploy.sh
```

### 5. Update DNS

Point `dev-pavi.alliancegenome.org` to the EC2 public IP or DNS.

## Deployment Commands

```bash
# Deploy with default (dev) tag
./deploy.sh

# Deploy specific version
PAVI_IMAGE_TAG=v1.0.0 ./deploy.sh

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down
```

## Health Checks

```bash
# API
curl http://localhost:8080/api/health

# WebUI
curl http://localhost:3000/health

# Via Nginx
curl http://localhost/api/health
curl http://localhost/health
```

## Troubleshooting

### Container won't start
```bash
docker-compose logs api
docker-compose logs webui
```

### ECR login issues
```bash
aws sts get-caller-identity  # Check IAM role
aws ecr get-login-password --region us-east-1  # Test ECR access
```

### Nginx issues
```bash
sudo nginx -t
sudo systemctl status nginx
sudo journalctl -u nginx
```

## Cost

- EC2 t3.medium: ~$30/month
- EBS 50 GiB gp3: ~$4/month
- AWS Batch: pay-per-use (scales to zero)
- **Total: ~$35/month**


## Production + Test (/pavi) side by side

To run the current production WebUI at the root **and** a base-path build at
`/pavi` on the same host (e.g. to preview `alliancegenome.org/pavi` before
asking DevOps to add the ALB rule), use the `/pavi` overlay + script.

```
EC2
├── api            (ECR)            :8080
├── webui          (ECR, root)      :3000   ← nginx  /
└── webui-pavi     (built here)     :3100   ← nginx  /pavi/   (NEXT_PUBLIC_BASE_PATH=/pavi)
```

Production is untouched — same images and ports as `deploy.sh`. The test
instance is an extra container built **from source** with the base path baked
in (Next.js bakes `NEXT_PUBLIC_*` at build time), so the repo must be checked
out on the host.

```bash
# one-time: get the source for the /pavi build (default location $HOME/agr_pavi)
git clone https://github.com/alliance-genome/agr_pavi.git ~/agr_pavi

# deploy both
cd /opt/pavi   # (where the deploy files live)
PAVI_SRC_DIR=~/agr_pavi ./deploy-test-and-prod.sh
```

Result: production at `http://<host>/`, test at `http://<host>/pavi/`.

**Env overrides:** `PAVI_IMAGE_TAG` (prod ECR tag, default `dev`),
`PAVI_SRC_DIR` (repo checkout for the /pavi build), `SKIP_NGINX=1` (run
containers only). See `docs/base-path-deployment.md` for how the base path
works and the eventual ALB routing for production `alliancegenome.org/pavi`.

**Alternative (no source on host):** build the `/pavi` image in CI with
`--build-arg NEXT_PUBLIC_BASE_PATH=/pavi`, push it to ECR under a distinct
tag, and point `webui-pavi.image` at it instead of `build:`.
