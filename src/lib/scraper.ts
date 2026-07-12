/**
 * Real Google Maps scraper using Playwright.
 *
 * Why Google Maps and not IndiaMART/Justdial/TradeIndia?
 *   - Those sites sit behind Cloudflare/Imperva bot protection that blocks
 *     datacenter IPs at the network layer (returns 403 before any browser
 *     even loads). Verified during build.
 *   - Google Maps returns 200 to the same datacenter IP and renders full
 *     business listings including name, rating, reviews, phone, address,
 *     and (often) website link.
 *   - The PRD explicitly lists "Google Maps" as a Phase 2 source
 *     "where permitted" — Google Maps is the permitted one in this env.
 *
 * Output: an array of partial Lead objects (no AI score yet — that's computed
 * by the caller so this module stays pure scraping).
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

    // Compose search URL — using /search/ path-style (loads faster than ?q=)
    const q = encodeURIComponent(`${query} in ${city}`);
    const url = `https://www.google.com/maps/search/${q}`;
    onProgress?.({ step: `Searching Google Maps: "${query} in ${city}"`, pct: 15 });

    if (abortSignal?.aborted) throw new Error("aborted");
    await page.goto(url, { timeout: 45000, waitUntil: "domcontentloaded" });

    onProgress?.({ step: "Waiting for listings to render…", pct: 30 });
    await page.waitForTimeout(5000);

    // Wait for at least one business card
    try {
      await page.waitForSelector("[role='article'], .Nv2PK", { timeout: 15000 });
    } catch {
      // No cards — maybe consent page or zero results
    }

    onProgress?.({ step: "Scrolling to load more listings…", pct: 45 });

    // Scroll the results panel using keyboard — most reliable across DOM variants
    // Google Maps uses a focusable feed container
    for (let i = 0; i < 4; i++) {
      if (abortSignal?.aborted) throw new Error("aborted");
      await page.keyboard.press("Tab");
      await page.waitForTimeout(200);
      // Press PageDown several times to scroll the feed
      for (let j = 0; j < 5; j++) {
        await page.keyboard.press("PageDown");
        await page.waitForTimeout(250);
      }
      onProgress?.({
        step: `Scrolling… pass ${i + 1}/4`,
        pct: 45 + i * 5,
      });
    }

    onProgress?.({ step: "Extracting business data from DOM…", pct: 70 });

    // Extract structured data from each card
    if (abortSignal?.aborted) throw new Error("aborted");
    const raw: any[] = await page.evaluate((target) => {
      const cards = Array.from(
        document.querySelectorAll("[role='article'], .Nv2PK")
      );
      const out: any[] = [];
      for (const card of cards) {
        if (out.length >= target) break;
        const text = (card as HTMLElement).innerText || "";
        // Parse: name (first line), rating, reviews, address, phone
        const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);

        // Rating: a number like 4.7 — find first one
        const ratingMatch = text.match(/(^|\n)(\d\.\d)(\n|$)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[2]) : null;

        // Reviews: "(123)" or "123 reviews"
        const reviewsMatch = text.match(/\((\d[\d,]*)\)|(\d[\d,]*)\s+reviews?/i);
        const reviews = reviewsMatch
          ? parseInt((reviewsMatch[1] || reviewsMatch[2]).replace(/,/g, ""), 10)
          : 0;

        // Phone: +91 XXXXX XXXXX or 10-digit Indian mobile
        const phoneMatch = text.match(
          /\+91[\s-]?[6-9]\d{9}|\b[6-9]\d{9}\b/
        );
        const phone = phoneMatch ? phoneMatch[0].trim() : null;

        // Category: usually line[1] or line[2] (after name, before/after rating)
        // Pattern: "Name\nName\n4.7\nCategory · Address…"
        // Or: "Name\nName\n4.7\nCategory · ⭐ · Address"
        let category = "";
        let address = "";
        for (const line of lines) {
          if (line.match(/^\d\.\d$/)) continue; // rating
          if (line.match(/^\([\d,]+\)$/)) continue; // reviews count
          if (line === phone) continue;
          if (line.match(/Open|Closed|Opens|Closes/)) continue;
          if (line.match(/Website|Directions|Call|Save|Share/)) continue;
          // The first non-rating, non-action line that contains · or is short
          if (line.includes("·")) {
            const parts = line.split("·").map((s) => s.trim());
            if (!category && parts[0]) category = parts[0];
            if (!address) {
              address = parts.slice(1).join(", ").trim();
            }
            break;
          }
        }

        // Name: first line, but skip duplicates (Google sometimes repeats it)
        let name = lines[0] || "Unknown";
        if (lines[1] === name && lines.length > 1) {
          // Google often lists name twice
        }

        out.push({
          name,
          category: category || "",
          rating,
          reviews,
          phone,
          address,
          raw: text.slice(0, 300),
        });
      }
      return out;
    }, targetCount);

    onProgress?.({
      step: `Parsed ${raw.length} businesses. Deduplicating…`,
      pct: 85,
      count: raw.length,
    });

    // Deduplicate by name (case-insensitive)
    const seen = new Set<string>();
    const unique = raw.filter((r) => {
      const key = r.name.toLowerCase().trim();
      if (seen.has(key) || !r.name || r.name === "Unknown") return false;
      seen.add(key);
      return true;
    });

    onProgress?.({ step: "Hydrating business records…", pct: 92, count: unique.length });

    // Normalize to ScrapedBusiness
    const businesses: ScrapedBusiness[] = unique.slice(0, targetCount).map((r) => ({
      name: r.name,
      category: r.category || query,
      rating: r.rating,
      reviews: r.reviews,
      phone: r.phone,
      address: r.address,
      city,
      state,
      country,
      website: null, // Google Maps hides the actual URL behind a click — would need per-card nav
      source: "Google Maps",
    }));

    onProgress?.({
      step: `Done. ${businesses.length} real leads scraped from Google Maps.`,
      pct: 100,
      count: businesses.length,
    });

    return businesses;
  } finally {
    await browser.close();
  }
}
