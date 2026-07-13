# Deployment Guide — LeadForge AI

This document explains why you may see 502 errors when deploying, and how to choose the right platform + configuration.

---

## Why you get 502s

A 502 Bad Gateway means **a proxy between the user and the app gave up waiting for a response**. LeadForge's scrape requests legitimately take 5–90 seconds (Playwright launches a browser, scrape.do routes through residential proxies, website enrichment visits each official site). Most hosting platforms kill requests long before that.

There are **5 timeout layers** between the user and the target website:

```
Browser
  ↓ ① Edge/CDN platform timeout
Caddy gateway (sandbox) OR platform load balancer
  ↓ ② Gateway/proxy timeout
Next.js route handler (/api/scrape)
  ↓ ③ Function execution timeout (platform-specific)
scrape.do API
  ↓ ④ scrape.do internal timeout (~20-30s per request)
Target site (IndiaMART, Google Maps, etc.)
```

If **any** of these fires, the user sees a 502.

---

## Platform timeout reference

| Platform | Default function timeout | SSE support | Will LeadForge work? |
|---|---|---|---|
| **Vercel Hobby** | 10s | ❌ Buffered | ❌ No — scrapes take 5-90s |
| **Vercel Pro** | 60s (300s with Fluid Compute) | ⚠️ Partial | ⚠️ Only small batches |
| **Vercel Enterprise** | 300s | ⚠️ Partial | ⚠️ Most scrapes work |
| **Netlify Functions** | 10s | ❌ Buffered | ❌ No |
| **Cloudflare Pages Functions** | 30s | ❌ Buffered | ❌ No |
| **Cloudflare Workers** | 30s (paid) | ❌ | ❌ No |
| **Railway** | No limit (configurable) | ✅ Pass-through | ✅ **Yes** |
| **Render** | No limit on web services | ✅ Pass-through | ✅ **Yes** |
| **Fly.io** | No limit | ✅ Pass-through | ✅ **Yes** |
| **Self-hosted VPS** (DigitalOcean, Hetzner, etc.) | None | ✅ | ✅ **Yes** |
| **This sandbox** (Caddy → Next.js :3000) | None | ✅ | ✅ Works here |

### The short version

- **Vercel / Netlify / Cloudflare Pages**: will NOT work reliably for scraping. They're designed for fast request/response cycles, not long-running scrapers.
- **Railway / Render / Fly.io / self-hosted VPS**: work great. They let you run a long-lived Node process with no arbitrary function timeout.

---

## Recommended deployment: Railway

1. Push your repo to GitHub (already done)
2. Go to https://railway.app/new → "Deploy from GitHub repo"
3. Select your `Projects` repo
4. Railway auto-detects Next.js — set:
   - **Build command**: `bun install && bun run build`
   - **Start command**: `bun run start`
   - Or use the included `Dockerfile` (recommended — see below)
5. Add environment variables:
   - `SCRAPE_DO_TOKEN` = your scrape.do token
6. Deploy. Railway gives you a free `*.up.railway.app` URL with no function timeouts.

### Why Railway works
- No SSE buffering (passes streaming responses through unchanged)
- No function execution timeout (your Next.js server runs as a long-lived process)
- Free tier: 500 hours/month, $5 credit, no credit card required to start

---

## Alternative: Docker on any VPS

A `Dockerfile` is included. Build and run on any Linux server:

```bash
docker build -t leadforge .
docker run -p 3000:3000 -e SCRAPE_DO_TOKEN=your_token leadforge
```

Then put Caddy/Nginx in front:

```caddyfile
leadforge.yourdomain.com {
    reverse_proxy localhost:3000
    # No timeout — let scrapes run as long as needed
    {
        flush_interval -1  # Critical for SSE pass-through
    }
}
```

The `flush_interval -1` is critical — it disables Caddy's response buffering so SSE events stream through immediately.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `SCRAPE_DO_TOKEN` | Yes | Your scrape.do API token for IndiaMART/TradeIndia/website enrichment |
| `PORT` | No | Defaults to 3000 |

The token is currently hardcoded in `src/lib/scrapers-scrapedo.ts` for the demo. Before deploying, move it to an env var:

```ts
const SCRAPE_DO_TOKEN = process.env.SCRAPE_DO_TOKEN || "fallback_for_dev";
```

---

## What I've already done to minimize 502s

1. **scrape.do retries (3x with backoff)** — handles transient 503/502/429 from scrape.do or the target site
2. **20s per-request timeout** — prevents one slow fetch from blocking the whole scrape
3. **Parallel website enrichment** (batches of 3) — 3x faster than the previous sequential approach
4. **Client-side watchdog** — if no SSE event arrives for 90s, the UI shows a clear error instead of hanging forever
5. **Friendly 502 error message** — when the gateway times out, the user sees "gateway timeout — the scrape took too long; try fewer leads" instead of a generic error
6. **Default batch sizes kept small** — 5–10 leads per scrape by default
7. **maxDuration set to 600s** on the route — for platforms that respect it

---

## What still won't work on Vercel/Netlify

Even with all the above, **Vercel Hobby (10s) and Netlify (10s) will hard-kill the route** before any scrape completes. This is a platform limitation, not a code issue. The only fixes are:

1. Move to a platform without function timeouts (Railway, Render, Fly.io, VPS)
2. OR rewrite the scraper to use a job queue (BullMQ + Redis, as the PRD specified):
   - POST /api/scrape → returns jobId immediately (1s)
   - Background worker does the actual scraping
   - Client polls GET /api/scrape/:jobId for status
   - This works on Vercel because each HTTP request is fast

Option 2 is the "right" production architecture but requires Redis. Option 1 is much simpler and works fine for a single-user tool.

---

## Quick sanity check before deploying

```bash
# Should return 200 in under 1s
curl -sS -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" https://your-app.example.com/

# Should stream SSE events for ~10-30s and return 200
curl -sS -N -X POST https://your-app.example.com/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"query":"restaurant","city":"Mumbai","state":"Maharashtra","country":"India","count":3,"industry":"Restaurants","source":"indiamart","enrichWebsites":false}' \
  --max-time 60
```

If the second command returns 502 within ~30s, your platform is killing the function. Switch to Railway/Render/Fly.io.
