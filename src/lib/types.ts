// LeadForge AI — Core Types

export type Industry =
  | "Manufacturing"
  | "Exporters"
  | "Electrical"
  | "Solar"
  | "Builders"
  | "Architects"
  | "Medical"
  | "Real Estate"
  | "Hotels"
  | "Restaurants";

export type LeadStatus =
  | "New"
  | "Called"
  | "Interested"
  | "Meeting"
  | "Proposal Sent"
  | "Won"
  | "Lost"
  | "Follow Up";

export type WebsiteStatus = "none" | "old" | "broken" | "modern";

export type DataSource =
  | "IndiaMART"
  | "Justdial"
  | "TradeIndia"
  | "ExportersIndia"
  | "Google Maps"
  | "Yellow Pages"
  | "MSME Directory";

export interface WebsiteScore {
  speed: number;       // 0-100
  design: number;      // 0-100
  seo: number;         // 0-100
  mobile: number;      // 0-100
  overall: number;     // 0-100
}

export interface Lead {
  id: string;
  name: string;
  category: Industry;
  phone: string;
  email: string | null;
  website: string | null;
  websiteStatus: WebsiteStatus;
  websiteScore: WebsiteScore | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  city: string;
  state: string;
  country: string;
  googleRating: number | null;   // 0-5
  reviews: number;
  lastUpdated: string;           // ISO date
  source: DataSource;
  status: LeadStatus;
  aiScore: number;               // 0-100 priority
  aiReason: string;
  revenuePotential: number;      // ₹ in thousands
  revenueTier: "Low" | "Medium" | "High" | "Premium";
  stars: number;                 // 1-5 priority stars
  socialActivity: string;        // e.g. "Very active on Facebook"
  createdAt: string;
}

export type ViewKey =
  | "dashboard"
  | "generate"
  | "leads"
  | "pipeline";

export interface GenerateFilters {
  industry: Industry | "All";
  country: string;
  state: string;
  city: string;
}
