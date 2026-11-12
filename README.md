# HESHAN OFC – Media Downloader (v2.0)

Next.js 15 + MongoDB. YouTube, TikTok, Instagram, Facebook, Spotify, Pinterest, X, WhatsApp DP + Music Hub.

## Setup
```bash
cp .env.example .env.local     # fill in the values
npm install
npm run dev                    # http://localhost:3000
```

## Environment variables (also add in Vercel → Settings → Environment Variables)
| Name | Purpose |
|---|---|
| `MONGODB_URI` | Live users + download stats (optional – site works without it, shows "Database Offline") |
| `CHAMINDU_API_KEY` | Downloader API key (**required**) |
| `CHAMINDU_API_BASE` | Defaults to `https://api.chamindu.site/api/v1` |
| `APP_SECRET` | Long random string used to encrypt temporary download links |

## Structure
```
app/            pages + API routes (download, stream, stats) + /music
components/     Nav, LiveStats, CompactProgress, ResultCard
hooks/          useDownloader (shared progress logic)
lib/            mongodb, vault (AES-256-GCM links), extract (finds the real media URL)
models/         Mongoose models
config/         platform list + auto-detect
```
# HESHAN-X-APP
