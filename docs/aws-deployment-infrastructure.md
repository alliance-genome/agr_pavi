# AWS Deployment Infrastructure

This document describes how `pavi.alliancegenome.org` is deployed on AWS. The underlying AWS infrastructure (VPC, Route53 hosted zones, networking) is managed by the Alliance of Genome Resources organization, not the PAVI team.

> **Note**: The current deployment at `pavi.alliancegenome.org` runs the **previous PAVI version**. The overhaul work on `feature/pavi-overhaul` branch has not yet been deployed.

## Access Requirements

**VPN Required**: `pavi.alliancegenome.org` is only accessible via VPN. The domain is registered exclusively in a private Route53 hosted zone.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     AWS Account: 100225593120                    │
│                         VPC: vpc-55522232                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │              Private Route53 Hosted Zone                  │  │
│   │                   (Z007692222A6W93AZVSPD)                 │  │
│   │                                                           │  │
│   │   pavi.alliancegenome.org ─────────────────────────────┐ │  │
│   └────────────────────────────────────────────────────────│─┘  │
│                                                             │    │
│                                                             ▼    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  Internal ALB (WebUI)                    │   │
│   │              awseb--AWSEB-Am6LoeNFK3Q0                   │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Elastic Beanstalk (WebUI)                   │   │
│   │                   PAVI-webui-main                        │   │
│   │                  Next.js Application                     │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   Internal ALB (API)                     │   │
│   │              awseb--AWSEB-UNVjyNE0pB2j                   │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │               Elastic Beanstalk (API)                    │   │
│   │                    PAVI-api-main                         │   │
│   │                 FastAPI Application                      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Route53 DNS

| Zone Type | Zone ID | Description |
|-----------|---------|-------------|
| Private | Z007692222A6W93AZVSPD | Internal DNS for VPN access |
| Public | Z3IZ3D6V94JEC2 | Does NOT contain pavi.alliancegenome.org |

The `pavi.alliancegenome.org` domain is **only** registered in the private hosted zone, making it inaccessible from the public internet.

### Elastic Beanstalk Environments

| Environment | Application | Purpose |
|-------------|-------------|---------|
| PAVI-webui-main | Next.js frontend | User interface |
| PAVI-api-main | FastAPI backend | Job orchestration API |

### Load Balancers

Both Application Load Balancers (ALBs) are configured as **internal** (not internet-facing):

- **WebUI ALB**: `awseb--AWSEB-Am6LoeNFK3Q0`
- **API ALB**: `awseb--AWSEB-UNVjyNE0pB2j`

## Infrastructure Ownership

The following components are managed by the **Alliance organization** (not the PAVI team):

- AWS Account and IAM policies
- VPC (vpc-55522232) and networking configuration
- Route53 hosted zones (both public and private)
- VPN access and security groups
- Elastic Beanstalk platform configuration

The PAVI team manages:

- Application code (webui, api, pipeline components)
- CDK infrastructure definitions in `*/aws_infra/` directories
- Container images and deployment workflows
- Application-level configuration

## Deployment

Deployments to Elastic Beanstalk are handled via:

1. GitHub Actions CI/CD on merge to `main`
2. AWS CDK for infrastructure updates
3. Container images pushed to ECR

See the main [CLAUDE.md](../CLAUDE.md) for deployment commands.
