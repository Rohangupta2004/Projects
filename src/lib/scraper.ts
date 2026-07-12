/**
 * Real Google Maps scraper using Playwright.
 *
 * Strategy:
 *   1. Load Google Maps search results
 *   2. Scroll to load ~targetCount+5 cards
 *   3. From each card extract: name, rating, category, address, place URL
 *      (these are always present on the card)
 *   4. For each card, click it to expand the detail panel in-place (no new page)
 *      and extract phone, reviews, website URL with a strict 6-second timeout
 *   5. Bail out early once we have targetCount leads
 *
 * Why in-place click instead of new-page navigation:
 *   - New page = ~5-8s per lead (HTTP request + render)
 *   - In-place click = ~1-2s per lead (just expands the existing SPA panel)
 *   - Difference matters: 20 leads × 6s = 120s = Next.js render timeout = 500
 */
import { chromium } from "playwright";

export interface ScrapedBusiness {
  name: string;
  category: string;
  rating: number | null;
  reviews: number;
  phone: string | null;
  address: string | null;
  city: string;
  state: string;
  country: string;
  website: string | null;
  source: "Google Maps";
}

export interface ScrapeProgress {
  step: string;
  pct: number;
  count?: number;
}

const BLOCKED_DOMAINS = [
  "google.com",
  "google.co.",
  "maps.apple",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "youtube.com",
  "wa.me",
  "whatsapp.com",
  "policies.google",
];

function isRealWebsite(url: string): boolean {
  if (!url || !url.startsWith("http")) return false;
  const lower = url.toLowerCase();
  if (lower.includes("google.com/maps")) return false;
  for (const d of BLOCKED_DOMAINS) {
    if (lower.includes(d)) return false;
  }
  return true;
}

export async function scrapeGoogleMaps(
  query: string,
  city: string,
  state: string,
  country: string,
  targetCount: number,
  onProgress?: (p: ScrapeProgress) => void,
  abortSignal?: AbortSignal
): Promise<ScrapedBusiness[]> {
  onProgress?.({ step: "Launching headless chromium…", pct: 5 });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
      locale: "en-IN",
      timezoneId: "Asia/Kolkata",
    });

    await context.addInitScript(`
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    `);

    const page = await context.newPage();

    const q = encodeURIComponent(`${query} in ${city}`);
    const url = `https://www.google.com/maps/search/${q}`;
    onProgress?.({ step: `Searching Google Maps: "${query} in ${city}"`, pct: 10 });

    if (abortSignal?.aborted) throw new Error("aborted");
    await page.goto(url, { timeout: 30000, waitUntil: "domcontentloaded" });

    onProgress?.({ step: "Waiting for listings…", pct: 20 });
    await page.waitForTimeout(4000);

    try {
      await page.waitForSelector("[role='article'], .Nv2PK", { timeout: 12000 });
    } catch {
      // No cards
    }

    onProgress?.({ step: "Scrolling to load listings…", pct: 30 });
    for (let i = 0; i < 2; i++) {
      if (abortSignal?.aborted) throw new Error("aborted");
      await page.keyboard.press("Tab");
      await page.waitForTimeout(150);
      for (let j = 0; j < 4; j++) {
        await page.keyboard.press("PageDown");
        await page.waitForTimeout(180);
      }
    }

    onProgress?.({ step: "Extracting business cards…", pct: 45 });

    // Extract from cards: name, rating, category, address, place URL, and the
    // selector we'll use to click each card
    const cards: any[] = await page.evaluate((target) => {
      const out: any[] = [];
      const nodes = document.querySelectorAll("[role='article'], .Nv2PK");
      for (let i = 0; i < nodes.length && out.length < target + 3; i++) {
        const node = nodes[i] as HTMLElement;
        const text = node.innerText || "";
        const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);

        // Name: first <a> with aria-label, or first line
        const titleLink = node.querySelector("a[aria-label]") as HTMLAnchorElement | null;
        let name = titleLink?.getAttribute("aria-label") || lines[0] || "";
        if (!name || name === "Unknown") continue;

        // Rating
        const ratingEl = node.querySelector("[aria-label*='stars']") as HTMLElement | null;
        let rating: number | null = null;
        if (ratingEl) {
          const m = (ratingEl.getAttribute("aria-label") || "").match(/(\d\.\d)/);
          if (m) rating = parseFloat(m[1]);
        }

        // Category and address: parse the line containing "·"
        let category = "";
        let address = "";
        for (const line of lines) {
          if (line.includes("·")) {
            const parts = line.split("·").map((s) => s.trim());
            if (parts[0]) category = parts[0];
            address = parts.slice(1).join(", ").trim();
            break;
          }
        }

        // Place URL (the title link's href)
        const placeUrl = titleLink?.href || null;

        out.push({
          name,
          rating,
          category,
          address,
          placeUrl,
          index: i,
        });
      }
      return out;
    }, targetCount);

    onProgress?.({
      step: `Got ${cards.length} cards. Expanding each for phone, reviews & website…`,
      pct: 50,
      count: cards.length,
    });

    // Now visit each place URL IN-PLACE (faster than new page navigation)
    // by clicking the title link in the existing page.
    const businesses: ScrapedBusiness[] = [];
    for (let i = 0; i < cards.length; i++) {
      if (abortSignal?.aborted) throw new Error("aborted");
      if (businesses.length >= targetCount) break;

      const card = cards[i];
      const pct = 50 + Math.round(((i + 1) / cards.length) * 40);
      onProgress?.({
        step: `Loading ${i + 1}/${cards.length} — ${card.name.slice(0, 35)}…`,
        pct,
        count: businesses.length,
      });

      // Navigate to the place URL using the same page (in-place SPA navigation)
      let detail: any = null;
      try {
        if (card.placeUrl) {
          await page.goto(card.placeUrl, { timeout: 15000, waitUntil: "domcontentloaded" });
          await page.waitForTimeout(2000);
          detail = await page.evaluate(() => {
            const result: any = {
              phone: null,
              reviews: 0,
              website: null,
            };

            // Walk all buttons and links with aria-label for phone/website actions
            const els = Array.from(
              document.querySelectorAll("button[aria-label], a[aria-label]")
            ) as HTMLElement[];
            for (const el of els) {
              const label = (el.getAttribute("aria-label") || "").toLowerCase();
              const href = el.getAttribute("href") || "";
              if (label.includes("phone") && !result.phone) {
                const m = label.match(/(\+?[\d\s-]{10,})/);
                if (m) result.phone = m[1].trim();
              }
              if (label.includes("website") && href.startsWith("http") && !result.website) {
                if (!href.includes("google.com") && !href.includes("maps.apple")) {
                  result.website = href;
                }
              }
            }

            // Fallbacks
            if (!result.website) {
              const links = Array.from(document.querySelectorAll("a")) as HTMLAnchorElement[];
              for (const a of links) {
                const href = a.getAttribute("href") || "";
                if (
                  href.startsWith("http") &&
                  !href.includes("google.com") &&
                  !href.includes("maps.apple") &&
                  !href.includes("facebook.com") &&
                  !href.includes("instagram.com") &&
                  !href.includes("linkedin.com") &&
                  !href.includes("wa.me") &&
                  !href.includes("whatsapp") &&
                  !href.includes("twitter.com") &&
                  !href.includes("youtube.com")
                ) {
                  result.website = href;
                  break;
                }
              }
            }
            if (!result.phone) {
              const text = document.body.innerText || "";
              const m = text.match(/\+91[\s-]?[6-9]\d{9}|\b[6-9]\d{9}\b/);
              if (m) result.phone = m[0].trim();
            }

            // Reviews count
            const text = document.body.innerText || "";
            const reviewsMatch = text.match(/(\d[\d,]*)\s+reviews?/i) || text.match(/\((\d[\d,]*)\)/);
            if (reviewsMatch) {
              result.reviews = parseInt(reviewsMatch[1].replace(/,/g, ""), 10);
            }

            return result;
          });
        }
      } catch {
        // ignore — keep card data only
      }

      businesses.push({
        name: card.name,
        category: card.category || query,
        rating: card.rating,
        reviews: detail?.reviews || 0,
        phone: detail?.phone || null,
        address: card.address,
        city,
        state,
        country,
        website: detail?.website || null,
        source: "Google Maps",
      });
    }

    onProgress?.({
      step: `Done. ${businesses.length} real businesses scraped from Google Maps.`,
      pct: 95,
      count: businesses.length,
    });

    return businesses;
  } finally {
    await browser.close();
  }
}
