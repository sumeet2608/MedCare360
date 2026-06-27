# CI/CD Pipeline Guide

## Jenkins Pipeline Overview

The `devops/jenkins/Jenkinsfile` defines a 9-stage pipeline:

```
Checkout → Install → Test → Build Frontend → Docker Build → Security Scan → Push ECR → Deploy EKS → Smoke Test
```

Only `Deploy to EKS` and `Smoke Test` stages run on the `main` branch.

## Jenkins Server Setup

### 1. Provision with Ansible
```bash
cd devops/ansible
# Edit inventory.ini with your Jenkins server IP
ansible-playbook -i inventory.ini install-docker.yml
ansible-playbook -i inventory.ini install-jenkins.yml
ansible-playbook -i inventory.ini install-aws-cli.yml
ansible-playbook -i inventory.ini install-kubectl.yml
ansible-playbook -i inventory.ini install-terraform.yml
```

### 2. Configure Jenkins
Access Jenkins at `http://your-server:8080`

**Required Plugins:**
- Pipeline
- Git
- NodeJS Plugin
- Docker Pipeline
- AWS Credentials Plugin
- Blue Ocean (optional, better UI)

**Required Credentials** (Manage Jenkins → Credentials):
| ID | Type | Description |
|----|------|-------------|
| `aws-credentials` | AWS Access Key | For ECR push + EKS deploy |
| `groq-api-key` | Secret text | GROQ_API_KEY |

**NodeJS Installation** (Manage Jenkins → Tools):
- Name: `nodejs18`
- Version: 18.x

### 3. Create Pipeline Job
1. New Item → Pipeline
2. Pipeline Definition: "Pipeline script from SCM"
3. SCM: Git, repo URL, branch: `main`
4. Script Path: `devops/jenkins/Jenkinsfile`
5. Build Triggers: "GitHub hook trigger for GITScm polling" (webhook)

### 4. Configure GitHub Webhook
In your GitHub repo → Settings → Webhooks:
- Payload URL: `http://your-jenkins:8080/github-webhook/`
- Content type: `application/json`
- Events: Push, Pull request

## Pipeline Stages Detail

### Stage: Test
Runs Jest tests in `backend/` and Angular lint in `frontend/`. Test results published as JUnit XML.

### Stage: Security Scan
Uses Trivy to scan the built Docker image for HIGH/CRITICAL CVEs. Currently set to `--exit-code 0` (warn, don't fail) — change to `1` to enforce.

### Stage: Push to ECR
Authenticates to ECR using instance IAM role (no stored credentials needed if running on EC2 with the Jenkins IAM role from Terraform).

### Stage: Deploy to EKS
Uses `kubectl set image` for a rolling update. Waits for rollout with `--timeout=300s`.

### Stage: Smoke Test
Hits `/health` endpoint on the deployed service. Fails the build if the app isn't responding.

## Branch Strategy

| Branch | Runs | Deploys |
|--------|------|---------|
| `feature/*` | Install, Test, Build, Docker Build | No |
| `develop` | All stages | Staging (if configured) |
| `main` | All stages | Production EKS |

## Rolling Back via Jenkins

1. Go to the failing build
2. Click the previous successful build
3. Click "Replay" to re-run the pipeline with that commit

Or directly via kubectl:
```bash
kubectl rollout undo deployment/medcare-backend -n medcare360
```
