#!/bin/bash

# This script helps you set up the Telegram webhook
# Usage: ./scripts/setup-telegram-webhook.sh https://your-domain.com YOUR_BOT_TOKEN

if [ $# -lt 2 ]; then
    echo "Usage: $0 <domain> <bot_token>"
    echo ""
    echo "Examples:"
    echo "  $0 https://yourapp.vercel.app 123456789:ABCDefGHIjKlmNoPqRsTuVwXyZ"
    echo "  $0 https://abc123.ngrok.io 123456789:ABCDefGHIjKlmNoPqRsTuVwXyZ"
    echo ""
    exit 1
fi

DOMAIN="$1"
BOT_TOKEN="$2"
WEBHOOK_URL="${DOMAIN}/api/telegram"

echo "🔗 Setting Telegram webhook..."
echo "   Domain: $DOMAIN"
echo "   Webhook URL: $WEBHOOK_URL"
echo "   Bot Token: ${BOT_TOKEN:0:10}..."
echo ""

# Set the webhook
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\"}"

echo ""
echo ""
echo "✅ Webhook set! Verifying..."
echo ""

# Get webhook info to verify
curl -X GET "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"

echo ""
echo ""
echo "✨ Done! Your bot should now receive messages from Telegram."
