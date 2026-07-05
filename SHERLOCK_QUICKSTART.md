# Sherlock/Maigret Quick Start Guide

## 🎯 What This Does
Extends your SOCMINT platform to search usernames across **400-3000+ social networks** automatically using industry-standard OSINT tools.

## ⚡ 60-Second Setup

### Step 1: Install Tools
**Windows:**
```cmd
cd scripts
install-sherlock.bat
```

**Mac/Linux:**
```bash
cd scripts
chmod +x install-sherlock.sh
./install-sherlock.sh
```

**Or use Python directly:**
```bash
pip install sherlock-project
pip install maigret
```

### Step 2: Restart Dev Server
```bash
# Stop your current server (Ctrl+C)
npm run dev
```

### Step 3: Verify
Visit: `http://localhost:3000/api/sherlock`

You should see:
```json
{
  "success": true,
  "tools_available": {
    "sherlock": true,
    "maigret": true
  }
}
```

## 🚀 Usage

### Automatic (Recommended)
1. Go to Investigation page
2. Enable **"Deep Scan"** mode
3. Enter a username and search
4. Sherlock automatically runs and finds 400+ accounts
5. Results stream live to your UI

### Manual Testing
```bash
# Test Sherlock directly
sherlock targetusername

# Test Maigret directly
maigret targetusername
```

### API Testing
```bash
curl -X POST http://localhost:3000/api/sherlock \
  -H "Content-Type: application/json" \
  -d '{
    "action": "search",
    "username": "kishansaaai",
    "mode": "quick"
  }'
```

## 📊 What You Get

**Before Sherlock:**
- ~12-15 platforms checked
- GitHub, LinkedIn, Instagram, Reddit, etc.

**After Sherlock:**
- **400+ platforms** checked (Quick mode)
- **3000+ platforms** checked (Deep mode)
- Stack Overflow, HackerNews, Medium, Tumblr, Steam, VK, Weibo, and hundreds more

## 🎓 Examples

### Quick Username Search
```typescript
import { searchWithSherlock } from '@/lib/fetchers/sherlockFetcher';

const accounts = await searchWithSherlock('username', 'quick', new Date().toISOString());
console.log(`Found ${accounts.length} accounts!`);
```

### Check Tool Status
```typescript
import { checkSherlockTools } from '@/lib/fetchers/sherlockFetcher';

const tools = await checkSherlockTools();
if (tools.sherlock || tools.maigret) {
  console.log('OSINT tools ready!');
}
```

## ⚠️ Troubleshooting

**"Python not found"**
→ Install Python 3.x from python.org (Windows) or `brew install python3` (Mac)

**"Sherlock command not found after install"**
→ Restart your terminal/IDE and try again

**"Installation failed"**
→ Run: `python -m pip install --upgrade pip` then retry

**"Search timeout"**
→ Use `mode: "quick"` instead of `mode: "deep"`

## 📈 Performance

| Mode | Duration | Networks | Avg. Finds |
|------|----------|----------|------------|
| Quick | 30s | 400+ | 5-15 accounts |
| Deep | 60s | 3000+ | 10-30 accounts |

## 🔗 Links

- Full Docs: `SHERLOCK_INTEGRATION.md`
- Sherlock GitHub: https://github.com/sherlock-project/sherlock
- Maigret GitHub: https://github.com/soxoj/maigret

## ✅ Success Indicators

After setup, you should see:
1. ✅ `sherlock --version` works
2. ✅ `maigret --version` works
3. ✅ `/api/sherlock` returns tools_available: true
4. ✅ Deep Scan shows "Searching 400+ networks with Sherlock..." message
5. ✅ Accounts appear with "via Sherlock" badge in results

---

**Need Help?** Check `SHERLOCK_INTEGRATION.md` for detailed troubleshooting.
