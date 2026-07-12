import { create } from "zustand";
import type { GenerateFilters, Lead, LeadStatus, ViewKey } from "./types";
import { generateLeads, seedLeads, INDUSTRIES } from "./leads-data";

interface LeadForgeState {
  // Navigation
  view: ViewKey;
  setView: (v: ViewKey) => void;

  // Leads
  leads: Lead[];
  selectedLeadId: string | null;
  selectLead: (id: string | null) => void;
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  addLeads: (leads: Lead[]) => void;

  // Generate flow
  filters: GenerateFilters;
  setFilter: <K extends keyof GenerateFilters>(key: K, value: GenerateFilters[K]) => void;
  isGenerating: boolean;
  generateProgress: number;
  generateLog: string[];
  runGenerate: (count: number) => void;

  // Lead list filters
  search: string;
  setSearch: (s: string) => void;
  filterIndustry: Industry | "All";
  setFilterIndustry: (i: Industry | "All") => void;
  filterWebsite: "all" | "none" | "old" | "broken" | "modern";
  setFilterWebsite: (w: "all" | "none" | "old" | "broken" | "modern") => void;
  filterStatus: LeadStatus | "All";
  setFilterStatus: (s: LeadStatus | "All") => void;
  minReviews: number;
  setMinReviews: (n: number) => void;
  maxReviews: number;
  setMaxReviews: (n: number) => void;
  sortBy: "aiScore" | "revenue" | "reviews" | "recent";
  setSortBy: (s: "aiScore" | "revenue" | "reviews" | "recent") => void;

  // Pagination
  page: number;
  setPage: (p: number) => void;
}

import type { Industry } from "./types";

export const useStore = create<LeadForgeState>((set, get) => ({
  view: "dashboard",
  setView: (v) => set({ view: v }),

  leads: seedLeads(),
  selectedLeadId: null,
  selectLead: (id) => set({ selectedLeadId: id }),
  updateLeadStatus: (id, status) =>
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id ? { ...l, status, lastUpdated: new Date().toISOString() } : l
      ),
    })),
  addLeads: (newLeads) => set((s) => ({ leads: [...newLeads, ...s.leads] })),

  filters: {
    industry: "All",
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
  },
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  isGenerating: false,
  generateProgress: 0,
  generateLog: [],
  runGenerate: (count) => {
    if (get().isGenerating) return;
    const { filters } = get();
    set({ isGenerating: true, generateProgress: 0, generateLog: [] });

    const steps = [
      `Connecting to IndiaMART, Justdial, TradeIndia & ExportersIndia…`,
      `Scraping ${filters.city}, ${filters.state} (${filters.industry === "All" ? "all industries" : filters.industry})…`,
      `Resolving phone numbers & emails…`,
      `Checking websites & social profiles…`,
      `AI visiting websites & scoring design, speed, SEO, mobile…`,
      `Pulling Google reviews & ratings…`,
      `Computing AI priority & Revenue Potential Score…`,
      `Deduplicating against existing ${get().leads.length} leads…`,
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        set((s) => ({ generateLog: [...s.generateLog, steps[i]], generateProgress: Math.round(((i + 1) / steps.length) * 100) }));
        i++;
      } else {
        clearInterval(interval);
        const newLeads = generateLeads(
          filters.industry,
          filters.country,
          filters.state,
          filters.city,
          count
        );
        set((s) => ({
          leads: [...newLeads, ...s.leads],
          isGenerating: false,
          generateProgress: 100,
          view: "leads",
        }));
      }
    }, 480);
  },

  search: "",
  setSearch: (s) => set({ search: s }),
  filterIndustry: "All",
  setFilterIndustry: (i) => set({ filterIndustry: i }),
  filterWebsite: "all",
  setFilterWebsite: (w) => set({ filterWebsite: w }),
  filterStatus: "All",
  setFilterStatus: (s) => set({ filterStatus: s }),
  minReviews: 0,
  setMinReviews: (n) => set({ minReviews: n }),
  maxReviews: 500,
  setMaxReviews: (n) => set({ maxReviews: n }),
  sortBy: "aiScore",
  setSortBy: (s) => set({ sortBy: s }),

  page: 1,
  setPage: (p) => set({ page: p }),
}));

export { INDUSTRIES };
