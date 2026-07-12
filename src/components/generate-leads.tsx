"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { STATE_CITY, INDUSTRIES, COUNTRIES } from "@/lib/leads-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Factory,
  Globe2,
  MapPin,
  Building2,
  Zap,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Database,
  Phone,
  Mail,
  Globe,
  Bot,
  Star,
  Share2,
  FileText,
  Sparkles,
  ArrowRight,
  AlertCircle,
  MapPinned,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

export function GenerateLeads() {
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const isGenerating = useStore((s) => s.isGenerating);
  const generateProgress = useStore((s) => s.generateProgress);
  const generateLog = useStore((s) => s.generateLog);
  const runGenerate = useStore((s) => s.runGenerate);
  const leads = useStore((s) => s.leads);
  const scrapeError = useStore((s) => s.scrapeError);
  const clearScrapeError = useStore((s) => s.clearScrapeError);
  const [leadCount, setLeadCount] = useState(15);

  const states = Object.keys(STATE_CITY);
  const cities = STATE_CITY[filters.state] || [];

  const steps = [
    { icon: Factory, label: "Industry", value: filters.industry, key: "industry" },
    { icon: Globe2, label: "Country", value: filters.country, key: "country" },
    { icon: MapPin, label: "State", value: filters.state, key: "state" },
    { icon: Building2, label: "City", value: filters.city, key: "city" },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Generate Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick your target segment — Playwright launches a real headless browser to scrape Google Maps,
            then AI scores each business for website opportunity.
          </p>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
          <MapPinned className="size-3.5 mr-1.5" /> Real scraper · Live data
        </Badge>
      </div>

      {/* Error banner */}
      {scrapeError && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-sm text-rose-700 dark:text-rose-400">Scraping failed</div>
            <div className="text-xs text-muted-foreground mt-1">{scrapeError}</div>
            <div className="text-xs text-muted-foreground mt-2">
              Common causes: Google rate-limited the sandbox IP, the city/industry had no results,
              or the headless browser timed out. Try a smaller batch or wait a minute and retry.
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={clearScrapeError}>Dismiss</Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Workflow selector */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="size-4 text-emerald-500" /> Target Segment
              </CardTitle>
              <CardDescription>Define where to search and what to find</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Step chain */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Industry */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Factory className="size-3.5" /> 1. Industry
                  </label>
                  <Select
                    value={filters.industry}
                    onValueChange={(v) => setFilter("industry", v as typeof filters.industry)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All industries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Industries</SelectItem>
                      {INDUSTRIES.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Country */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Globe2 className="size-3.5" /> 2. Country
                  </label>
                  <Select
                    value={filters.country}
                    onValueChange={(v) => setFilter("country", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* State */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> 3. State
                  </label>
                  <Select
                    value={filters.state}
                    onValueChange={(v) => {
                      setFilter("state", v);
                      // Auto-pick first city of new state
                      const c = STATE_CITY[v]?.[0];
                      if (c) setFilter("city", c);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Building2 className="size-3.5" /> 4. City
                  </label>
                  <Select
                    value={filters.city}
                    onValueChange={(v) => setFilter("city", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Visual step chain */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {steps.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium">
                      <s.icon className="size-3" /> {s.value}
                    </span>
                    {i < steps.length - 1 && <ChevronRight className="size-3 text-muted-foreground" />}
                  </div>
                ))}
              </div>

              {/* Quantity slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Leads to Generate (max 30 per scrape)
                  </label>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{leadCount} leads</span>
                </div>
                <div className="px-1">
                  <Slider
                    value={[leadCount]}
                    onValueChange={(v) => setLeadCount(v[0])}
                    min={5}
                    max={30}
                    step={5}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>5</span>
                  <span>15</span>
                  <span>25</span>
                  <span>30</span>
                </div>
              </div>

              <Button
                onClick={() => runGenerate(leadCount)}
                disabled={isGenerating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 h-12 text-base font-semibold"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-5 animate-spin" /> Scraping…
                  </>
                ) : (
                  <>
                    <Zap className="size-5" /> Generate Leads
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Pipeline visualization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="size-4 text-emerald-500" /> Collection Pipeline
              </CardTitle>
              <CardDescription>What happens when you click Generate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { icon: Database, label: "Collect Businesses", desc: "Scrape IndiaMART, Justdial, TradeIndia, ExportersIndia" },
                  { icon: Phone, label: "Find Phone", desc: "Parse listing + website contact pages" },
                  { icon: Mail, label: "Find Email", desc: "Regex + mailto links + WHOIS" },
                  { icon: Globe, label: "Find Website", desc: "Check listing URL + Google search" },
                  { icon: Bot, label: "AI Visits Website", desc: "Headless Playwright render + screenshot" },
                  { icon: Star, label: "Score Website", desc: "Speed · Design · SEO · Mobile · 0-100" },
                  { icon: Star, label: "Google Reviews", desc: "Rating + review count via Places API" },
                  { icon: Share2, label: "Social Media", desc: "FB, Instagram, LinkedIn presence" },
                  { icon: FileText, label: "Generate Report", desc: "AI recommendation + revenue potential" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border border-border p-3 transition-all",
                      isGenerating ? "bg-emerald-500/5 border-emerald-500/30" : "bg-card"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                        <s.icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">0{i + 1}</span>
                    </div>
                    <div className="text-xs font-semibold">{s.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live activity panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {isGenerating ? (
                  <Loader2 className="size-4 animate-spin text-emerald-500" />
                ) : (
                  <Sparkles className="size-4 text-emerald-500" />
                )}
                Live Scraper Activity
              </CardTitle>
              <CardDescription>
                {isGenerating ? `Running pipeline… ${generateProgress}%` : "Ready to start"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Progress bar */}
              <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                  style={{ width: `${generateProgress}%` }}
                />
              </div>

              {/* Log */}
              <div className="bg-slate-950 dark:bg-black/40 rounded-lg p-3 font-mono text-[11px] min-h-[280px] max-h-[400px] overflow-y-auto space-y-1.5">
                {generateLog.length === 0 && !isGenerating && (
                  <div className="text-slate-500 italic">
                    $ leadforge scrape --industry="{filters.industry}" --city="{filters.city}"
                    <br />
                    <span className="text-slate-600">Waiting for input…</span>
                  </div>
                )}
                {generateLog.map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="size-3 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-slate-300">{line}</span>
                  </div>
                ))}
                {isGenerating && generateLog.length > 0 && (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Loader2 className="size-3 animate-spin" />
                    <span className="animate-pulse">processing…</span>
                  </div>
                )}
                {!isGenerating && generateProgress === 100 && (
                  <div className="text-emerald-400 font-bold pt-2 border-t border-slate-800 mt-2">
                    ✓ Done. {generateLog[generateLog.length - 1]?.includes("Done")
                      ? generateLog[generateLog.length - 1].replace(/^.*Done\.\s*/, "")
                      : `${leadCount} leads added`} to your database.
                  </div>
                )}
              </div>

              {/* Stats footer */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="text-center">
                  <div className="text-lg font-bold">{leads.length}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    {leads.filter((l) => l.websiteStatus === "none").length}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">No Website</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {leads.filter((l) => l.aiScore >= 85).length}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Hot</div>
                </div>
              </div>

              {!isGenerating && generateProgress === 100 && (
                <Button
                  onClick={() => useStore.getState().setView("leads")}
                  className="w-full mt-3"
                  variant="outline"
                >
                  View new leads <ArrowRight className="size-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
