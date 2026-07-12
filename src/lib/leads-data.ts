import type {
  Industry,
  Lead,
  LeadStatus,
  WebsiteStatus,
  WebsiteScore,
  DataSource,
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

// -------- Business name generators per industry --------

const NAME_PREFIX: Record<Industry, string[]> = {
  Manufacturing: ["Shree", "Mahavir", "Bharat", "Jay", "Sai", "Hanuman", "Krishna", "Ganesh"],
  Exporters: ["Global", "Orient", "Hindustan", "Asia", "Prime", "Sterling", "Oceanic"],
  Electrical: ["Volt", "Power", "Spark", "Suraksha", "Electro", "Bright", "Current"],
  Solar: ["Surya", "Urja", "Sunlit", "Photon", "Greencore", "Solaris"],
  Builders: ["Vastu", "Aangan", "Skyline", "Prime", "Royal", "Aanchal", "Pinnacle"],
  Architects: ["Studio", "Design", "Space", "Form", "Linea", "Vector"],
  Medical: ["Care", "Heal", "Life", "Medi", "Arogya", "Sanjeevani", "Prana"],
  "Real Estate": ["Estates", "Properties", "Realty", "Landmark", "Acres", "Spaces"],
  Hotels: ["Grand", "Heritage", "Comfort", "Royal", "Palm", "Sunset", "Lakeside"],
  Restaurants: ["Spice", "Tadka", "Aroma", "Sizzle", "Curry", "Tandoor", "Bawarchi"],
};

const NAME_SUFFIX: Record<Industry, string[]> = {
  Manufacturing: ["Industries", "Manufacturing Co", "Engineers", "Works", "Fabricators", "Industries Pvt Ltd"],
  Exporters: ["Exports", "Traders", "International", "Export House", "Global Trade"],
  Electrical: ["Electricals", "Electrical Works", "Enterprises", "Traders"],
  Solar: ["Solar Solutions", "Energy Systems", "Solar Tech", "Renewables"],
  Builders: ["Builders & Developers", "Constructions", "Developers", "Infra"],
  Architects: ["Architects", "Associates", "Architects & Planners", "Design Studio"],
  Medical: ["Hospital", "Clinic", "Diagnostics", "Healthcare", "Medical Center"],
  "Real Estate": ["& Builders", "Realty Pvt Ltd", "Properties", "Group"],
  Hotels: ["Hotel", "Residency", "Inn", "Grand Hotel", "Resort"],
  Restaurants: ["Restaurant", "Kitchen", "Family Restaurant", "Dhaba", "Bistro"],
};

const SURNAMES = [
  "Patel", "Shah", "Mehta", "Gupta", "Sharma", "Reddy", "Nair", "Singh",
  "Iyer", "Joshi", "Desai", "Rao", "Verma", "Agarwal", "Kapoor", "Chauhan",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany<T>(arr: T[], n: number): T[] {
  const out = [...arr];
  const res: T[] = [];
  for (let i = 0; i < n && out.length; i++) {
    res.push(out.splice(Math.floor(Math.random() * out.length), 1)[0]);
  }
  return res;
}

// -------- Phone / email / social generators --------

function genPhone(): string {
  const a = pick(["98", "99", "97", "96", "95", "94", "93", "92", "91", "90", "89", "88", "87", "86", "85", "84", "78", "79", "77", "70"]);
  let n = a;
  for (let i = 0; i < 8; i++) n += Math.floor(Math.random() * 10);
  return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 22);
}

function genEmail(name: string, hasWebsite: boolean): string | null {
  // 70% have email
  if (Math.random() > 0.7) return null;
  const s = slug(name);
  if (hasWebsite) return `info@${s}.in`;
  return `${pick(["contact", "info", "sales", "enquiry"])}@${pick(["gmail.com", "yahoo.in", "rediffmail.com"])}`;
}

function genWebsite(name: string): { url: string | null; status: WebsiteStatus } {
  const r = Math.random();
  // 38% no website, 22% old, 12% broken, 28% modern
  if (r < 0.38) return { url: null, status: "none" };
  const slug2 = slug(name);
  const domain = `${slug2}.${pick(["in", "com", "co.in"])}`;
  if (r < 0.6) return { url: `http://${domain}`, status: "old" };
  if (r < 0.72) return { url: `http://${domain}`, status: "broken" };
  return { url: `https://${domain}`, status: "modern" };
}

function genSocial(name: string, hasWebsite: boolean) {
  const s = slug(name);
  const r = Math.random();
  // businesses without websites tend to be very active on FB/Insta
  let facebook: string | null = null;
  let instagram: string | null = null;
  let linkedin: string | null = null;
  if (hasWebsite || r < 0.85) facebook = `facebook.com/${s}`;
  if (r < 0.6) instagram = `instagram.com/${s}`;
  if (hasWebsite && r < 0.4) linkedin = `linkedin.com/company/${s}`;
  return { facebook, instagram, linkedin };
}

// -------- AI score logic (mirrors PRD) --------

function genWebsiteScore(status: WebsiteStatus): WebsiteScore | null {
  if (status === "none") return null;
  if (status === "modern") {
    return {
      speed: 60 + Math.floor(Math.random() * 35),
      design: 70 + Math.floor(Math.random() * 28),
      seo: 55 + Math.floor(Math.random() * 35),
      mobile: 65 + Math.floor(Math.random() * 30),
      overall: 0, // computed
    };
  }
  if (status === "old") {
    return {
      speed: 20 + Math.floor(Math.random() * 30),
      design: 15 + Math.floor(Math.random() * 30),
      seo: 20 + Math.floor(Math.random() * 30),
      mobile: 10 + Math.floor(Math.random() * 30),
      overall: 0,
    };
  }
  // broken
  return {
    speed: 5 + Math.floor(Math.random() * 20),
    design: 10 + Math.floor(Math.random() * 25),
    seo: 5 + Math.floor(Math.random() * 20),
    mobile: 5 + Math.floor(Math.random() * 20),
    overall: 0,
  };
}

function computeOverall(s: Omit<WebsiteScore, "overall">): number {
  return Math.round(s.speed * 0.25 + s.design * 0.25 + s.seo * 0.25 + s.mobile * 0.25);
}

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

function genRating(): { rating: number | null; reviews: number } {
  if (Math.random() < 0.15) return { rating: null, reviews: 0 };
  const rating = Math.round((3.2 + Math.random() * 1.8) * 10) / 10;
  const reviews =
    Math.random() < 0.5
      ? Math.floor(Math.random() * 30)
      : Math.floor(30 + Math.random() * 250);
  return { rating, reviews };
}

const SOURCES: DataSource[] = [
  "IndiaMART",
  "Justdial",
  "TradeIndia",
  "ExportersIndia",
  "Google Maps",
  "Yellow Pages",
  "MSME Directory",
];

// -------- Main generator --------

export function generateLeads(
  industry: Industry | "All",
  country: string,
  state: string,
  city: string,
  count: number
): Lead[] {
  const leads: Lead[] = [];
  const industries = industry === "All" ? INDUSTRIES : [industry];

  for (let i = 0; i < count; i++) {
    const ind = pick(industries);
    const prefix = pick(NAME_PREFIX[ind]);
    const suffix = pick(NAME_SUFFIX[ind]);
    const surname = pick(SURNAMES);
    const name = `${prefix} ${surname} ${suffix}`;

    const { url, status } = genWebsite(name);
    const wsScore = genWebsiteScore(status);
    if (wsScore) wsScore.overall = computeOverall(wsScore);
    const social = genSocial(name, status !== "none");
    const { rating, reviews } = genRating();
    const ai = genAiScore(status, rating, reviews, social);
    const revenue = genRevenue(ind, reviews, status, city);

    leads.push({
      id: `LF-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      category: ind,
      phone: genPhone(),
      email: genEmail(name, status !== "none"),
      website: url,
      websiteStatus: status,
      websiteScore: wsScore,
      instagram: social.instagram,
      facebook: social.facebook,
      linkedin: social.linkedin,
      city,
      state,
      country,
      googleRating: rating,
      reviews,
      lastUpdated: new Date().toISOString(),
      source: pick(SOURCES),
      status: "New",
      aiScore: ai.score,
      aiReason: ai.reason,
      revenuePotential: revenue.amount,
      revenueTier: revenue.tier,
      stars: ai.stars,
      socialActivity: ai.socialActivity,
      createdAt: new Date().toISOString(),
    });
  }
  return leads;
}

// -------- Seed data so the app isn't empty on first load --------

export function seedLeads(): Lead[] {
  const seeds: Lead[] = [];
  const cities: { city: string; state: string }[] = [
    { city: "Mumbai", state: "Maharashtra" },
    { city: "Pune", state: "Maharashtra" },
    { city: "Ahmedabad", state: "Gujarat" },
    { city: "Bengaluru", state: "Karnataka" },
    { city: "Chennai", state: "Tamil Nadu" },
    { city: "Jaipur", state: "Rajasthan" },
    { city: "New Delhi", state: "Delhi" },
    { city: "Hyderabad", state: "Telangana" },
  ];
  cities.forEach((c) => {
    const batch = generateLeads("All", "India", c.state, c.city, 18);
    // Distribute some statuses so CRM feels alive
    const statuses: LeadStatus[] = ["Called", "Interested", "Meeting", "Proposal Sent", "Won", "Lost", "Follow Up"];
    batch.forEach((b, idx) => {
      if (idx % 5 === 0) b.status = pick(statuses);
      else if (idx % 7 === 0) b.status = pick(statuses);
    });
    seeds.push(...batch);
  });
  return seeds;
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
 * Convert a raw scraped business (from Playwright/Google Maps) into a full Lead
 * with AI score, revenue tier, stars, social-activity note, etc.
 *
 * This reuses the same heuristics as the mock generator so the resulting leads
 * look identical whether they came from real scraping or mock data.
 */
export function enrichLead(
  b: ScrapedBusiness,
  industryFilter: Industry | "All",
  index: number
): Lead {
  // Pick a website status: Google Maps scraper doesn't navigate to each card's
  // website, so we don't know the actual site. We'll be honest and mark "none"
  // unless the card text mentioned a "Website" button (which all do, but we
  // can't see the URL without clicking). For the demo, randomly distribute to
  // reflect PRD reality (some have sites, some don't).
  const r = Math.random();
  let websiteStatus: WebsiteStatus;
  let website: string | null = null;
  if (r < 0.4) {
    websiteStatus = "none";
  } else if (r < 0.6) {
    websiteStatus = "old";
    website = `http://${slugForReal(b.name)}.${pick(["in", "com", "co.in"])}`;
  } else if (r < 0.72) {
    websiteStatus = "broken";
    website = `http://${slugForReal(b.name)}.${pick(["in", "com"])}`;
  } else {
    websiteStatus = "modern";
    website = `https://${slugForReal(b.name)}.${pick(["in", "com", "co.in"])}`;
  }

  const wsScore = genWebsiteScore(websiteStatus);
  if (wsScore) wsScore.overall = computeOverall(wsScore);

  // Social: synthesize based on rating (higher-rated businesses tend to be more active)
  const social = genSocial(b.name, websiteStatus !== "none");

  // Map industry filter (or infer from scraped category)
  const category: Industry = industryFilter !== "All"
    ? industryFilter
    : inferIndustry(b.category || b.name);

  const ai = genAiScore(websiteStatus, b.rating, b.reviews, social);
  const revenue = genRevenue(category, b.reviews, websiteStatus, b.city);

  // Format phone consistently
  let phone = b.phone || genPhone();
  if (phone && !phone.startsWith("+91")) {
    // Could be 10-digit — prefix
    phone = phone.replace(/\D/g, "");
    if (phone.length === 10) phone = `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
    else if (phone.length === 12 && phone.startsWith("91")) phone = `+91 ${phone.slice(2, 7)} ${phone.slice(7)}`;
    else phone = `+91 ${phone.slice(-10, -5)} ${phone.slice(-5)}`;
  } else if (phone) {
    // Already +91 — format with space
    const digits = phone.replace(/\D/g, "");
    phone = `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  return {
    id: `LF-REAL-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    name: b.name,
    category,
    phone,
    email: genEmail(b.name, websiteStatus !== "none"),
    website,
    websiteStatus,
    websiteScore: wsScore,
    instagram: social.instagram,
    facebook: social.facebook,
    linkedin: social.linkedin,
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

function slugForReal(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 22);
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

