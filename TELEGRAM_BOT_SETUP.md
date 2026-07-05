# 🤖 Telegram Bot Setup Guide

Your SOCMINT app now has Telegram bot integration. Users can investigate profiles directly from Telegram.

## Quick Start (5 minutes)

### 1. Create a Telegram Bot

Open Telegram and search for **@BotFather**, then:

```
/start
/newbot
```

Follow the prompts:
- Bot name: `SOCMINT Shield` (or your preferred name)
- Bot username: `socmint_bot` (must be unique, end with `_bot`)

**BotFather will give you a token**, e.g.:
```
5123456789:ABCDefGHijKLmNOpQrStUvwxYz1234567890
```

### 2. Add Token to `.env.local`

Open `.env.local` and set:
```env
TELEGRAM_BOT_TOKEN=5123456789:ABCDefGHijKLmNOpQrStUvwxYz1234567890
```

### 3. Set Webhook (Production)

Replace `yourdomain.com` with your actual domain:

```bash
curl -X POST https://api.telegram.org/bot5123456789:ABCDefGHijKLmNOpQrStUvwxYz1234567890/setWebhook \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://yourdomain.com/api/telegram\"}"
```

Response should be:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### 4. Test with Telegram

Find your bot in Telegram search and:
- Send `/start` — see welcome message
- Send `/help` — see commands
- Send `/search @username` — run investigation

---

## Local Development (with ngrok)

### 1. Install ngrok

Download from: https://ngrok.com/download

### 2. Start ngrok

```bash
ngrok http 3000
```

You'll get a URL like: `https://abc123def456.ngrok.io`

### 3. Set Webhook

Replace `abc123def456` with your ngrok URL:

```bash
curl -X POST https://api.telegram.org/botYOUR_TOKEN/setWebhook \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://abc123def456.ngrok.io/api/telegram\"}"
```

### 4. Test

Restart your dev server (`npm run dev`) and test in Telegram.

Every message will now be routed to your local machine.

---

## Bot Commands

### `/start`
Shows welcome message and available commands.

### `/help`
Shows command help and examples.

### `/search @username`
Searches for accounts matching the username across 20+ platforms.

Example:
```
/search @saikishan
/search saikishan
/search "john doe"
```

Returns:
- Platform (Instagram, GitHub, Twitter, etc.)
- Username/handle
- Confidence score (🟢 high, 🔵 medium, 🟡 low, 🔴 very low)
- Direct link to profile

---

## Features

✅ **Cross-Platform Search** — finds accounts on 20+ platforms  
✅ **Confidence Scoring** — shows match reliability  
✅ **Direct Links** — click to view discovered profiles  
✅ **Variation Matching** — finds similar usernames  
✅ **Name Search** — search by full name  
✅ **Fast Results** — 30-90 seconds per search  

---

## Troubleshooting

### Bot doesn't respond

1. Check token is correct in `.env.local`
2. Verify webhook is set:
   ```bash
   curl https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo
   ```
3. Check server logs for errors
4. Make sure `/api/telegram` endpoint is public (no auth)

### "No accounts found"

- Try different spelling/username
- The query might be too obscure
- Check if the person uses common social media

### Slow responses

- First search takes longer (API calls)
- Subsequent searches are faster (cached data)
- Network latency may add 30-90 seconds

### Webhook update fails

```
curl -X POST https://api.telegram.org/botYOUR_TOKEN/deleteWebhook
```

Then set again with the correct URL.

---

## Security Notes

⚠️ **Never share your bot token** — it grants full control of your bot  
⚠️ **Webhook URL is public** — no authentication required (bot sends requests from Telegram servers)  
⚠️ **Search logs** — all investigations are logged (mention in ToS)  
⚠️ **Rate limits** — Telegram allows ~30 messages/second per chat  

---

## API Reference

### Endpoint
```
POST /api/telegram
```

### Health Check
```
GET /api/telegram
```

Returns:
```json
{"status":"Bot running","token":"✓"}
```

---

## Next Steps

1. ✅ Add bot token to `.env.local`
2. ✅ Set webhook URL
3. ✅ Test with `/start` command
4. 🔜 Customize bot name/avatar in @BotFather
5. 🔜 Add more commands (export results, set alerts, etc.)

Enjoy your Telegram-powered OSINT bot! 🔍
