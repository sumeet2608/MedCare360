#!/bin/bash
# Creates Kubernetes secrets from AWS Secrets Manager (run after kubectl is configured)
set -e

NAMESPACE="medcare360"
REGION="us-east-1"

get_secret() {
  aws secretsmanager get-secret-value \
    --secret-id "medcare360/$1" \
    --region $REGION \
    --query SecretString \
    --output text 2>/dev/null || echo ""
}

echo "🔐 Creating Kubernetes secrets from AWS Secrets Manager..."

# Delete existing secret if present
kubectl delete secret medcare-secrets -n $NAMESPACE --ignore-not-found

kubectl create secret generic medcare-secrets \
  -n $NAMESPACE \
  --from-literal=JWT_SECRET="$(get_secret jwt-secret)" \
  --from-literal=GROQ_API_KEY="$(get_secret groq-api-key)" \
  --from-literal=MONGODB_URI="$(get_secret mongodb-uri)" \
  --from-literal=MONGO_ROOT_PASSWORD="$(get_secret mongo-root-password)" \
  --from-literal=REDIS_PASSWORD="$(get_secret redis-password)" \
  --from-literal=SMTP_USER="$(get_secret smtp-user)" \
  --from-literal=SMTP_PASS="$(get_secret smtp-pass)" \
  --from-literal=AWS_ACCESS_KEY_ID="$(get_secret aws-access-key-id)" \
  --from-literal=AWS_SECRET_ACCESS_KEY="$(get_secret aws-secret-access-key)"

echo "✅ Kubernetes secrets created in namespace: $NAMESPACE"
echo ""
echo "Verify with: kubectl get secrets -n $NAMESPACE"
