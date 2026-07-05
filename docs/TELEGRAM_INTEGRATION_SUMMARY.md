# Telegram Bot Integration — Complete Summary

Your SOCMINT app now has a **Telegram bot integration** for running OSINT investigations directly from Telegram.

## What Was Added

### 1. **Backend Handler** (`app/api/telegram/route.ts`)
- Receives Telegram messages via webhook
- Handles `/search` command to run investigations
- Returns formatted results with confidence scores
- Supports both username and name searches

### 2. **Environment Configuration** (`.env.local`)
```env
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_BOT_USERNAME=your_bot_username
```

### 3. **Documentation**
- `docs/TELEGRAM_BOT_SETUP.md` — Full setup guide
- `scripts/setup-telegram-webhook.sh` — Linux/Mac setup script
- `scripts/setup-telegram-webhook.bat` — Windows setup script

## Quick Start (5 Minutes)

### 1. Create Your Bot
```
Telegram → @BotFather → /newbot → Follow prompts → Copy token
```

### 2. Add Token to `.env.local`
```env
TELEGRAM_BOT_TOKEN=123456789:ABCDefGHIjKlmNoPqRsTuVwXyZ...
TELEGRAM_BOT_USERNAME=my_socmint_bot
```

### 3. Set Webhook (Choose One)

**Local Testing** (using ngrok):
```bash
ngrok http 3000
# Copy HTTPS URL (e.g., https://abc123.ngrok.io)

# Windows:
scripts\setup-telegram-webhook.bat https://abc123.ngrok.io YOUR_BOT_TOKEN

# Linux/Mac:
./scripts/setup-telegram-webhook.sh https://abc123.ngrok.io YOUR_BOT_TOKEN
```

**Production**:
```bash
# After deploying to Vercel/Railway/etc:
scripts\setup-telegram-webhook.bat https://your-domain.com YOUR_BOT_TOKEN
```

### 4. Start & Test
```bash
npm run dev
```

Open Telegram, find your bot, send `/start` → bot responds ✅

## Commands

| Command | Example | Result |
|---------|---------|--------|
| `/start` | `/start` | Welcome & instructions |
| `/help` | `/help` | List all commands |
| `/search @username` | `/search @saikishan` | Find all accounts with this username |
| `/search name` | `/search john doe` | Find accounts by real name |

## Example Flow

```
User: /search @pradhyut
Bot: 🔍 Searching... This may take 30-90 seconds.

[30-90 seconds later]

Bot: 
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

[... more results ...]

Total accounts discovered: 15
```

## How It Works

```
Telegram User → Types `/search` → Telegram API → Your Webhook
                                                    ↓
                                        Runs Investigation (liveSocmint.ts)
                                                    ↓
                                        Formats Results + Confidence Scores
                                                    ↓
Telegram User ← Gets Results ← Telegram API ← Your Response
```

## File Structure

```
app/
  api/
    telegram/
      route.ts                    ← Main webhook handler

docs/
  TELEGRAM_BOT_SETUP.md           ← Full setup guide
  TELEGRAM_INTEGRATION_SUMMARY.md ← This file

scripts/
  setup-telegram-webhook.sh       ← Setup script (Linux/Mac)
  setup-telegram-webhook.bat      ← Setup script (Windows)

.env.local
  TELEGRAM_BOT_TOKEN              ← Your bot token
  TELEGRAM_BOT_USERNAME           ← Your bot username
```

## Troubleshooting

### Bot doesn't respond to commands
1. Check webhook URL is correct
2. Verify bot token in `.env.local`
3. Check server logs: `npm run dev`
4. If using ngrok, make sure it's still running

### Webhook verification failed
Run this to check status:
```bash
curl https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo
```

Should show:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-domain.com/api/telegram",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### Search takes too long
- First search may be slow (building data cache)
- Subsequent searches are faster
- Check backend logs for errors

### "No accounts found"
- Username/name might not exist
- Try variations
- Check app logs for investigation errors

## Security & Privacy

⚠️ **Important**:
- **Keep bot token secret** — don't commit to git, don't share publicly
- **Bot is public** — anyone on Telegram can message it
- **Queries are logged** — for debugging/analytics
- **Rate limiting** — consider adding if heavy usage

## Testing Locally (Development)

### Using ngrok (Recommended)

1. Download ngrok: https://ngrok.com/download
2. Run: `ngrok http 3000`
3. Copy HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Set webhook with that URL
5. Keep ngrok running while testing
6. Restart ngrok? Get new URL, reset webhook

### Without ngrok

- Deploy to staging first (Vercel, Railway, etc.)
- Test webhook there
- Then deploy to production

## Next Steps

- ✅ Webhook is set up and responding
- ✅ Commands are working
- ✅ Results are formatted and returned

**Optional Enhancements**:
- Add rate limiting to prevent abuse
- Add admin commands for stats
- Add export to CSV/PDF
- Add filtering (platform, confidence, etc.)
- Add persistent search history

## Commands in Code

To add new commands, edit `app/api/telegram/route.ts`:

```typescript
if (text.startsWith("/mycommand ")) {
  const arg = text.slice(11).trim();
  // Your logic here
  await sendTelegramMessage(chatId, "Response");
  return NextResponse.json({ ok: true });
}
```

## Support

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Telegram Bot Examples](https://core.telegram.org/bots/samples)
- Check `app/api/telegram/route.ts` for implementation details

---

**That's it!** Your SOCMINT app is now accessible from Telegram. Enjoy running OSINT investigations on the go! 🚀
