# Telegram Bot Integration Setup Guide

This guide walks you through setting up the SOCMINT Shield Telegram bot for OSINT investigations directly from Telegram.

## What This Does

- Search for usernames/names across 20+ social platforms
- Get confidence-scored results with direct profile links
- Run full investigations from Telegram without opening the web app
- Works with `/search @username` or `/search name`

## Step 1: Create a Telegram Bot

1. Open **Telegram** and search for `@BotFather`
2. Send `/start`
3. Send `/newbot`
4. Follow the prompts:
   - **Bot name**: e.g., "SOCMINT Shield" or "My OSINT Bot"
   - **Bot username**: e.g., `my_socmint_bot` (must end with `_bot`)
5. Copy the **token** provided (format: `123456789:ABCDefGHIjKlmNoPqRsTuVwXyZ...`)

## Step 2: Add Token to .env.local

1. Open `.env.local`
2. Find the `TELEGRAM_BOT_TOKEN=` line
3. Paste your token:
   ```
   TELEGRAM_BOT_TOKEN=123456789:ABCDefGHIjKlmNoPqRsTuVwXyZ...
   TELEGRAM_BOT_USERNAME=my_socmint_bot
   ```

## Step 3: Set the Webhook

Your bot needs to know where to send incoming messages. You have two options:

### Option A: Production (Recommended)

1. Deploy your app (e.g., to Vercel, Railway, etc.)
2. Get your domain: `https://your-domain.com`
3. Set the webhook:
   ```bash
   curl -X POST https://api.telegram.org/bot123456789:ABCDefGHIjKlmNoPqRsTuVwXyZ.../setWebhook \
     -H "Content-Type: application/json" \
     -d '{"url":"https://your-domain.com/api/telegram"}'
   ```

4. Verify it worked:
   ```bash
   curl https://api.telegram.org/bot123456789:ABCDefGHIjKlmNoPqRsTuVwXyZ.../getWebhookInfo
   ```

### Option B: Local Development (Testing)

Use **ngrok** to expose your local server to the internet:

1. **Install ngrok**: https://ngrok.com/download
2. **Run ngrok**:
   ```bash
   ngrok http 3000
   ```
   You'll see output like:
   ```
   Forwarding    https://abc123def456.ngrok.io -> http://localhost:3000
   ```

3. **Set the webhook** (replace YOUR_TOKEN and ngrok URL):
   ```bash
   curl -X POST https://api.telegram.org/botYOUR_TOKEN/setWebhook \
     -H "Content-Type: application/json" \
     -d '{"url":"https://abc123def456.ngrok.io/api/telegram"}'
   ```

4. Keep ngrok running while testing
5. When you restart ngrok, get the new URL and repeat step 3

## Step 4: Start Your App

```bash
npm run dev
```

## Step 5: Test the Bot

1. Open Telegram and find your bot (`@my_socmint_bot`)
2. Send `/start` → bot responds with welcome message
3. Send `/help` → bot shows available commands
4. Send `/search @saikishan` → bot searches and returns results
5. Send `/search john doe` → bot searches by name

## Available Commands

| Command | Example | What It Does |
|---------|---------|--------------|
| `/start` | `/start` | Welcome message & help |
| `/help` | `/help` | Show command list |
| `/search` | `/search @username` | Search by username |
| `/search` | `/search john doe` | Search by real name |

## Example Usage

```
User: /search @pradhyut

Bot: 🔍 Searching... This may take 30-90 seconds.

Bot (30 seconds later):
✅ Investigation Results
Query: pradhyut

Found: 15 accounts (showing top 10)

1. 🟢 INSTAGRAM
   @pradhyut
   Confidence: 92%
   View Profile

2. 🟢 GITHUB
   @pradhyut
   Confidence: 88%
   View Profile

...

Total accounts discovered: 15
```

## Troubleshooting

### Bot doesn't respond
- Check that webhook is set: `curl https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo`
- If webhook URL is wrong or blank, set it again
- Check server logs for errors

### Webhook returns 404
- Make sure `/api/telegram` route exists (it's in `app/api/telegram/route.ts`)
- Verify domain is correct (no trailing slash)

### "Searching..." but no results
- Check app server is running (`npm run dev`)
- Check backend logs for investigation errors
- May take 60+ seconds for first search

### Bot stops responding
- ngrok session expired? Get new URL and reset webhook
- Webhook URL might be blocked? Check network logs

## Security Notes

⚠️ **Important**: Telegram bot is public — anyone can find and message your bot.

- Keep `TELEGRAM_BOT_TOKEN` secret (don't commit to git)
- Consider rate limiting if heavy use
- User queries are logged in your backend

## Advanced: Custom Commands

Edit `app/api/telegram/route.ts` to add more commands:

```typescript
if (text.startsWith("/custom ")) {
  const arg = text.slice(9).trim();
  // Your custom logic
  await sendTelegramMessage(chatId, "Response here");
}
```

## Need Help?

- [Telegram Bot API Docs](https://core.telegram.org/bots/api)
- Check `app/api/telegram/route.ts` for implementation
- Verify bot token is correct: `curl https://api.telegram.org/botYOUR_TOKEN/getMe`
