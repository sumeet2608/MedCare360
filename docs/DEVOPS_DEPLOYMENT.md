# MedCare360 — Enterprise DevOps Deployment Guide

## Complete Pipeline Flow

```
Developer pushes code
        │
        ▼
  GitHub (sumeet2608/MedCare360)
        │  webhook triggers on push to main
        ▼
  Jenkins CI/CD (EC2 t3.medium, port 8080)
        │
        ├─► npm install + test (parallel)
        ├─► npm run build (Angular production)
        ├─► docker build (frontend + backend)
        ├─► Trivy security scan (HIGH/CRITICAL)
        ├─► docker push → AWS ECR (ap-south-1)
        │
        ▼
  AWS EKS (Kubernetes cluster)
        │
        ├─► kubectl set image (rolling update)
        ├─► kubectl rollout status (wait for healthy)
        └─► smoke test /health endpoint
        │
        ▼
  Monitoring Stack
        ├─► Prometheus (metrics scraping)
        ├─► Grafana (dashboards)
        ├─► CloudWatch (AWS metrics + logs)
        └─► ELK Stack (log aggregation)
```

---

## Prerequisites

- AWS Account (ap-south-1 / Mumbai)
- GitHub account with MedCare360 repo
- AWS CLI configured: `aws configure`
- Terraform installed: `terraform --version`
- Ansible installed: `ansible --version`
- kubectl installed: `kubectl version`
- Docker installed: `docker --version`

---

## Phase 1: Infrastructure with CloudFormation

Deploy the base infrastructure (VPC, ECR, Jenkins, S3, CloudWatch):

```bash
# Deploy CloudFormation stack
aws cloudformation deploy \
  --template-file devops/cloudformation/medcare360-stack.yaml \
  --stack-name medcare360-infra \
  --parameter-overrides \
    Environment=production \
    EC2KeyPair=medcare-key \
    JenkinsInstanceType=t3.medium \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-south-1

# Get Jenkins IP
aws cloudformation describe-stacks \
  --stack-name medcare360-infra \
  --query "Stacks[0].Outputs[?OutputKey=='JenkinsURL'].OutputValue" \
  --output text
```

**CloudFormation creates:**
- VPC with public/private subnets (ap-south-1a, 1b)
- ECR repositories (medcare360-backend, medcare360-frontend)
- Jenkins EC2 (t3.medium) with Docker, Node.js, kubectl pre-installed
- S3 buckets (Terraform state + artifacts)
- DynamoDB table (Terraform state lock)
- CloudWatch Log Groups + Dashboard
- SNS Topic for alerts → your email
- IAM roles for Jenkins + EKS access

---

## Phase 2: EKS Cluster with Terraform

```bash
# Bootstrap state backend (run once)
bash devops/scripts/bootstrap-terraform-state.sh

# Initialize and apply
cd devops/terraform
terraform init
terraform plan
terraform apply --auto-approve

# Configure kubectl
aws eks update-kubeconfig \
  --region ap-south-1 \
  --name medcare360-eks
```

**Terraform provisions:**
- EKS cluster v1.29 (private endpoint)
- Node group: t3.medium, 1–10 nodes (auto-scaling)
- ALB Ingress Controller
- EFS for persistent volumes (uploads, logs)
- cert-manager for TLS

---

## Phase 3: Configuration Management with Ansible

```bash
# Configure Jenkins server
ansible-playbook \
  -i devops/ansible/inventory.ini \
  devops/ansible/install-docker.yml \
  devops/ansible/install-jenkins.yml \
  devops/ansible/install-kubectl.yml \
  devops/ansible/install-terraform.yml \
  devops/ansible/install-aws-cli.yml

# Or run everything at once
ansible-playbook \
  -i devops/ansible/inventory.ini \
  devops/ansible/site.yml
```

**Ansible configures:**
- Docker Engine + Docker Compose
- Jenkins with required plugins
- kubectl + AWS CLI
- Terraform
- Prometheus + Grafana
- Filebeat (ELK agent)
- CloudWatch Agent

---

## Phase 4: Kubernetes Deployments

```bash
# Create namespace and secrets
kubectl apply -f devops/kubernetes/namespace.yaml
kubectl apply -f devops/kubernetes/configmap.yaml
bash devops/scripts/create-k8s-secrets.sh

# Deploy all workloads
kubectl apply -f devops/kubernetes/backend-deployment.yaml
kubectl apply -f devops/kubernetes/frontend-deployment.yaml
kubectl apply -f devops/kubernetes/mongodb-deployment.yaml
kubectl apply -f devops/kubernetes/ingress.yaml
kubectl apply -f devops/kubernetes/hpa.yaml

# Deploy CloudWatch agent DaemonSet
kubectl apply -f devops/kubernetes/cloudwatch-agent.yaml

# Verify
kubectl get pods -n medcare360
kubectl get services -n medcare360
kubectl get ingress -n medcare360
```

---

## Phase 5: Jenkins CI/CD Setup

### 1. Access Jenkins
```
http://YOUR_JENKINS_IP:8080
Initial password: cat /var/lib/jenkins/secrets/initialAdminPassword
```

### 2. Install Plugins
- GitHub Integration
- Docker Pipeline
- AWS Credentials
- Kubernetes CLI
- Blue Ocean (optional, nice UI)
- Trivy (security scanning)

### 3. Add Credentials (Manage Jenkins → Credentials)
| ID | Type | Value |
|---|---|---|
| `AWS_ACCOUNT_ID` | Secret text | Your AWS account ID |
| `GROQ_API_KEY` | Secret text | gsk_... |
| `JWT_SECRET` | Secret text | your JWT secret |
| `MONGODB_URI_PROD` | Secret text | Atlas connection string |
| `github-token` | Username/Password | GitHub PAT |

### 4. Create Pipeline Job
1. New Item → Pipeline
2. Name: `medcare360-ci`
3. GitHub project: `https://github.com/sumeet2608/MedCare360`
4. Build triggers: ✅ **GitHub hook trigger for GITScm polling**
5. Pipeline → Definition: **Pipeline script from SCM**
6. SCM: Git → `https://github.com/sumeet2608/MedCare360.git`
7. Branch: `*/main`
8. Script path: `devops/jenkins/Jenkinsfile`
9. Save

### 5. GitHub Webhook
1. Go to: `https://github.com/sumeet2608/MedCare360/settings/hooks`
2. **Add webhook:**
   - Payload URL: `http://YOUR_JENKINS_IP:8080/github-webhook/`
   - Content type: `application/json`
   - Events: **Just the push event**
   - Active: ✅
3. Save

**Now every `git push` to main triggers the full pipeline automatically.**

---

## Phase 6: Monitoring

### Prometheus (port 9090)
```bash
# Access on EC2
http://YOUR_JENKINS_IP:9090

# Running as Docker container
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/devops/monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### Grafana (port 3000)
```bash
http://YOUR_JENKINS_IP:3000
Default login: admin / admin

# Import dashboard
docker run -d \
  --name grafana \
  -p 3000:3000 \
  -v $(pwd)/devops/monitoring/grafana/dashboard.json:/etc/grafana/provisioning/dashboards/medcare360.json \
  grafana/grafana
```

### CloudWatch
- Logs: `/medcare360/production/backend` and `/medcare360/production/frontend`
- Dashboard: `MedCare360-production` (auto-created by CloudFormation)
- Alarms: CPU > 80%, health check failures → email alert

### ELK Stack
```bash
# Elasticsearch
docker run -d --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  elasticsearch:8.11.0

# Logstash
docker run -d --name logstash \
  -p 5044:5044 \
  -v $(pwd)/devops/monitoring/elk/logstash.conf:/usr/share/logstash/pipeline/logstash.conf \
  logstash:8.11.0

# Kibana
docker run -d --name kibana \
  -p 5601:5601 \
  --link elasticsearch:elasticsearch \
  kibana:8.11.0

# Access Kibana
http://YOUR_JENKINS_IP:5601
```

---

## Complete Pipeline Execution

### Automated (after webhook setup):
```bash
# Just push code — everything happens automatically
git add .
git commit -m "feat: new feature"
git push origin main

# Pipeline runs:
# 1. GitHub sends webhook → Jenkins
# 2. Jenkins: npm install → test → build → docker → ECR → EKS
# 3. K8s rolls out new version with zero downtime
# 4. Smoke test verifies /health
# 5. Prometheus scrapes new metrics
# 6. CloudWatch logs updated
```

### Manual (run setup once):
```bash
bash devops/scripts/setup-cicd-pipeline.sh
```

---

## Access URLs (after full deployment)

| Service | URL |
|---|---|
| Application | https://medcare360.com (or ALB DNS) |
| Jenkins | http://65.1.111.108:8080 |
| Grafana | http://65.1.111.108:3000 |
| Prometheus | http://65.1.111.108:9090 |
| Kibana (ELK) | http://65.1.111.108:5601 |
| CloudWatch | AWS Console → CloudWatch → Dashboard: MedCare360-production |

---

## Current State vs Full Pipeline

| Component | Status | Notes |
|---|---|---|
| Git + GitHub | ✅ Live | sumeet2608/MedCare360 |
| Docker (backend) | ✅ Running | EC2 via PM2 |
| Docker (frontend) | ✅ Running | S3 static hosting |
| MongoDB Atlas | ✅ Live | Free M0 cluster |
| CloudFormation | 📋 Ready | Deploy to activate |
| Terraform (EKS) | 📋 Ready | Deploy to activate |
| Ansible | 📋 Ready | Run after CF deploy |
| Jenkins CI/CD | 📋 Ready | Deploy to activate |
| Kubernetes | 📋 Ready | Deploy after EKS |
| Prometheus + Grafana | 📋 Ready | Run via Docker |
| CloudWatch | 📋 Ready | Active after CF deploy |
| ELK Stack | 📋 Ready | Run via Docker |
| GitHub Webhook | 📋 Ready | Configure after Jenkins |
