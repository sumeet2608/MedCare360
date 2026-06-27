#!/bin/bash
# Run this ONCE before the first `terraform init` to create the S3 state backend
set -e

REGION="us-east-1"
BUCKET="medcare360-terraform-state"
DYNAMO_TABLE="medcare360-terraform-locks"

echo "🚀 Bootstrapping Terraform remote state..."

# Create S3 bucket
aws s3api create-bucket \
  --bucket $BUCKET \
  --region $REGION

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $BUCKET \
  --versioning-configuration Status=Enabled

# Enable AES-256 encryption
aws s3api put-bucket-server-side-encryption-configuration \
  --bucket $BUCKET \
  --server-side-encryption-configuration '{
    "Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]
  }'

# Block all public access
aws s3api put-public-access-block \
  --bucket $BUCKET \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name $DYNAMO_TABLE \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

echo "✅ S3 bucket: $BUCKET"
echo "✅ DynamoDB table: $DYNAMO_TABLE"
echo ""
echo "Now run: cd devops/terraform && terraform init"
