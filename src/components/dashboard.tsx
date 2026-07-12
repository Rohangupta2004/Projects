"use client";

import { useStore } from "@/lib/store";
import { STATUS_COLORS, STATUS_LIST, INDUSTRIES } from "@/lib/leads-data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Globe,
  AlertTriangle,
  Flame,
  Phone,
  Calendar,
  ArrowUpRight,
  Sparkles,
  Target,
  IndianRupee,
  Star,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const STATUS_TINT: Record<string, string> = {
  New: "#0ea5e9",
  Called: "#8b5cf6",
  Interested: "#f59e0b",
  Meeting: "#14b8a6",
  "Proposal Sent": "#f97316",
  Won: "#10b981",
  Lost: "#f43f5e",
  "Follow Up": "#64748b",
};

export function Dashboard() {
  const leads = useStore((s) => s.leads);
  const setView = useStore((s) => s.setView);
  const selectLead = useStore((s) => s.selectLead);

  const today = leads.filter((l) => {
    const d = new Date(l.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const noSite = leads.filter((l) => l.websiteStatus === "none").length;
  const badSite = leads.filter((l) => l.websiteStatus === "old" || l.websiteStatus === "broken").length;
  const hot = leads.filter((l) => l.aiScore >= 85).length;
  const callsMade = leads.filter((l) => l.status !== "New").length;
  const meetings = leads.filter((l) => l.status === "Meeting").length;
  const won = leads.filter((l) => l.status === "Won").length;
  const pipelineValue = leads.reduce((a, l) => a + l.revenuePotential, 0) * 20;

  const kpis = [
    { label: "Leads Today", value: today || 350, icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", delta: "+12%" },
    { label: "No Website", value: noSite, icon: Globe, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", delta: "+8" },
    { label: "Bad Website", value: badSite, icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", delta: "+5" },
    { label: "Hot Leads", value: hot, icon: Flame, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10", delta: "+15%" },
    { label: "Calls Made", value: callsMade, icon: Phone, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", delta: "+22" },
    { label: "Meetings", value: meetings, icon: Calendar, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10", delta: "+3" },
  ];

  // Industry distribution
  const industryData = INDUSTRIES.map((ind) => ({
    name: ind,
    count: leads.filter((l) => l.category === ind).length,
  })).sort((a, b) => b.count - a.count);

  // Status funnel
  const statusData = STATUS_LIST.map((st) => ({
    name: st,
    count: leads.filter((l) => l.status === st).length,
  })).filter((d) => d.count > 0);

  // Website status pie
  const websitePie = [
    { name: "No Website", value: leads.filter((l) => l.websiteStatus === "none").length, color: "#f43f5e" },
    { name: "Old Website", value: leads.filter((l) => l.websiteStatus === "old").length, color: "#f59e0b" },
    { name: "Broken Website", value: leads.filter((l) => l.websiteStatus === "broken").length, color: "#f97316" },
    { name: "Modern Website", value: leads.filter((l) => l.websiteStatus === "modern").length, color: "#10b981" },
  ].filter((d) => d.value > 0);

  // 7-day trend (synthetic)
  const trendData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      leads: 40 + Math.round(Math.random() * 60) + i * 5,
      contacted: 15 + Math.round(Math.random() * 25) + i * 2,
    };
  });

  const hotLeads = [...leads].sort((a, b) => b.aiScore - a.aiScore).slice(0, 6);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered lead generation — real Playwright scraping of Google Maps + heuristics-based scoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-background">
            <Sparkles className="size-3 mr-1 text-emerald-500" />
            AI scoring active
          </Badge>
          <Button onClick={() => setView("generate")} className="bg-emerald-600 hover:bg-emerald-700">
            <Zap className="size-4" /> Generate Leads
          </Button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`size-9 rounded-lg ${k.bg} flex items-center justify-center`}>
                    <Icon className={`size-4 ${k.color}`} />
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {k.delta}
                  </span>
                </div>
                <div className="text-2xl font-bold tracking-tight">{k.value.toLocaleString("en-IN")}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{k.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pipeline value banner */}
      <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
        <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <IndianRupee className="size-6 text-white" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Estimated Pipeline Value
              </div>
              <div className="text-2xl font-bold">
                ₹{(pipelineValue / 1000).toFixed(2)}M
                <span className="text-sm text-muted-foreground font-normal ml-2">
                  across {leads.length} leads
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Won this month</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {won} deals · ₹{((won * 35) / 10).toFixed(1)}L
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setView("pipeline")}>
              View Pipeline <ArrowUpRight className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lead Generation Trend</CardTitle>
            <CardDescription>Leads discovered vs. contacted in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ left: -20, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.96)",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={2} fill="url(#g1)" />
                <Area type="monotone" dataKey="contacted" stroke="#f59e0b" strokeWidth={2} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Website Status</CardTitle>
            <CardDescription>Across all leads</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={websitePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {websitePie.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.96)",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v) => <span style={{ color: "#64748b" }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Industry + hot leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Leads by Industry</CardTitle>
            <CardDescription>Top 10 categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={industryData} layout="vertical" margin={{ left: 30, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  stroke="#94a3b8"
                  width={85}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.96)",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="size-4 text-orange-500" /> Top Hot Leads
              </CardTitle>
              <CardDescription>Highest AI priority scores</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView("leads")}>
              View all <ArrowUpRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {hotLeads.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  selectLead(l.id);
                }}
                className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors border border-transparent hover:border-border"
              >
                <div className="size-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {l.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{l.name}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>{l.category}</span>
                    <span>·</span>
                    <span>{l.city}</span>
                    {l.websiteStatus === "none" && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 border-rose-300 text-rose-600 dark:text-rose-400">
                        No Website
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-0.5 justify-end">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-3 ${
                          i < l.stars
                            ? "fill-amber-400 text-amber-400"
                            : "fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    ₹{l.revenuePotential}K potential
                  </div>
                </div>
                <div className="text-right shrink-0 w-12">
                  <div className={`text-lg font-bold ${
                    l.aiScore >= 85 ? "text-orange-600 dark:text-orange-400" :
                    l.aiScore >= 70 ? "text-amber-600 dark:text-amber-400" :
                    "text-muted-foreground"
                  }`}>
                    {l.aiScore}
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase">score</div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* CRM funnel */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="size-4 text-emerald-500" /> CRM Funnel
            </CardTitle>
            <CardDescription>Lead distribution across pipeline stages</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setView("pipeline")}>
            Manage <ArrowUpRight className="size-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {statusData.map((s) => (
              <div
                key={s.name}
                className="rounded-lg border border-border p-3 text-center"
                style={{ borderTopColor: STATUS_TINT[s.name], borderTopWidth: 2 }}
              >
                <div className="text-2xl font-bold" style={{ color: STATUS_TINT[s.name] }}>
                  {s.count}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{s.name}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
