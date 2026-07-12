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
        let category = "";
        let address = "";
        for (const line of lines) {
          if (line.match(/^\d\.\d$/)) continue;
          if (line.match(/^\([\d,]+\)$/)) continue;
          if (line === phone) continue;
          if (line.match(/Open|Closed|Opens|Closes/)) continue;
          if (line.match(/Website|Directions|Call|Save|Share/)) continue;
          if (line.includes("·")) {
            const parts = line.split("·").map((s) => s.trim());
            if (!category && parts[0]) category = parts[0];
            if (!address) {
              address = parts.slice(1).join(", ").trim();
            }
            break;
          }
        }

        // Name: first line
        let name = lines[0] || "Unknown";

        // Website link: find an <a> with aria-label containing "Website"
        // Google Maps cards have a "Website" action button linking to the business's site
        let website: string | null = null;
        const links = Array.from(card.querySelectorAll("a"));
        for (const a of links) {
          const label = (a.getAttribute("aria-label") || "") as string;
          const href = a.getAttribute("href") || "";
          if (label.toLowerCase().includes("website") && href.startsWith("http")) {
            website = href;
            break;
          }
        }
        // Fallback: any external link that's not google.com/maps
        if (!website) {
          for (const a of links) {
            const href = a.getAttribute("href") || "";
            if (
              href.startsWith("http") &&
              !href.includes("google.com") &&
              !href.includes("maps.apple") &&
              !href.includes("facebook.com") &&
              !href.includes("instagram.com") &&
              !href.includes("linkedin.com")
            ) {
              website = href;
              break;
            }
          }
        }

        // Place detail URL (for visiting later if needed)
        let placeUrl: string | null = null;
        const titleLink = card.querySelector("a[href*='/maps/place/']");
        if (titleLink) {
          placeUrl = titleLink.getAttribute("href");
        }

        out.push({
          name,
          category: category || "",
          rating,
          reviews,
          phone,
          address,
          website,
          placeUrl,
          raw: text.slice(0, 300),
        });
      }
      return out;
    }, targetCount);

    onProgress?.({
      step: `Parsed ${raw.length} businesses. Visiting detail pages for website & social data…`,
      pct: 78,
      count: raw.length,
    });

    // Visit each business's place page to grab website + social links if missing
    // Google Maps place pages have an info panel with "Website", "Facebook", etc.
    for (let i = 0; i < raw.length; i++) {
      if (abortSignal?.aborted) throw new Error("aborted");
      const r = raw[i];
      // Skip if we already have a website from the card
      if (r.website) continue;
      if (!r.placeUrl) continue;

      try {
        const placePage = await context.newPage();
        await placePage.goto(r.placeUrl, { timeout: 20000, wait_until: "domcontentloaded" });
        await placePage.waitForTimeout(2500);

        // Look for the website link on the place page
        const websiteFromPlace = await placePage.evaluate(() => {
          const links = Array.from(document.querySelectorAll("a"));
          for (const a of links) {
            const label = (a.getAttribute("aria-label") || "") as string;
            const href = a.getAttribute("href") || "";
            if (label.toLowerCase().includes("website") && href.startsWith("http") && !href.includes("google.com")) {
              return href;
            }
          }
          // Fallback: any external non-google link in the info panel
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
              !href.includes("whatsapp")
            ) {
              return href;
            }
          }
          return null;
        });

        if (websiteFromPlace) {
          r.website = websiteFromPlace;
        }

        await placePage.close();
        onProgress?.({
          step: `Visited ${i + 1}/${raw.length} place pages…`,
          pct: 78 + Math.round(((i + 1) / raw.length) * 12),
        });
      } catch {
        // Skip on error — keep what we have
      }
    }

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
      website: r.website || null, // real website URL if found, else null
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
