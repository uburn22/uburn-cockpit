#!/usr/bin/env bash
# Deploy Uburn Cockpit to Google Cloud Run
# Prerequisites: gcloud CLI installed and authenticated
# Usage: bash scripts/deploy-cloudrun.sh

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-uburn-cockpit}"
REGION="europe-west1"
SERVICE_NAME="uburn-cockpit"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env.local"

echo "=== Uburn Cockpit — Deploy to Cloud Run ==="
echo "Project: $PROJECT_ID"
echo "Region:  $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Check gcloud
if ! command -v gcloud &>/dev/null; then
  echo "Erreur: gcloud CLI non installe."
  echo "Install: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Set project
gcloud config set project "$PROJECT_ID" 2>/dev/null

# Load env vars for build args
if [ -f "$ENV_FILE" ]; then
  echo "Loading env vars from .env.local..."
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# Build and push image
echo ""
echo "Building Docker image..."
gcloud builds submit \
  --tag "$IMAGE" \
  --timeout=600s \
  .

# Deploy to Cloud Run
echo ""
echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --allow-unauthenticated \
  --set-env-vars "\
META_ACCESS_TOKEN=${META_ACCESS_TOKEN:-},\
META_AD_ACCOUNT_ID=${META_AD_ACCOUNT_ID:-},\
GA4_PROPERTY_ID=${GA4_PROPERTY_ID:-},\
GA4_CREDENTIALS_PATH=/app/ga4-credentials.json,\
SHOPIFY_STORE=${SHOPIFY_STORE:-},\
SHOPIFY_ACCESS_TOKEN=${SHOPIFY_ACCESS_TOKEN:-},\
SHOPIFY_CLIENT_ID=${SHOPIFY_CLIENT_ID:-},\
SHOPIFY_CLIENT_SECRET=${SHOPIFY_CLIENT_SECRET:-},\
SUPABASE_URL=${SUPABASE_URL:-},\
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:-},\
SENDCLOUD_API_KEY=${SENDCLOUD_API_KEY:-},\
SENDCLOUD_API_SECRET=${SENDCLOUD_API_SECRET:-}"

echo ""
echo "=== Deploy complete ==="
URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="value(status.url)")
echo "URL: $URL"
