#!/usr/bin/env bash
# Shopify — Obtenir un access token via client credentials grant
# Usage: bash scripts/shopify-get-token.sh
#
# Lit SHOPIFY_STORE, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET depuis .env.local
# Ecrit le token dans SHOPIFY_ACCESS_TOKEN de .env.local
# Le token expire après 24h — relancer ce script pour renouveler.

set -euo pipefail

ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Erreur: $ENV_FILE introuvable"
  exit 1
fi

# Charger les variables
SHOPIFY_STORE=$(grep '^SHOPIFY_STORE=' "$ENV_FILE" | cut -d'=' -f2-)
SHOPIFY_CLIENT_ID=$(grep '^SHOPIFY_CLIENT_ID=' "$ENV_FILE" | cut -d'=' -f2-)
SHOPIFY_CLIENT_SECRET=$(grep '^SHOPIFY_CLIENT_SECRET=' "$ENV_FILE" | cut -d'=' -f2-)

if [ -z "$SHOPIFY_STORE" ] || [ -z "$SHOPIFY_CLIENT_ID" ] || [ -z "$SHOPIFY_CLIENT_SECRET" ]; then
  echo "Erreur: SHOPIFY_STORE, SHOPIFY_CLIENT_ID ou SHOPIFY_CLIENT_SECRET manquant dans .env.local"
  exit 1
fi

echo "Demande de token pour $SHOPIFY_STORE..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://${SHOPIFY_STORE}/admin/oauth/access_token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=${SHOPIFY_CLIENT_ID}&client_secret=${SHOPIFY_CLIENT_SECRET}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "Erreur HTTP $HTTP_CODE:"
  echo "$BODY"
  echo ""
  echo "Si HTTP 404: ton app est peut-etre une custom app legacy."
  echo "Dans ce cas, copie le token depuis Shopify Admin > Settings > Apps > Develop apps > ton app > API credentials"
  echo "et colle-le manuellement dans .env.local a la ligne SHOPIFY_ACCESS_TOKEN=..."
  exit 1
fi

# Extraire le token (compatible bash sans jq)
TOKEN=$(echo "$BODY" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
SCOPE=$(echo "$BODY" | grep -o '"scope":"[^"]*"' | cut -d'"' -f4)
EXPIRES=$(echo "$BODY" | grep -o '"expires_in":[0-9]*' | cut -d':' -f2)

if [ -z "$TOKEN" ]; then
  echo "Erreur: pas de token dans la reponse:"
  echo "$BODY"
  exit 1
fi

# Mettre a jour .env.local
if grep -q '^SHOPIFY_ACCESS_TOKEN=' "$ENV_FILE"; then
  sed -i '' "s|^SHOPIFY_ACCESS_TOKEN=.*|SHOPIFY_ACCESS_TOKEN=${TOKEN}|" "$ENV_FILE"
else
  echo "SHOPIFY_ACCESS_TOKEN=${TOKEN}" >> "$ENV_FILE"
fi

echo ""
echo "Token obtenu avec succes."
echo "  Scope: $SCOPE"
echo "  Expire dans: ${EXPIRES}s (~$(( EXPIRES / 3600 ))h)"
echo "  Token: ${TOKEN:0:12}...${TOKEN: -4}"
echo ""
echo "Ecrit dans $ENV_FILE"
echo "Relance 'bun run dev' pour charger le nouveau token."
