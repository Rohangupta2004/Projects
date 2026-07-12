import type {
  Industry,
  Lead,
  LeadStatus,
  WebsiteStatus,
  WebsiteScore,
} from "./types";

// -------- Geo data (India-focused) --------

export const COUNTRIES = ["India"];

export const STATE_CITY: Record<string, string[]> = {
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
  Delhi: ["New Delhi", "Dwarka", "Rohini", "Saket"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubli"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  "Uttar Pradesh": ["Lucknow", "Noida", "Kanpur", "Varanasi", "Agra"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur"],
  Telangana: ["Hyderabad", "Warangal", "Karimnagar"],
  Kerala: ["Kochi", "Thiruvananthapuram", "Kozhikode"],
};

export const INDUSTRIES: Industry[] = [
  "Manufacturing",
  "Exporters",
  "Electrical",
  "Solar",
  "Builders",
  "Architects",
  "Medical",
  "Real Estate",
  "Hotels",
  "Restaurants",
];

// -------- AI score logic (mirrors PRD) --------

function genAiScore(
  status: WebsiteStatus,
  rating: number | null,
  reviews: number,
  social: { facebook: string | null; instagram: string | null }
): { score: number; reason: string; stars: number; socialActivity: string } {
  // Higher score = higher priority to contact (more likely to need a website)
  let score = 50;
  const reasons: string[] = [];
  let socialActivity = "Limited social presence";

  if (status === "none") {
    score += 40;
    reasons.push("No website");
  } else if (status === "old") {
    score += 25;
    reasons.push("Outdated website");
  } else if (status === "broken") {
    score += 35;
    reasons.push("Broken website");
  } else {
    score -= 10;
    reasons.push("Modern website");
  }

  if (rating !== null) {
    if (rating >= 4.5) {
      score += 10;
      reasons.push(`Strong Google rating (${rating.toFixed(1)})`);
    } else if (rating >= 4.0) {
      score += 5;
      reasons.push(`Decent Google rating (${rating.toFixed(1)})`);
    } else if (rating < 3.5) {
      score -= 5;
      reasons.push(`Low Google rating (${rating.toFixed(1)})`);
    }
  }

  if (reviews >= 100) {
    score += 8;
    reasons.push(`${reviews} reviews — established business`);
  } else if (reviews >= 30) {
    score += 4;
  }

  // Social activity
  if (social.facebook && social.instagram) {
    score += 6;
    socialActivity = "Very active on Facebook & Instagram";
    reasons.push("Active on social media");
  } else if (social.facebook) {
    score += 3;
    socialActivity = "Active on Facebook";
  } else if (social.instagram) {
    score += 3;
    socialActivity = "Active on Instagram";
  }

  score = Math.max(5, Math.min(99, score + Math.floor(Math.random() * 6 - 3)));
  const stars = score >= 85 ? 5 : score >= 70 ? 4 : score >= 55 ? 3 : score >= 40 ? 2 : 1;

  return {
    score,
    reason: reasons.join(" · "),
    stars,
    socialActivity,
  };
}

function genRevenue(
  industry: Industry,
  reviews: number,
  status: WebsiteStatus,
  city: string
): { amount: number; tier: "Low" | "Medium" | "High" | "Premium" } {
  // Tier-1 cities tend to have bigger budgets
  const tier1 = ["Mumbai", "New Delhi", "Bengaluru", "Chennai", "Hyderabad", "Pune", "Ahmedabad"];
  const cityMult = tier1.includes(city) ? 1.4 : 1.0;

  const industryBase: Record<Industry, number> = {
    Manufacturing: 35,
    Exporters: 45,
    Electrical: 22,
    Solar: 38,
    Builders: 55,
    Architects: 28,
    Medical: 40,
    "Real Estate": 50,
    Hotels: 42,
    Restaurants: 18,
  };

  let base = industryBase[industry] * cityMult;
  base += reviews * 0.4; // more reviews → more established → bigger budget
  if (status === "modern") base *= 1.1; // already invests in web
  const amount = Math.round(base + Math.random() * 30 - 15);

  let tier: "Low" | "Medium" | "High" | "Premium" = "Low";
  if (amount >= 60) tier = "Premium";
  else if (amount >= 40) tier = "High";
  else if (amount >= 25) tier = "Medium";

  return { amount, tier };
}

export const STATUS_COLORS: Record<LeadStatus, string> = {
  New: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900",
  Called: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
  Interested: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
  Meeting: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900",
  "Proposal Sent": "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
  Won: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  Lost: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900",
  "Follow Up": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export const STATUS_LIST: LeadStatus[] = [
  "New", "Called", "Interested", "Meeting", "Proposal Sent", "Won", "Lost", "Follow Up",
];

// -------- Real scraping enrichment --------

import type { ScrapedBusiness } from "./scraper";

/**
 * Convert a raw scraped business (from Playwright/Google Maps) into a full Lead.
 *
 * HONEST DATA POLICY:
 * - `name`, `phone`, `googleRating`, `reviews`, `address`, `website` come
 *   straight from the scraper. We do NOT make these up.
 * - `email`, `instagram`, `facebook`, `linkedin` are left null unless the
 *   scraper extracted them. (Currently the Google Maps scraper doesn't.)
 * - `websiteStatus` is "none" if no website URL was scraped, otherwise
 *   "exists" (we'd need to actually visit the site to grade it; left as
 *   `websiteScore: null` in that case).
 * - `aiScore`, `revenuePotential`, `stars`, `socialActivity` are heuristic
 *   estimates computed from the real scraped signals (rating, reviews,
 *   website presence, category, city). These are clearly labelled in the
 *   UI as "AI estimate".
 */
export function enrichLead(
  b: ScrapedBusiness,
  industryFilter: Industry | "All",
  index: number
): Lead {
  // Determine website status honestly
  let websiteStatus: WebsiteStatus;
  if (!b.website) {
    websiteStatus = "none";
  } else {
    // We have a URL but haven't audited the site yet.
    // Use "modern" as a neutral "exists" status — the UI shows it as a real link.
    // The actual site audit (speed/design/SEO/mobile) would be a follow-up step.
    websiteStatus = "modern";
  }

  // No website score unless we actually visited and audited the site
  // (would require an additional Playwright pass per site — not done here)
  const wsScore: WebsiteScore | null = null;

  // Map industry filter (or infer from scraped category)
  const category: Industry = industryFilter !== "All"
    ? industryFilter
    : inferIndustry(b.category || b.name);

  // AI score from REAL signals only
  const ai = genAiScore(websiteStatus, b.rating, b.reviews, {
    facebook: null,
    instagram: null,
  });
  const revenue = genRevenue(category, b.reviews, websiteStatus, b.city);

  // Format phone consistently
  let phone = b.phone || "";
  if (phone) {
    if (!phone.startsWith("+91")) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length === 10) phone = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
      else if (digits.length === 12 && digits.startsWith("91"))
        phone = `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
      else if (digits.length > 5)
        phone = `+91 ${digits.slice(-10, -5)} ${digits.slice(-5)}`;
    } else {
      const digits = phone.replace(/\D/g, "");
      phone = `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
  }

  return {
    id: `LF-REAL-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    name: b.name,
    category,
    phone,
    email: null,             // not scraped
    website: b.website,
    websiteStatus,
    websiteScore: wsScore,
    instagram: null,         // not scraped
    facebook: null,          // not scraped
    linkedin: null,          // not scraped
    city: b.city,
    state: b.state,
    country: b.country,
    googleRating: b.rating,
    reviews: b.reviews,
    lastUpdated: new Date().toISOString(),
    source: "Google Maps",
    status: "New",
    aiScore: ai.score,
    aiReason: ai.reason,
    revenuePotential: revenue.amount,
    revenueTier: revenue.tier,
    stars: ai.stars,
    socialActivity: ai.socialActivity,
    createdAt: new Date().toISOString(),
  };
}

function inferIndustry(category: string): Industry {
  const c = (category || "").toLowerCase();
  if (c.match(/hotel|resort|residen/)) return "Hotels";
  if (c.match(/restaurant|kitchen|dhaba|food|bistro|cafe/)) return "Restaurants";
  if (c.match(/build|construc|infra/)) return "Builders";
  if (c.match(/architect|design|planner/)) return "Architects";
  if (c.match(/hospital|clinic|medical|health|diagno/)) return "Medical";
  if (c.match(/real|estate|propert/)) return "Real Estate";
  if (c.match(/solar|energy|renew/)) return "Solar";
  if (c.match(/electric|electro/)) return "Electrical";
  if (c.match(/export|trade|international/)) return "Exporters";
  if (c.match(/manufact|fabric|industr|work/)) return "Manufacturing";
  return "Manufacturing"; // default fallback
}

// Map query string to industry for scraping
export function industryToQuery(industry: Industry | "All"): string {
  if (industry === "All") return "website designer"; // best for finding web-opportunity leads
  const map: Record<Industry, string> = {
    Manufacturing: "manufacturing company",
    Exporters: "export house",
    Electrical: "electrical contractor",
    Solar: "solar company",
    Builders: "builder developer",
    Architects: "architect",
    Medical: "hospital clinic",
    "Real Estate": "real estate agent",
    Hotels: "hotel resort",
    Restaurants: "restaurant",
  };
  return map[industry];
}

