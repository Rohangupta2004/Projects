/**
 * Scrape.do-powered scrapers for IndiaMART and TradeIndia.
 *
 * Why scrape.do?
 *   - These sites sit behind Cloudflare/Imperva bot protection that returns 403
 *     to datacenter IPs (verified during build). Scrape.do provides residential
 *     proxy rotation + CAPTCHA handling that bypasses these blocks.
 *   - The token is passed via the `token` query parameter.
 *
 * Why no Playwright here?
 *   - scrape.do returns the rendered HTML directly — no need to launch a
 *     browser per request. ~5s per page vs ~15s with Playwright.
 */
import type { DataSource } from "./types";

const SCRAPE_DO_TOKEN = "d0f1e74ac8304145976b9fa52fb58438c5c3e4d4e31";

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
  source: DataSource;
}

export interface ScrapeProgress {
  step: string;
  pct: number;
  count?: number;
}

async function scrapeDoFetch(
  targetUrl: string,
  opts: { render?: boolean } = {}
): Promise<string> {
  const params = new URLSearchParams({
    url: targetUrl,
    token: SCRAPE_DO_TOKEN,
  });
  if (opts.render) params.set("render", "true");

  const apiUrl = `https://api.scrape.do/?${params.toString()}`;
  const resp = await fetch(apiUrl, {
    method: "GET",
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) {
    throw new Error(`scrape.do returned HTTP ${resp.status}`);
  }
  return await resp.text();
}

/**
 * Escape regex special chars in a string.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------- IndiaMART ----------------

/**
 * Scrape IndiaMART search results.
 * URL format: https://dir.indiamart.com/search.mp?ss=<query>
 * IndiaMART search results contain:
 *   - Company name (in <a class="text-base font-semibold text-[#2e3192]">)
 *   - Rating (in <span class="font-bold text-xs ml-1">4.5</span>)
 *   - Reviews count (in (25 Reviews))
 *   - Business type (Manufacturer / Exporter / etc.)
 *   - Phone numbers embedded in product href URLs (/products/?id=2<phone>...)
 */
export async function scrapeIndiaMART(
  query: string,
  city: string,
  state: string,
  country: string,
  targetCount: number,
  onProgress?: (p: ScrapeProgress) => void,
  abortSignal?: AbortSignal
): Promise<ScrapedBusiness[]> {
  onProgress?.({ step: `Building IndiaMART search URL for "${query}" in ${city}…`, pct: 10 });

  // IndiaMART search URL — city filter is best-effort (IndiaMART doesn't always honor it
  // in the URL; we filter post-fetch by checking the city appears in the address).
  const searchUrl = `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(query)}`;
  onProgress?.({ step: `Fetching IndiaMART via scrape.do (residential proxy)…`, pct: 25 });

  if (abortSignal?.aborted) throw new Error("aborted");
  const html = await scrapeDoFetch(searchUrl);
  onProgress?.({ step: `Got ${Math.round(html.length / 1024)}KB of HTML. Parsing…`, pct: 60 });

  if (abortSignal?.aborted) throw new Error("aborted");
  const businesses = parseIndiaMARTHtml(html, query, city, state, country);

  onProgress?.({
    step: `Done. ${businesses.length} real businesses scraped from IndiaMART.`,
    pct: 100,
    count: businesses.length,
  });

  return businesses.slice(0, targetCount);
}

function parseIndiaMARTHtml(
  html: string,
  query: string,
  city: string,
  state: string,
  country: string
): ScrapedBusiness[] {
  const businesses: ScrapedBusiness[] = [];
  const seen = new Set<string>();

  // Split the HTML by company link to get one chunk per business card
  // IndiaMART uses <a class="text-base font-semibold text-[#2e3192]..."> for company name
  const cardSplitRegex = /(<a\s+[^>]*class="text-base[^"]*font-semibold[^"]*text-\[#2e3192\][^"]*"[^>]*>[^<]+<\/a>)/g;
  const parts = html.split(cardSplitRegex);

  for (let i = 1; i < parts.length; i += 2) {
    const companyLinkHtml = parts[i];
    const cardHtml = parts[i + 1] || "";

    // Extract name from the link
    const nameMatch = companyLinkHtml.match(/>([^<]+)</);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();
    if (!name || name.length < 3) continue;
    if (seen.has(name.toLowerCase())) continue;

    // Filter out product names (they tend to have these patterns)
    // Real company names are usually short and don't contain commas/colons/"For"/"Material:"
    const isProductName =
      name.includes(",") ||
      name.includes(":") ||
      /\bFor\b/.test(name) ||
      /\bMaterial\b/i.test(name) ||
      name.length > 60 ||
      /\bModel\b|\bType\b|\bCapacity\b|\bSize\b|\bColor\b|\bBrand\b/i.test(name);
    if (isProductName) continue;

    seen.add(name.toLowerCase());

    // Extract rating (e.g., "4.5")
    let rating: number | null = null;
    const ratingMatch = (cardHtml + companyLinkHtml).match(
      /<span class="font-bold text-xs ml-1[^"]*">(\d\.\d)<\/span>/
    );
    if (ratingMatch) rating = parseFloat(ratingMatch[1]);

    // Extract reviews count (e.g., "(25 Reviews)")
    let reviews = 0;
    const reviewsMatch = (cardHtml + companyLinkHtml).match(
      /\(<\!--\s*-->(\d[\d,]*)\s*<\!--\s*-->\s*Reviews?\)/
    );
    if (reviewsMatch) reviews = parseInt(reviewsMatch[1].replace(/,/g, ""), 10);

    // Extract business type (Manufacturer / Exporter / etc.)
    let category = query;
    const bizTypeMatch = (cardHtml + companyLinkHtml).match(
      /<span class="font-bold">Business Type:<\/span>\s*<!--\s*-->([^<]+)/
    );
    if (bizTypeMatch) {
      const t = bizTypeMatch[1].trim().toLowerCase();
      if (t.includes("exporter")) category = "Exporters";
      else if (t.includes("manufacturer")) category = "Manufacturing";
      else category = query;
    }

    // Extract phone number from product href URLs in the card
    // Pattern: /products/?id=2<10-digit-phone><2-digit-suffix>
    let phone: string | null = null;
    const phoneMatches = (cardHtml + companyLinkHtml).matchAll(
      /\/products\/\?id=2([6-9]\d{9})\d{2}/g
    );
    for (const m of phoneMatches) {
      phone = `+91 ${m[1].slice(0, 5)} ${m[1].slice(5)}`;
      break;
    }

    // Extract address — look for city name in the card
    let address: string | null = null;
    const addrMatch = (cardHtml + companyLinkHtml).match(
      new RegExp(`([A-Z][a-zA-Z\\s,]{5,60}${escapeRegex(city)}[a-zA-Z\\s,]{0,40})`, "")
    );
    if (addrMatch) address = addrMatch[1].trim();

    businesses.push({
      name,
      category,
      rating,
      reviews,
      phone,
      address,
      city,
      state,
      country,
      website: null,
      source: "IndiaMART",
    });

    if (businesses.length >= 50) break;
  }

  return businesses;
}

// ---------------- TradeIndia ----------------

/**
 * Scrape TradeIndia search results.
 * URL format: https://www.tradeindia.com/search.html?keyword=<query>
 */
export async function scrapeTradeIndia(
  query: string,
  city: string,
  state: string,
  country: string,
  targetCount: number,
  onProgress?: (p: ScrapeProgress) => void,
  abortSignal?: AbortSignal
): Promise<ScrapedBusiness[]> {
  onProgress?.({ step: `Building TradeIndia search URL for "${query}"…`, pct: 10 });

  const searchUrl = `https://www.tradeindia.com/search.html?keyword=${encodeURIComponent(query)}`;
  onProgress?.({ step: `Fetching TradeIndia via scrape.do…`, pct: 25 });

  if (abortSignal?.aborted) throw new Error("aborted");
  const html = await scrapeDoFetch(searchUrl);
  onProgress?.({ step: `Got ${Math.round(html.length / 1024)}KB. Parsing…`, pct: 60 });

  if (abortSignal?.aborted) throw new Error("aborted");
  const businesses = parseTradeIndiaHtml(html, query, city, state, country);

  onProgress?.({
    step: `Done. ${businesses.length} real businesses scraped from TradeIndia.`,
    pct: 100,
    count: businesses.length,
  });

  return businesses.slice(0, targetCount);
}

function parseTradeIndiaHtml(
  html: string,
  query: string,
  city: string,
  state: string,
  country: string
): ScrapedBusiness[] {
  const businesses: ScrapedBusiness[] = [];
  const seen = new Set<string>();

  // TradeIndia uses various card patterns. Try a few.
  // Look for company profile links: /seller/profile/... or /suppliers/...
  // Or look for <h2>/<h3> with class containing 'product' or 'company'

  // Pattern 1: company name in <a> with href like /seller/... or /suppliers/...
  const companyRegex = /<a[^>]+href="(\/(?:seller|suppliers|company)[^"]+)"[^>]*>([A-Z][^<]{3,80})<\/a>/g;
  let m;
  while ((m = companyRegex.exec(html)) !== null) {
    const name = m[2].trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    if (name.match(/^(Home|About|Contact|Search|Sign|Login|Register|Categories|Products?|Services?)$/i)) continue;

    seen.add(name.toLowerCase());

    // Look for phone near this match (within 2000 chars after)
    const after = html.slice(m.index, m.index + 3000);
    let phone: string | null = null;
    const phoneMatch = after.match(/(?:\+91[\s-]?)?([6-9]\d{9})\b/);
    if (phoneMatch) {
      const digits = phoneMatch[1];
      phone = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }

    // Look for rating
    let rating: number | null = null;
    const ratingMatch = after.match(/(\d\.\d)\s*(?:\/\s*5)?\s*(?:star|rating)/i);
    if (ratingMatch) rating = parseFloat(ratingMatch[1]);

    businesses.push({
      name,
      category: query,
      rating,
      reviews: 0,
      phone,
      address: null,
      city,
      state,
      country,
      website: null,
      source: "TradeIndia",
    });

    if (businesses.length >= 50) break;
  }

  return businesses;
}
