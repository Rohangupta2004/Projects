import { create } from "zustand";
import type { GenerateFilters, Lead, LeadStatus, ViewKey, Industry } from "./types";
import { INDUSTRIES, industryToQuery } from "./leads-data";

interface LeadForgeState {
  // Navigation
  view: ViewKey;
  setView: (v: ViewKey) => void;

  // Leads (real only — app starts empty)
  leads: Lead[];
  selectedLeadId: string | null;
  selectLead: (id: string | null) => void;
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  addLeads: (leads: Lead[]) => void;

  // Generate flow
  filters: GenerateFilters & { source: "google-maps" | "indiamart" | "tradeindia" };
  setFilter: <K extends keyof GenerateFilters>(key: K, value: GenerateFilters[K]) => void;
  setSource: (s: "google-maps" | "indiamart" | "tradeindia") => void;
  isGenerating: boolean;
  generateProgress: number;
  generateLog: string[];
  runGenerate: (count: number) => Promise<void>;
  scrapeError: string | null;
  clearScrapeError: () => void;

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

export const useStore = create<LeadForgeState>((set, get) => ({
  view: "dashboard",
  setView: (v) => set({ view: v }),

  // EMPTY on first load — real leads only come from real scraping
  leads: [],
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
    source: "indiamart",
  },
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  setSource: (src) =>
    set((s) => ({ filters: { ...s.filters, source: src } })),

  isGenerating: false,
  generateProgress: 0,
  generateLog: [],
  scrapeError: null,
  clearScrapeError: () => set({ scrapeError: null }),

  runGenerate: async (count) => {
    if (get().isGenerating) return;
    const { filters } = get();
    set({ isGenerating: true, generateProgress: 0, generateLog: [], scrapeError: null });

    // Real scraper only — no mock fallback
    const query = industryToQuery(filters.industry);

    try {
      const resp = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          city: filters.city,
          state: filters.state,
          country: filters.country,
          count,
          industry: filters.industry,
          source: filters.source,
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (separated by \n\n)
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          try {
            const evt = JSON.parse(dataLine.slice(5).trim());
            if (evt.type === "progress") {
              set((s) => ({
                generateLog: [...s.generateLog, evt.step],
                generateProgress: evt.pct,
              }));
            } else if (evt.type === "done") {
              const sourceLabel = filters.source === "google-maps" ? "Google Maps"
                : filters.source === "indiamart" ? "IndiaMART"
                : "TradeIndia";
              set((s) => ({
                leads: [...evt.leads, ...s.leads],
                isGenerating: false,
                generateProgress: 100,
                view: "leads",
                generateLog: [
                  ...s.generateLog,
                  `✓ Done. Added ${evt.leads.length} real leads from ${sourceLabel}.`,
                ],
              }));
            } else if (evt.type === "error") {
              set((s) => ({
                isGenerating: false,
                scrapeError: evt.message,
                generateLog: [...s.generateLog, `✗ Error: ${evt.message}`],
              }));
              return;
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err: any) {
      set((s) => ({
        isGenerating: false,
        scrapeError: err?.message || "Network error",
        generateLog: [...s.generateLog, `✗ Network error: ${err?.message}`],
      }));
    }
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
