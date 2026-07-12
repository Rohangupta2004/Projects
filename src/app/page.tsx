"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Dashboard } from "@/components/dashboard";
import { GenerateLeads } from "@/components/generate-leads";
import { LeadsView } from "@/components/leads-view";
import { PipelineView } from "@/components/pipeline-view";
import { LeadDetailPanel } from "@/components/lead-detail-panel";
import {
  LayoutDashboard,
  Zap,
  Database,
  GitBranch,
  Search,
  Bell,
  Sparkles,
  Menu,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { key: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { key: "generate" as const, label: "Generate Leads", icon: Zap },
  { key: "leads" as const, label: "Leads Database", icon: Database },
  { key: "pipeline" as const, label: "Pipeline", icon: GitBranch },
];

export default function Home() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const leads = useStore((s) => s.leads);
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [dark]);

  const hotCount = leads.filter((l) => l.aiScore >= 85).length;
  const noSiteCount = leads.filter((l) => l.websiteStatus === "none").length;
  const pipelineValue = leads.reduce((a, l) => a + l.revenuePotential, 0) * 20;

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground transition-transform",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border">
            <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles className="size-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold tracking-tight leading-none">LeadForge AI</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                AI Lead Finder
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setView(item.key);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className={cn("size-4", active && "text-emerald-600 dark:text-emerald-400")} />
                  {item.label}
                  {item.key === "leads" && (
                    <Badge variant="secondary" className="ml-auto text-[10px] h-5">
                      {leads.length}
                    </Badge>
                  )}
                  {item.key === "generate" && (
                    <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      NEW
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-sidebar-border">
              <div className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Data Sources
              </div>
              {[
                { name: "IndiaMART", live: true },
                { name: "Google Maps", live: true },
                { name: "TradeIndia", live: true },
                { name: "Justdial", live: false },
                { name: "ExportersIndia", live: false },
                { name: "MSME Directory", live: false },
              ].map((s) => (
                <div
                  key={s.name}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs",
                    s.live ? "text-foreground" : "text-muted-foreground/60"
                  )}
                  title={s.live ? "Live — actively scraped" : "Blocked by datacenter IP (Cloudflare)"}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      s.live ? "bg-emerald-500 animate-pulse" : "bg-slate-400 dark:bg-slate-600"
                    )}
                  />
                  {s.name}
                  {s.live && (
                    <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Live
                    </span>
                  )}
                </div>
              ))}
            </div>
          </nav>

          {/* Live counters */}
          <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-rose-500/10 px-3 py-2.5 border border-rose-500/20">
                <div className="text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400 font-semibold">
                  No Website
                </div>
                <div className="text-xl font-bold text-rose-700 dark:text-rose-300">
                  {noSiteCount}
                </div>
              </div>
              <div className="rounded-lg bg-amber-500/10 px-3 py-2.5 border border-amber-500/20">
                <div className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                  Hot Leads
                </div>
                <div className="text-xl font-bold text-amber-700 dark:text-amber-300">
                  {hotCount}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Pipeline value:</span>{" "}
              ₹{(pipelineValue / 1000).toFixed(1)}M potential
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 flex items-center px-4 lg:px-8 gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search businesses, cities, phones…"
              className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setView("leads")}
            />
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs">
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15">
              <span className="size-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              3 sources live
            </Badge>
          </div>

          <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)}>
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500" />
          </Button>

          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="size-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
              RA
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold leading-none">Rahul Agarwal</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Agency Owner</div>
            </div>
          </div>
        </header>

        {/* View content */}
        <main className="flex-1 overflow-auto">
          {view === "dashboard" && <Dashboard />}
          {view === "generate" && <GenerateLeads />}
          {view === "leads" && <LeadsView />}
          {view === "pipeline" && <PipelineView />}
        </main>
      </div>

      {/* Lead detail slide-over */}
      <LeadDetailPanel />
    </div>
  );
}
