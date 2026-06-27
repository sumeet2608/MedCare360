# Deployment Guide

## Option 1: Docker Compose (Single Server)

### Prerequisites
- Ubuntu 22.04 server with Docker & Docker Compose installed
- Ports 80, 443, 5000, 27017 open

```bash
# Install Docker (or use Ansible playbook)
cd devops/ansible
ansible-playbook -i inventory.ini install-docker.yml

# Deploy
cd /path/to/MedCare360
cp backend/.env.example backend/.env
# Edit backend/.env

docker compose up -d --build

# With monitoring
docker compose --profile monitoring up -d

# With logging
docker compose --profile logging up -d
```

## Option 2: AWS EKS (Production)

### Step 1 - Provision Infrastructure with Terraform

```bash
cd devops/terraform

# Initialize (create S3 bucket for state first)
aws s3 mb s3://medcare360-terraform-state --region us-east-1
aws dynamodb create-table \
  --table-name medcare360-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Step 2 - Build & Push Docker Images to ECR

```bash
# Get ECR URLs from Terraform output
BACKEND_ECR=$(terraform output -raw ecr_backend_url)
FRONTEND_ECR=$(terraform output -raw ecr_frontend_url)
AWS_REGION=us-east-1

# Authenticate Docker to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $BACKEND_ECR

# Build and push backend
cd backend
docker build --target production -t $BACKEND_ECR:latest .
docker push $BACKEND_ECR:latest

# Build and push frontend
cd ../frontend
docker build -t $FRONTEND_ECR:latest .
docker push $FRONTEND_ECR:latest
```

### Step 3 - Configure kubectl for EKS

```bash
EKS_CLUSTER=$(terraform output -raw eks_cluster_name)
aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER
kubectl get nodes   # Should show 3 nodes
```

### Step 4 - Deploy to Kubernetes

```bash
cd devops/kubernetes

# Update image URIs in deployment YAMLs
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
sed -i "s/ACCOUNT_ID/$ACCOUNT_ID/g; s/REGION/$AWS_REGION/g" \
  backend-deployment.yaml frontend-deployment.yaml

# Update Kubernetes secrets with real values
# Edit secret.yaml with actual secrets, then:
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f mongodb-deployment.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml

# Check deployment status
kubectl get pods -n medcare360
kubectl get svc -n medcare360
kubectl get ingress -n medcare360
```

### Step 5 - Point DNS

Get the LoadBalancer hostname:
```bash
kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

Create CNAME records in your DNS provider:
- `medcare360.com` → LoadBalancer hostname
- `api.medcare360.com` → LoadBalancer hostname

## Updating the Application

```bash
# Build new image
docker build -t $BACKEND_ECR:v2.0.0 .
docker push $BACKEND_ECR:v2.0.0

# Rolling update (zero downtime)
kubectl set image deployment/medcare-backend \
  backend=$BACKEND_ECR:v2.0.0 -n medcare360

# Monitor rollout
kubectl rollout status deployment/medcare-backend -n medcare360
```

## Rollback

```bash
kubectl rollout undo deployment/medcare-backend -n medcare360
kubectl rollout undo deployment/medcare-frontend -n medcare360
```

## Scaling

```bash
# Manual scale
kubectl scale deployment medcare-backend --replicas=5 -n medcare360

# HPA auto-scales based on CPU/memory (configured in hpa.yaml)
kubectl get hpa -n medcare360
```

## Monitoring

After deploying with monitoring profile:
- **Prometheus**: http://your-server:9090
- **Grafana**: http://your-server:3000 (admin/admin)
- Import `devops/monitoring/grafana/dashboard.json` into Grafana

## SSL/TLS

cert-manager (installed via Terraform) automatically provisions Let's Encrypt certificates when the Ingress is deployed with the correct annotations and DNS is pointing correctly.
