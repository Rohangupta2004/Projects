/**
 * Real Google Maps scraper using Playwright.
 *
 * Why Google Maps and not IndiaMART/Justdial/TradeIndia?
 *   - Those sites sit behind Cloudflare/Imperva bot protection that blocks
 *     datacenter IPs at the network layer (returns 403 before any browser
 *     even loads). Verified during build.
 *   - Google Maps returns 200 to the same datacenter IP and renders full
 *     business listings including name, rating, reviews, phone, address,
 *     and website link.
 *
 * Strategy: scrape the results list for place URLs + basic info, then visit
 * each place's detail page to get the phone number, real review count, and
 * real website URL (Google Maps cards hide these behind a click).
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

const GOOGLE_DOMAINS = [
  "google.com",
  "google.co",
  "maps.apple",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "youtube.com",
  "wa.me",
  "whatsapp.com",
];

function isRealWebsite(url: string): boolean {
  if (!url || !url.startsWith("http")) return false;
  const lower = url.toLowerCase();
  if (lower.includes("google.com/maps")) return false;
  for (const d of GOOGLE_DOMAINS) {
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

    // Compose search URL — using /search/ path-style (loads faster than ?q=)
    const q = encodeURIComponent(`${query} in ${city}`);
    const url = `https://www.google.com/maps/search/${q}`;
    onProgress?.({ step: `Searching Google Maps: "${query} in ${city}"`, pct: 10 });

    if (abortSignal?.aborted) throw new Error("aborted");
    await page.goto(url, { timeout: 45000, waitUntil: "domcontentloaded" });

    onProgress?.({ step: "Waiting for listings to render…", pct: 20 });
    await page.waitForTimeout(5000);

    // Wait for at least one business card
    try {
      await page.waitForSelector("[role='article'], .Nv2PK", { timeout: 15000 });
    } catch {
      // No cards — maybe consent page or zero results
    }

    onProgress?.({ step: "Scrolling to load more listings…", pct: 30 });

    // Scroll the results panel using keyboard
    for (let i = 0; i < 3; i++) {
      if (abortSignal?.aborted) throw new Error("aborted");
      await page.keyboard.press("Tab");
      await page.waitForTimeout(150);
      for (let j = 0; j < 5; j++) {
        await page.keyboard.press("PageDown");
        await page.waitForTimeout(200);
      }
      onProgress?.({ step: `Scrolling… pass ${i + 1}/3`, pct: 30 + i * 4 });
    }

    onProgress?.({ step: "Extracting place URLs from results…", pct: 45 });

    // Extract place URLs + basic card data
    if (abortSignal?.aborted) throw new Error("aborted");
    const cards: any[] = await page.evaluate((target) => {
      const out: any[] = [];
      const nodes = document.querySelectorAll("[role='article'], .Nv2PK");
      for (const node of nodes) {
        if (out.length >= target) break;
        const text = (node as HTMLElement).innerText || "";
        const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
        const name = lines[0] || "";
        if (!name || name === "Unknown") continue;

        // Find the place detail link
        const titleLink = node.querySelector("a[href*='/maps/place/'], a[href*='/maps/place%2F']");
        const placeUrl = titleLink ? titleLink.getAttribute("href") : null;

        // Initial parse of rating/reviews from card text
        const ratingMatch = text.match(/(^|\n)(\d\.\d)(\n|$)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[2]) : null;

        out.push({
          name,
          placeUrl,
          rating,
          rawText: text.slice(0, 400),
        });
      }
      return out;
    }, targetCount + 5); // grab a few extra in case some fail

    onProgress?.({
      step: `Got ${cards.length} place URLs. Visiting each for full details…`,
      pct: 50,
      count: cards.length,
    });

    // Visit each place page to extract phone, reviews, website
    const businesses: ScrapedBusiness[] = [];
    for (let i = 0; i < cards.length; i++) {
      if (abortSignal?.aborted) throw new Error("aborted");
      if (businesses.length >= targetCount) break;

      const card = cards[i];
      if (!card.placeUrl) {
        // Skip cards without a place URL
        continue;
      }

      const pct = 50 + Math.round(((i + 1) / cards.length) * 40);
      onProgress?.({
        step: `Visiting place ${i + 1}/${cards.length} — ${card.name.slice(0, 40)}…`,
        pct,
        count: businesses.length,
      });

      try {
        const detail = await visitPlacePage(context, card.placeUrl, card.name);
        if (detail) {
          businesses.push({
            name: card.name,
            category: detail.category || query,
            rating: card.rating ?? detail.rating,
            reviews: detail.reviews,
            phone: detail.phone,
            address: detail.address,
            city,
            state,
            country,
            website: detail.website,
            source: "Google Maps",
          });
        }
      } catch {
        // Skip on error — keep what we have
      }
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

/**
 * Visit a Google Maps place page and extract the full info panel.
 * Place pages have: name, rating, review count, phone, website, address.
 */
async function visitPlacePage(
  context: any,
  placeUrl: string,
  fallbackName: string
): Promise<{
  category: string;
  rating: number | null;
  reviews: number;
  phone: string | null;
  address: string | null;
  website: string | null;
} | null> {
  const page = await context.newPage();
  try {
    await page.goto(placeUrl, { timeout: 25000, waitUntil: "domcontentloaded" });
    // Wait for the info panel to render
    await page.waitForTimeout(3000);

    // Wait for the action bar (Website/Call/Directions buttons)
    try {
      await page.waitForSelector("button[aria-label], a[aria-label]", { timeout: 8000 });
    } catch {
      // proceed anyway
    }

    const data = await page.evaluate(() => {
      const result: any = {
        category: "",
        rating: null,
        reviews: 0,
        phone: null,
        address: null,
        website: null,
      };

      // Walk every button and link, parse by aria-label
      const actionables = Array.from(
        document.querySelectorAll("button[aria-label], a[aria-label]")
      ) as HTMLElement[];

      for (const el of actionables) {
        const label = (el.getAttribute("aria-label") || "").toLowerCase();
        const href = el.getAttribute("href") || "";

        // Website
        if (label.includes("website") && href.startsWith("http") && !result.website) {
          if (!href.includes("google.com") && !href.includes("maps.apple")) {
            result.website = href;
          }
        }
        // Phone
        if (label.includes("phone") && !result.phone) {
          // The aria-label is usually like "Phone: +91 98765 43210"
          const m = label.match(/(\+?[\d\s-]{10,})/);
          if (m) result.phone = m[1].trim();
        }
      }

      // Fallback for website: scan all <a> tags
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

      // Fallback for phone: scan page text
      if (!result.phone) {
        const text = document.body.innerText || "";
        const m = text.match(/\+91[\s-]?[6-9]\d{9}|\b[6-9]\d{9}\b/);
        if (m) result.phone = m[0].trim();
      }

      // Rating & reviews: look for "X.X" near "reviews" or "(NNN)"
      const text = document.body.innerText || "";
      const ratingMatch = text.match(/(^|\n|\s)(\d\.\d)(\s|\n|$)/);
      if (ratingMatch) result.rating = parseFloat(ratingMatch[2]);

      // Reviews: "1,234 reviews" or "(1,234)" or "1234 reviews"
      const reviewsMatch = text.match(/(\d[\d,]*)\s+reviews?/i) || text.match(/\((\d[\d,]*)\)/);
      if (reviewsMatch) {
        result.reviews = parseInt(reviewsMatch[1].replace(/,/g, ""), 10);
      }

      // Category: look for the small text right under the business name
      // Heuristic: first short line after name that's not a number or action
      const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i];
        if (line.length < 3 || line.length > 60) continue;
        if (line.match(/^\d\.\d$/)) continue;
        if (line.match(/^\(\d[\d,]*\)$/)) continue;
        if (line.match(/\d+\s+reviews?/i)) continue;
        if (line.match(/Open|Closed|Opens|Closes|·/)) continue;
        if (line.match(/Website|Directions|Call|Save|Share|Photos|Reviews|About|Menu|Hours/)) continue;
        // Skip if it's the business name (we already saw it on card)
        // Category is usually a noun phrase like "Website designer" or "Hotel"
        if (line.split(" ").length <= 5 && !line.match(/^\d/)) {
          result.category = line;
          break;
        }
      }

      // Address: look for "· <address>" or lines with street-like patterns
      const addressMatch = text.match(/·\s*([^·\n]{10,100})/);
      if (addressMatch) {
        result.address = addressMatch[1].trim();
      }

      return result;
    });

    return data;
  } finally {
    await page.close();
  }
}
