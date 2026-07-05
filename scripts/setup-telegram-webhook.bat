@echo off
REM This script helps you set up the Telegram webhook on Windows
REM Usage: setup-telegram-webhook.bat https://your-domain.com YOUR_BOT_TOKEN

if "%~1"=="" goto usage
if "%~2"=="" goto usage

setlocal enabledelayedexpansion
set DOMAIN=%~1
set BOT_TOKEN=%~2
set WEBHOOK_URL=%DOMAIN%/api/telegram

echo.
echo 🔗 Setting Telegram webhook...
echo    Domain: %DOMAIN%
echo    Webhook URL: %WEBHOOK_URL%
echo    Bot Token: %BOT_TOKEN:~0,10%...
echo.

REM Set the webhook using curl
curl -X POST "https://api.telegram.org/bot%BOT_TOKEN%/setWebhook" ^
  -H "Content-Type: application/json" ^
  -d "{\"url\":\"!WEBHOOK_URL!\"}"

echo.
echo.
echo ✅ Webhook set! Verifying...
echo.

REM Verify webhook
curl -X GET "https://api.telegram.org/bot%BOT_TOKEN%/getWebhookInfo"

echo.
echo.
echo ✨ Done! Your bot should now receive messages from Telegram.
goto end

:usage
echo Usage: setup-telegram-webhook.bat ^<domain^> ^<bot_token^>
echo.
echo Examples:
echo   setup-telegram-webhook.bat https://yourapp.vercel.app 123456789:ABCDefGHIjKlmNoPqRsTuVwXyZ
echo   setup-telegram-webhook.bat https://abc123.ngrok.io 123456789:ABCDefGHIjKlmNoPqRsTuVwXyZ
echo.
exit /b 1

:end
