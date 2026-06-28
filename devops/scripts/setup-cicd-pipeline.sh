#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  MedCare360 — Complete CI/CD Pipeline Setup Script
#  Run this ONCE after CloudFormation stack is deployed
#  Flow: Git → GitHub Webhook → Jenkins → Docker → ECR → EKS → Monitoring
# ═══════════════════════════════════════════════════════════════════════════════

set -e
REGION="ap-south-1"
PROJECT="medcare360"
GITHUB_REPO="https://github.com/sumeet2608/MedCare360"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " MedCare360 DevOps Pipeline Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── STEP 1: Deploy CloudFormation Stack ──────────────────────────────────────
echo ""
echo "📦 STEP 1: Deploying CloudFormation Stack..."
aws cloudformation deploy \
  --template-file devops/cloudformation/medcare360-stack.yaml \
  --stack-name medcare360-infra \
  --parameter-overrides \
    Environment=production \
    ProjectName=medcare360 \
    EC2KeyPair=medcare-key \
    JenkinsInstanceType=t3.medium \
  --capabilities CAPABILITY_NAMED_IAM \
  --region $REGION

# Get outputs
JENKINS_IP=$(aws cloudformation describe-stacks \
  --stack-name medcare360-infra \
  --query "Stacks[0].Outputs[?OutputKey=='JenkinsPublicIP'].OutputValue" \
  --output text --region $REGION)
BACKEND_ECR=$(aws cloudformation describe-stacks \
  --stack-name medcare360-infra \
  --query "Stacks[0].Outputs[?OutputKey=='BackendECRURI'].OutputValue" \
  --output text --region $REGION)

echo "✅ CloudFormation deployed!"
echo "   Jenkins: http://$JENKINS_IP:8080"
echo "   Backend ECR: $BACKEND_ECR"

# ── STEP 2: Terraform — Provision EKS ────────────────────────────────────────
echo ""
echo "🏗️  STEP 2: Provisioning EKS with Terraform..."
cd devops/terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan
cd ../..

# ── STEP 3: Ansible — Configure Jenkins Server ───────────────────────────────
echo ""
echo "⚙️  STEP 3: Configuring Jenkins with Ansible..."
# Wait for Jenkins EC2 to be ready
sleep 60
ansible-playbook \
  -i devops/ansible/inventory.ini \
  devops/ansible/site.yml \
  --tags jenkins

# ── STEP 4: Configure Kubernetes ─────────────────────────────────────────────
echo ""
echo "☸️  STEP 4: Deploying to Kubernetes..."
aws eks update-kubeconfig --region $REGION --name medcare360-eks

# Create namespace and apply manifests
kubectl apply -f devops/kubernetes/namespace.yaml
kubectl apply -f devops/kubernetes/configmap.yaml
bash devops/scripts/create-k8s-secrets.sh
kubectl apply -f devops/kubernetes/
kubectl apply -f devops/kubernetes/cloudwatch-agent.yaml

# Wait for pods
kubectl rollout status deployment/medcare-backend -n medcare360 --timeout=300s
kubectl rollout status deployment/medcare-frontend -n medcare360 --timeout=300s

# ── STEP 5: Setup Monitoring ──────────────────────────────────────────────────
echo ""
echo "📊 STEP 5: Setting up Prometheus + Grafana..."
ansible-playbook \
  -i devops/ansible/inventory.ini \
  devops/ansible/site.yml \
  --tags monitoring

# ── STEP 6: GitHub Webhook Setup Instructions ─────────────────────────────────
echo ""
echo "🔗 STEP 6: GitHub Webhook Setup (MANUAL)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Go to: $GITHUB_REPO/settings/hooks"
echo "Click: Add webhook"
echo ""
echo "  Payload URL:    http://$JENKINS_IP:8080/github-webhook/"
echo "  Content type:   application/json"
echo "  Secret:         (set same in Jenkins GitHub plugin)"
echo "  Events:         Just the push event"
echo "  Active:         ✅ checked"
echo ""
echo "In Jenkins (http://$JENKINS_IP:8080):"
echo "  1. Install plugins: GitHub, Docker Pipeline, AWS Credentials, Kubernetes"
echo "  2. Add credentials:"
echo "     - AWS_ACCOUNT_ID (Secret text)"
echo "     - GROQ_API_KEY   (Secret text)"
echo "     - JWT_SECRET     (Secret text)"
echo "  3. Create Pipeline job:"
echo "     - Source: Git → $GITHUB_REPO"
echo "     - Branch: */main"
echo "     - Script path: devops/jenkins/Jenkinsfile"
echo "     - Build triggers: ✅ GitHub hook trigger"
echo ""

# ── STEP 7: Verify Everything ─────────────────────────────────────────────────
echo "✅ STEP 7: Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
kubectl get pods -n medcare360
kubectl get services -n medcare360
kubectl get ingress -n medcare360

echo ""
echo "🎉 MedCare360 DevOps Pipeline is LIVE!"
echo ""
echo "Access Points:"
echo "  🌐 Application:  $(kubectl get ingress medcare-ingress -n medcare360 -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo 'Pending...')"
echo "  🔧 Jenkins:      http://$JENKINS_IP:8080"
echo "  📊 Grafana:      http://$JENKINS_IP:3000  (admin/admin)"
echo "  🔥 Prometheus:   http://$JENKINS_IP:9090"
echo "  🔍 Kibana (ELK): http://$JENKINS_IP:5601"
echo "  ☁️  CloudWatch:   https://console.aws.amazon.com/cloudwatch/home?region=$REGION"
