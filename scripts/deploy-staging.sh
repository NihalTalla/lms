#!/usr/bin/env bash
set -euo pipefail

# Deploy staging using CloudFormation package & deploy (SAM-compatible)
# Expects environment variables:
#  - S3_BUCKET : S3 bucket to upload packaged template
#  - STACK_NAME : CloudFormation stack name (e.g. lms-staging)
#  - PARAMETER_OVERRIDES : optional parameter overrides string (Key=Value Key2=Value2)

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
TEMPLATE_FILE="$ROOT_DIR/lms-backend/template.yaml"
PACKAGED_FILE="$ROOT_DIR/packaged-staging.yaml"

if [ -z "${S3_BUCKET:-}" ]; then
  echo "S3_BUCKET env is required" >&2
  exit 2
fi

if [ -z "${STACK_NAME:-}" ]; then
  STACK_NAME="lms-staging"
fi

echo "Packaging template: $TEMPLATE_FILE -> s3://$S3_BUCKET"
aws cloudformation package \
  --template-file "$TEMPLATE_FILE" \
  --s3-bucket "$S3_BUCKET" \
  --output-template-file "$PACKAGED_FILE"

echo "Deploying stack: $STACK_NAME"
DEPLOY_CMD=(aws cloudformation deploy --template-file "$PACKAGED_FILE" --stack-name "$STACK_NAME" --capabilities CAPABILITY_NAMED_IAM)
if [ -n "${PARAMETER_OVERRIDES:-}" ]; then
  DEPLOY_CMD+=(--parameter-overrides ${PARAMETER_OVERRIDES})
fi

"${DEPLOY_CMD[@]}"

echo "Deployment triggered. Use CloudFormation console to watch progress."
