"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { INDUSTRIES, STATUS_COLORS, STATUS_LIST } from "@/lib/leads-data";
import type { LeadStatus } from "@/lib/types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  GlobeLock,
  Star,
  Phone,
  Mail,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  ArrowUpDown,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

export function LeadsView() {
  const leads = useStore((s) => s.leads);
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const filterIndustry = useStore((s) => s.filterIndustry);
  const setFilterIndustry = useStore((s) => s.setFilterIndustry);
  const filterWebsite = useStore((s) => s.filterWebsite);
  const setFilterWebsite = useStore((s) => s.setFilterWebsite);
  const filterStatus = useStore((s) => s.filterStatus);
  const setFilterStatus = useStore((s) => s.setFilterStatus);
  const minReviews = useStore((s) => s.minReviews);
  const setMinReviews = useStore((s) => s.setMinReviews);
  const maxReviews = useStore((s) => s.maxReviews);
  const setMaxReviews = useStore((s) => s.setMaxReviews);
  const sortBy = useStore((s) => s.sortBy);
  const setSortBy = useStore((s) => s.setSortBy);
  const selectLead = useStore((s) => s.selectLead);
  const setView = useStore((s) => s.setView);
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);

  const filtered = useMemo(() => {
    let arr = leads.filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        const hit =
          l.name.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          l.category.toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (filterIndustry !== "All" && l.category !== filterIndustry) return false;
      if (filterWebsite !== "all" && l.websiteStatus !== filterWebsite) return false;
      if (filterStatus !== "All" && l.status !== filterStatus) return false;
      if (l.reviews < minReviews || l.reviews > maxReviews) return false;
      return true;
    });

    arr.sort((a, b) => {
      if (sortBy === "aiScore") return b.aiScore - a.aiScore;
      if (sortBy === "revenue") return b.revenuePotential - a.revenuePotential;
      if (sortBy === "reviews") return b.reviews - a.reviews;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return arr;
  }, [leads, search, filterIndustry, filterWebsite, filterStatus, minReviews, maxReviews, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = () => setPage(1);

  return (
    <div className="p-4 lg:p-8 space-y-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Leads Database</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} of {leads.length} businesses · scraped from 6 Indian directories
          </p>
        </div>
        <Button onClick={() => setView("generate")} className="bg-emerald-600 hover:bg-emerald-700">
          + Generate more leads
        </Button>
      </div>

      {/* Filters bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="size-3.5" /> Filters
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="lg:col-span-1">
              <Input
                placeholder="Search name, city, phone…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
              />
            </div>

            {/* Industry */}
            <Select
              value={filterIndustry}
              onValueChange={(v) => {
                setFilterIndustry(v as any);
                resetPage();
              }}
            >
              <SelectTrigger><SelectValue placeholder="Industry" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Industries</SelectItem>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Website filter */}
            <Select
              value={filterWebsite}
              onValueChange={(v) => {
                setFilterWebsite(v as any);
                resetPage();
              }}
            >
              <SelectTrigger><SelectValue placeholder="Website" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Websites</SelectItem>
                <SelectItem value="none">No Website</SelectItem>
                <SelectItem value="old">Old Website</SelectItem>
                <SelectItem value="broken">Broken Website</SelectItem>
                <SelectItem value="modern">Modern Website</SelectItem>
              </SelectContent>
            </Select>

            {/* Status */}
            <Select
              value={filterStatus}
              onValueChange={(v) => {
                setFilterStatus(v as any);
                resetPage();
              }}
            >
              <SelectTrigger><SelectValue placeholder="CRM Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                {STATUS_LIST.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as any)}
            >
              <SelectTrigger>
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="size-3.5" />
                  <SelectValue placeholder="Sort" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aiScore">AI Score (high → low)</SelectItem>
                <SelectItem value="revenue">Revenue Potential</SelectItem>
                <SelectItem value="reviews">Most Reviews</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Review range */}
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border">
            <span className="text-xs font-semibold text-muted-foreground">Reviews range:</span>
            <Input
              type="number"
              min={0}
              value={minReviews}
              onChange={(e) => {
                setMinReviews(Number(e.target.value));
                resetPage();
              }}
              className="w-24 h-8"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="number"
              min={0}
              value={maxReviews}
              onChange={(e) => {
                setMaxReviews(Number(e.target.value));
                resetPage();
              }}
              className="w-24 h-8"
            />

            {/* Quick filters */}
            <div className="flex flex-wrap gap-1.5 ml-auto">
              <Button
                size="sm"
                variant={filterWebsite === "none" ? "default" : "outline"}
                onClick={() => { setFilterWebsite(filterWebsite === "none" ? "all" : "none"); resetPage(); }}
                className="h-7 text-xs"
              >
                <GlobeLock className="size-3 mr-1" /> No Website ({leads.filter((l) => l.websiteStatus === "none").length})
              </Button>
              <Button
                size="sm"
                variant={filterWebsite === "old" ? "default" : "outline"}
                onClick={() => { setFilterWebsite(filterWebsite === "old" ? "all" : "old"); resetPage(); }}
                className="h-7 text-xs"
              >
                Old Website ({leads.filter((l) => l.websiteStatus === "old").length})
              </Button>
              <Button
                size="sm"
                variant={sortBy === "aiScore" && filterIndustry === "All" ? "default" : "outline"}
                onClick={() => {
                  setSortBy("aiScore");
                  resetPage();
                }}
                className="h-7 text-xs"
              >
                <Flame className="size-3 mr-1 text-orange-500" /> Hot Leads ({leads.filter((l) => l.aiScore >= 85).length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Business</th>
                <th className="px-3 py-3 font-semibold hidden md:table-cell">Contact</th>
                <th className="px-3 py-3 font-semibold">Website</th>
                <th className="px-3 py-3 font-semibold hidden lg:table-cell">Location</th>
                <th className="px-3 py-3 font-semibold hidden lg:table-cell">Google</th>
                <th className="px-3 py-3 font-semibold">AI Score</th>
                <th className="px-3 py-3 font-semibold hidden xl:table-cell">Revenue</th>
                <th className="px-3 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                    No leads match your filters.
                    <Button variant="link" onClick={() => {
                      setSearch("");
                      setFilterIndustry("All");
                      setFilterWebsite("all");
                      setFilterStatus("All");
                      setMinReviews(0);
                      setMaxReviews(500);
                    }}>
                      Reset filters
                    </Button>
                  </td>
                </tr>
              )}
              {paged.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => selectLead(l.id)}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {l.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate max-w-[200px]">{l.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span>{l.category}</span>
                          <span>·</span>
                          <span className="text-[10px] px-1 py-0.5 rounded bg-muted">{l.source}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="size-3" /> {l.phone}</span>
                      {l.email ? (
                        <span className="flex items-center gap-1 truncate max-w-[160px]"><Mail className="size-3" /> {l.email}</span>
                      ) : (
                        <span className="text-rose-500 italic">no email</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <WebsiteBadge status={l.websiteStatus} />
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell text-xs">
                    <div className="font-medium">{l.city}</div>
                    <div className="text-muted-foreground">{l.state}</div>
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    {l.googleRating !== null ? (
                      <div className="flex items-center gap-1.5">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-sm">{l.googleRating.toFixed(1)}</span>
                        <span className="text-[11px] text-muted-foreground">({l.reviews})</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "size-9 rounded-md flex items-center justify-center font-bold text-sm",
                        l.aiScore >= 85 ? "bg-orange-500/15 text-orange-600 dark:text-orange-400" :
                        l.aiScore >= 70 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                        l.aiScore >= 55 ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {l.aiScore}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "size-2.5",
                                i < l.stars
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden xl:table-cell">
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <IndianRupee className="size-3 text-emerald-500" />
                      {l.revenuePotential}K
                    </div>
                    <div className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider mt-0.5",
                      l.revenueTier === "Premium" ? "text-emerald-600 dark:text-emerald-400" :
                      l.revenueTier === "High" ? "text-teal-600 dark:text-teal-400" :
                      l.revenueTier === "Medium" ? "text-amber-600 dark:text-amber-400" :
                      "text-muted-foreground"
                    )}>
                      {l.revenueTier}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold",
                      STATUS_COLORS[l.status]
                    )}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm px-2 font-medium">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function WebsiteBadge({ status }: { status: string }) {
  if (status === "none") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
        <GlobeLock className="size-3" /> No Website
      </span>
    );
  }
  if (status === "old") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
        <Globe className="size-3" /> Old
      </span>
    );
  }
  if (status === "broken") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20 text-[10px] font-semibold">
        <Globe className="size-3" /> Broken
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
      <Globe className="size-3" /> Modern
    </span>
  );
}
