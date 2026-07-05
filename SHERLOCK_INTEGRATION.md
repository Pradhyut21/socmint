# Sherlock/Maigret OSINT Integration

This SOCMINT platform now integrates **Sherlock** and **Maigret** to search usernames across **400-3000+ social networks** automatically.

## 🚀 Quick Start

### Prerequisites
1. **Python 3.x** must be installed and in your system PATH
2. **pip** (Python package manager) must be available

### Installation

#### Option 1: Automatic (Recommended)
1. Navigate to your investigation page
2. Look for the **"Sherlock/Maigret Setup"** card in settings/toolkit
3. Click **"Install Tools"** button
4. Wait for installation to complete (~2-3 minutes)

#### Option 2: Manual Installation
```bash
# Install Sherlock (400+ social networks)
pip install sherlock-project

# Install Maigret (3000+ social networks, advanced)
pip install maigret
```

### Verify Installation
```bash
sherlock --version
maigret --version
```

## 📋 Features

### Two Search Modes

#### 1. **Quick Scan** (Sherlock)
- **Sites**: 400+ social networks
- **Duration**: ~30 seconds
- **Use Case**: Fast username discovery
- **Automatically runs in**: Deep Scan mode only

#### 2. **Deep Scan** (Maigret)
- **Sites**: 3000+ social networks
- **Duration**: ~60 seconds
- **Use Case**: Comprehensive OSINT investigation
- **Manually triggered**: Via API or toolkit

### Supported Platforms (Partial List)

**Major Networks**:
- GitHub, GitLab, Reddit, LinkedIn, Instagram, YouTube
- Twitter/X, Facebook, TikTok, Snapchat, Pinterest
- Medium, Tumblr, Telegram, Quora, SoundCloud

**Developer Platforms**:
- Stack Overflow, Dev.to, HackerNews, CodePen
- GitLab, Bitbucket, SourceForge

**Regional & Niche**:
- VKontakte (VK), Weibo, Baidu, QQ
- Mastodon, Pixiv, Steam, Twitch
- 3000+ more in Maigret mode

## 🔧 Usage

### Automatic Integration
When you run a **Deep Scan** investigation on a username:
1. Regular platform checks run first (GitHub, LinkedIn, Instagram, etc.)
2. Sherlock automatically searches 400+ additional networks
3. Results are streamed live to the UI
4. All accounts appear in the final profile

### Manual API Usage

#### Check Tool Status
```bash
GET /api/sherlock
```

Response:
```json
{
  "success": true,
  "tools_available": {
    "sherlock": true,
    "maigret": true
  }
}
```

#### Install Tools
```bash
POST /api/sherlock
Content-Type: application/json

{
  "action": "install"
}
```

#### Search Username
```bash
POST /api/sherlock
Content-Type: application/json

{
  "action": "search",
  "username": "targetuser",
  "mode": "quick"  // or "deep"
}
```

### TypeScript/JavaScript Usage

```typescript
import { searchWithSherlock, checkSherlockTools } from '@/lib/fetchers/sherlockFetcher';

// Check if tools are installed
const tools = await checkSherlockTools();
console.log(tools); // { sherlock: true, maigret: false }

// Search username
const accounts = await searchWithSherlock('targetuser', 'quick', new Date().toISOString());
console.log(`Found ${accounts.length} accounts`);
```

## 📊 Output Format

Each found account includes:
```typescript
{
  platform: string;           // "github", "reddit", etc.
  username: string;           // "targetuser"
  profileUrl: string;         // Full profile URL
  displayName: string;        // Display name
  bio: string;                // Description
  confidence: "PROBABLE";     // Confidence level
  reason: string;             // Discovery method
  capturedAt: string;         // ISO timestamp
}
```

## ⚙️ Configuration

### Timeouts
- **Quick Scan (Sherlock)**: 40 seconds (30s search + 10s buffer)
- **Deep Scan (Maigret)**: 80 seconds (60s search + 20s buffer)

### Platform Normalization
Sherlock/Maigret platform names are automatically normalized to match our internal platform schema:
- `GitHub` → `github`
- `Reddit` → `reddit`
- `Instagram` → `instagram`
- Unknown platforms retain original name (lowercase)

## 🛠️ Troubleshooting

### "Python not found" Error
**Solution**: Install Python 3.x and ensure it's in your system PATH
```bash
# Windows
python --version

# Mac/Linux
python3 --version
```

### "Sherlock not found" After Installation
**Solution**: Restart your terminal/IDE and try again. If still failing:
```bash
pip install --upgrade sherlock-project
```

### Search Timeout
**Causes**:
- Slow network connection
- Too many platforms (Deep Scan)
- Python environment issues

**Solutions**:
- Use Quick Scan mode instead of Deep Scan
- Check network connectivity
- Verify Python packages are up to date

### Installation Failed
**Common causes**:
- Missing pip
- Outdated Python version (< 3.7)
- Network/firewall blocking pip

**Solution**:
```bash
# Update pip
python -m pip install --upgrade pip

# Try manual installation
pip install sherlock-project --user
pip install maigret --user
```

## 📈 Performance

### Benchmarks (Typical)
| Mode | Duration | Sites | Success Rate |
|------|----------|-------|--------------|
| Quick (Sherlock) | 25-35s | 400+ | ~15-30% |
| Deep (Maigret) | 55-70s | 3000+ | ~10-25% |

### Resource Usage
- **CPU**: Moderate (parallel HTTP requests)
- **Memory**: ~50-100MB during search
- **Network**: High (hundreds of simultaneous connections)

## 🔒 Privacy & Ethics

### Important Notes
1. **Public Data Only**: Sherlock/Maigret only check publicly accessible profiles
2. **No Authentication**: No login credentials are used or stored
3. **Rate Limiting**: Built-in delays to respect platform rate limits
4. **Legal Compliance**: Use only for authorized investigations

### Best Practices
- ✅ Use for authorized OSINT investigations
- ✅ Respect platform Terms of Service
- ✅ Document your investigation purpose
- ❌ Do not use for harassment or stalking
- ❌ Do not abuse rate limits
- ❌ Do not share results irresponsibly

## 🤝 Integration Details

### Code Structure
```
lib/fetchers/sherlockFetcher.ts   # TypeScript integration layer
lib/osint/sherlockIntegration.py  # Python wrapper for Sherlock/Maigret
app/api/sherlock/route.ts          # REST API endpoint
components/SherlockSetup.tsx       # UI setup component
```

### Data Flow
1. User initiates Deep Scan investigation
2. `liveSocmint.ts` calls `searchWithSherlock()`
3. TypeScript spawns Python subprocess
4. Python executes Sherlock/Maigret CLI
5. Results parsed and returned as JSON
6. Accounts converted to `PlatformAccount` format
7. Streamed to UI via SSE
8. Merged into final profile

## 📚 Additional Resources

- **Sherlock Documentation**: https://github.com/sherlock-project/sherlock
- **Maigret Documentation**: https://github.com/soxoj/maigret
- **OSINT Framework**: https://osintframework.com/
- **Our Platform Docs**: See `AGENTS.md`

## 🐛 Known Issues

1. **Instagram Rate Limiting**: Instagram may block Sherlock checks (expected behavior)
2. **False Positives**: Some platforms may return false positives for common usernames
3. **Platform Changes**: Social networks change URLs/structure, causing detection failures

## 📝 Changelog

### v1.0.0 (2026-07-04)
- ✨ Initial integration of Sherlock and Maigret
- ✨ Automatic tool detection and installation
- ✨ Live streaming of discovered accounts
- ✨ Deep Scan mode integration
- ✨ REST API endpoints
- ✨ Setup UI component

---

**Questions?** Check the main `README.md` or open an issue.
