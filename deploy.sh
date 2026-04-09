#!/bin/bash
# ════════════════════════════════════════════
# UBURN COCKPIT — Déploiement Google Cloud Run
# ════════════════════════════════════════════

PROJECT_ID="uburn-cockpit"
REGION="europe-west1"
SERVICE_NAME="uburn-cockpit"
IMAGE="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Déploiement Uburn Cockpit sur Cloud Run..."

# 1. Build Docker image
echo "📦 Build de l'image Docker..."
gcloud builds submit --tag $IMAGE --project $PROJECT_ID

# 2. Deploy to Cloud Run
echo "☁️ Déploiement sur Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "META_ACCESS_TOKEN=$META_ACCESS_TOKEN" \
  --set-env-vars "META_AD_ACCOUNT_ID=$META_AD_ACCOUNT_ID" \
  --set-env-vars "GA4_PROPERTY_ID=$GA4_PROPERTY_ID" \
  --set-env-vars "GA4_CREDENTIALS_PATH=/app/ga4-credentials.json" \
  --set-env-vars "SHOPIFY_STORE=$SHOPIFY_STORE" \
  --set-env-vars "SHOPIFY_CLIENT_ID=$SHOPIFY_CLIENT_ID" \
  --set-env-vars "SHOPIFY_CLIENT_SECRET=$SHOPIFY_CLIENT_SECRET" \
  --set-env-vars "SHOPIFY_ACCESS_TOKEN=$SHOPIFY_ACCESS_TOKEN" \
  --set-env-vars "SUPABASE_URL=$SUPABASE_URL" \
  --set-env-vars "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY" \
  --set-env-vars "SENDCLOUD_API_KEY=$SENDCLOUD_API_KEY" \
  --set-env-vars "SENDCLOUD_API_SECRET=$SENDCLOUD_API_SECRET" \
  --set-env-vars "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" \
  --set-env-vars "REPLICATE_API_TOKEN=$REPLICATE_API_TOKEN" \
  --set-env-vars "RESEND_API_KEY=$RESEND_API_KEY" \
  --set-env-vars "APPROVAL_EMAIL=$APPROVAL_EMAIL" \
  --set-env-vars "CRON_SECRET=$CRON_SECRET" \
  --project $PROJECT_ID

echo ""
echo "✅ Déploiement terminé !"
echo "🔗 URL: $(gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format 'value(status.url)')"

# 3. Setup Cloud Scheduler (cron toutes les heures)
echo ""
echo "⏰ Configuration Cloud Scheduler..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format 'value(status.url)')

gcloud scheduler jobs create http uburn-cron \
  --schedule="0 * * * *" \
  --uri="${SERVICE_URL}/api/cron" \
  --http-method=POST \
  --headers="x-cron-secret=${CRON_SECRET}" \
  --time-zone="Europe/Paris" \
  --location=$REGION \
  --project $PROJECT_ID \
  2>/dev/null || echo "⚠️ Job existe déjà, mise à jour..."

gcloud scheduler jobs update http uburn-cron \
  --schedule="0 * * * *" \
  --uri="${SERVICE_URL}/api/cron" \
  --http-method=POST \
  --headers="x-cron-secret=${CRON_SECRET}" \
  --time-zone="Europe/Paris" \
  --location=$REGION \
  --project $PROJECT_ID \
  2>/dev/null

echo ""
echo "════════════════════════════════════════════"
echo "✅ TOUT EST DÉPLOYÉ !"
echo "🔗 Dashboard: $SERVICE_URL"
echo "⏰ Cron: toutes les heures (Cloud Scheduler)"
echo "🤖 8 agents tournent 24h/24"
echo "════════════════════════════════════════════"
