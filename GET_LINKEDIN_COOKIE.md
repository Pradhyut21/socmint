# Get LinkedIn Session Cookie (li_at)

## Steps to Get Your LinkedIn Cookie

1. **Open LinkedIn** in your browser (Chrome, Edge, or Firefox)

2. **Log in** to your LinkedIn account

3. **Open Developer Tools**:
   - Windows: Press `F12` or `Ctrl + Shift + I`
   - Mac: Press `Cmd + Option + I`

4. **Go to Application/Storage Tab**:
   - Click on **Application** tab (Chrome/Edge)
   - Or **Storage** tab (Firefox)

5. **Find Cookies**:
   - Expand **Cookies** in the left sidebar
   - Click on `https://www.linkedin.com`

6. **Find li_at Cookie**:
   - Look for a cookie named `li_at`
   - Click on it to see the value
   - The value will be a long string like: `AQEDATYxyz...` (around 200+ characters)

7. **Copy the Value**:
   - Copy the entire `li_at` cookie value
   - Save it to `.env.local` file

## Add to .env.local

Open `.env.local` and add:

```
LINKEDIN_SESSION_COOKIE=your_li_at_cookie_value_here
```

Replace `your_li_at_cookie_value_here` with the actual cookie value you copied.

## Important Notes

- ⚠️ **Keep this cookie private** - It's like a password
- ⚠️ **Don't share it** - Anyone with this cookie can access your LinkedIn account
- ⚠️ **Cookie expires** - You may need to get a new one periodically (every few weeks/months)
- 💡 **Use a dedicated account** - Consider creating a separate LinkedIn account for scraping
- 💡 **Privacy settings** - Enable privacy options so people don't see you viewing their profiles

## Security Tip

Create a **new LinkedIn account** specifically for scraping:
1. Less risk to your main account
2. Enable all privacy settings
3. Don't connect with anyone
4. Use it only for scraping

## Testing

After adding the cookie, test it with:

```bash
node test_linkedin_scraper_new.js
```

The scraper will verify if the session is valid.
