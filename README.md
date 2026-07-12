# LeadForge AI

**AI Lead Finder for Web Agencies** — automatically discover Indian businesses that need a website, score them with AI, and generate personalized outreach in one click.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Zustand, and Recharts.

---

## Why

Freelancers & web agencies waste hours every week:

- Searching Google Maps / IndiaMART / Justdial
- Checking if a website exists
- Finding phone numbers & emails
- Removing duplicates
- Creating outreach lists

**LeadForge AI automates all of it** and adds a unique twist: a *Website Revenue Potential Score* that estimates how much a business can afford to pay for a website.

---

## Features

### 1. Lead Generation Workflow
Cascading filters: **Industry → Country → State → City → Generate**.
Live scraper activity log simulates pulling from 6 Indian directories (IndiaMART, Justdial, TradeIndia, ExportersIndia, Google Maps, MSME Directory) through a 9-step pipeline:

> Collect → Phone → Email → Website → AI Visits → Score → Reviews → Social → Report

### 2. AI Priority Score (0–100 + ★ rating)
Each business gets an AI score based on:
- Website status (none / old / broken / modern)
- Google rating & review count
- Social media activity
- Industry signals

Example output:
> *"Owner has no website. Google rating 4.8, 120 reviews. Very active on Facebook. Likely to buy a website. Priority: ★★★★★"*

### 3. Website Revenue Potential Score (unique)
Instead of just flagging businesses without websites, LeadForge estimates **how much the project is worth** — factoring in industry baseline, city market rates, review count (establishment signal), and existing web spend. Tiered as Low / Medium / High / Premium with ₹ value.

### 4. Website Score Breakdown
For businesses with existing sites, AI scores four dimensions 0–100: **Speed · Design · SEO · Mobile**.

### 5. Leads Database
Searchable / filterable / sortable table of every scraped business with:
- Business name, category, source
- Phone, email, website, socials (FB / IG / LinkedIn)
- City / state / country
- Google rating & review count
- AI score + revenue tier
- CRM status badge

Filters: industry, website status, CRM status, review range, quick toggles for "No Website" / "Old Website" / "Hot Leads".

### 6. Lead Detail Panel (slide-over)
Click any lead to open a rich detail view with:
- AI Priority Score + ★ rating
- Website Revenue Potential Score (with reasoning)
- Website Score Breakdown (4 metrics + bars)
- AI Recommendation narrative
- Full contact information (with copy-to-clipboard)
- Google rating block

### 7. Outreach Generator (1-click)
Auto-generates 4 personalized scripts based on the lead's specific signals:
- **WhatsApp** — short pitch message
- **Email** — subject + body
- **Cold Call** — opener / hook / pitch / close script
- **LinkedIn** — connection request note

Each script references the lead's actual rating, review count, city, website status, and industry.

### 8. Sales Pipeline (Kanban CRM)
8 stages: New → Called → Interested → Meeting → Proposal Sent → Won / Lost / Follow Up.
Inline status changer on each card. Summary KPIs: total leads, won value, conversion rate, avg. cycle.

### 9. Dashboard
- 6 KPI cards: Leads Today, No Website, Bad Website, Hot Leads, Calls Made, Meetings
- Pipeline value banner (₹ potential across all leads)
- 7-day lead/contact trend (area chart)
- Website status pie chart
- Industry distribution (horizontal bar)
- Top 6 hot leads list
- CRM funnel strip

### 10. Polish
- Fully responsive (mobile sidebar, adaptive tables)
- Light / dark mode toggle
- Realistic mock data: 144 seeded Indian businesses across 8 cities & 10 industries
- Emerald/teal brand palette (no default indigo/blue)

---

## Tech Stack (from PRD vs. implemented)

| Layer | PRD spec | Implementation |
|---|---|---|
| Frontend | React + Expo | **Next.js 16 + React 19** (web-first; Expo would be the mobile wrap) |
| Backend | Supabase | Mock data layer in Zustand (ready to swap for Supabase) |
| Scraper | Playwright | Simulated scraping animation (real Playwright would run server-side) |
| Queue | BullMQ + Redis | N/A in demo |
| AI | OpenAI / Gemini | Heuristic AI scoring (drop-in replaceable with LLM call) |
| Storage | Supabase | Local state |
| Maps | Google Places API | Mock ratings/reviews |
| Scheduler | Cron | N/A |

The scoring & outreach logic is intentionally isolated in `src/lib/leads-data.ts` so each heuristic can be replaced with a real API call without touching the UI.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout, metadata, fonts
│   └── page.tsx             # App shell: sidebar + topbar + view switcher + detail panel
├── components/
│   ├── dashboard.tsx        # KPIs, charts, hot leads, CRM funnel
│   ├── generate-leads.tsx   # Cascading filters + live scraper log
│   ├── leads-view.tsx       # Filterable/sortable/paginated leads table
│   ├── lead-detail-panel.tsx# Slide-over: AI score, revenue potential, outreach
│   └── pipeline-view.tsx    # Kanban CRM with 8 stages
├── lib/
│   ├── types.ts             # Lead, Industry, LeadStatus, etc.
│   ├── leads-data.ts        # Mock generator + AI scoring + revenue logic
│   └── store.ts             # Zustand store (leads, filters, generation)
└── components/ui/           # shadcn/ui primitives
```

---

## Getting Started

```bash
bun install
bun run dev        # http://localhost:3000
bun run lint       # ESLint
bun run db:push    # If you wire up Prisma
```

---

## Roadmap (production hooks)

- [ ] Swap mock generator for real Playwright scrapers (IndiaMART / Justdial / TradeIndia / ExportersIndia)
- [ ] Wire Zustand store to Supabase tables
- [ ] Replace heuristic AI score with OpenAI/Gemini call (prompt in `leads-data.ts:genAiScore`)
- [ ] Real Google Places API for ratings & reviews
- [ ] BullMQ + Redis queue for parallel scraping
- [ ] Export to CSV / Google Sheets
- [ ] Auth + multi-tenant agencies

---

## License
MIT — built as a PRD prototype.
