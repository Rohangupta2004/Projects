"use client";

import { useStore } from "@/lib/store";
import { STATUS_COLORS, STATUS_LIST } from "@/lib/leads-data";
import type { LeadStatus } from "@/lib/types";
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
  TrendingUp,
  IndianRupee,
  Flame,
  Globe,
  ArrowRight,
  Target,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const STAGES: { key: LeadStatus; icon: any; tint: string }[] = [
  { key: "New", icon: Target, tint: "#0ea5e9" },
  { key: "Called", icon: Phone, tint: "#8b5cf6" },
  { key: "Interested", icon: Flame, tint: "#f59e0b" },
  { key: "Meeting", icon: Calendar, tint: "#14b8a6" },
  { key: "Proposal Sent", icon: TrendingUp, tint: "#f97316" },
  { key: "Won", icon: CheckCircle2, tint: "#10b981" },
];

export function PipelineView() {
  const leads = useStore((s) => s.leads);
  const selectLead = useStore((s) => s.selectLead);
  const updateLeadStatus = useStore((s) => s.updateLeadStatus);
  const setView = useStore((s) => s.setView);

  const byStatus = useMemo(() => {
    const map = {} as Record<LeadStatus, typeof leads>;
    STATUS_LIST.forEach((s) => (map[s] = []));
    leads.forEach((l) => map[l.status].push(l));
    return map;
  }, [leads]);

  const totalValue = leads.reduce((a, l) => a + l.revenuePotential, 0) * 20;
  const wonValue = byStatus["Won"].reduce((a, l) => a + l.revenuePotential, 0) * 20;
  const conversionRate =
    leads.length > 0
      ? ((byStatus["Won"].length / leads.length) * 100).toFixed(1)
      : "0";

  // Empty state
  if (leads.length === 0) {
    return (
      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag leads through your funnel — but first, generate some.
          </p>
        </div>
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardContent className="p-10 lg:p-16 text-center">
            <div className="size-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
              <GitBranch className="size-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl lg:text-2xl font-bold mb-2">Pipeline is empty</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Your CRM has no leads yet. Generate some with the real Playwright scraper to start
              tracking them through your sales stages.
            </p>
            <Button
              onClick={() => setView("generate")}
              className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6"
            >
              <Zap className="size-4 mr-1.5" /> Generate Leads
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drag leads through your funnel · {leads.length} total · ₹{(totalValue / 1000).toFixed(1)}M potential
          </p>
        </div>
        <Button onClick={() => setView("generate")} className="bg-emerald-600 hover:bg-emerald-700">
          + Generate more leads
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Target className="size-3.5" /> Total Leads
            </div>
            <div className="text-2xl font-bold">{leads.length}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              +{byStatus["New"].length} new this week
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <IndianRupee className="size-3.5" /> Won Value
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ₹{(wonValue / 100).toFixed(1)}L
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {byStatus["Won"].length} deals closed
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="size-3.5" /> Conversion Rate
            </div>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <div className="text-[11px] text-muted-foreground mt-1">New → Won</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="size-3.5" /> Avg. Cycle
            </div>
            <div className="text-2xl font-bold">12 days</div>
            <div className="text-[11px] text-muted-foreground mt-1">First contact → close</div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban-style funnel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAGES.map((stage) => {
          const stageLeads = byStatus[stage.key];
          const stageValue = stageLeads.reduce((a, l) => a + l.revenuePotential, 0) * 20;
          return (
            <div key={stage.key} className="flex flex-col gap-2">
              <div
                className="rounded-lg p-3 border-t-4 bg-card"
                style={{ borderTopColor: stage.tint }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <stage.icon className="size-4" style={{ color: stage.tint }} />
                    <span className="font-semibold text-sm">{stage.key}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {stageLeads.length}
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  ₹{(stageValue / 100).toFixed(1)}L potential
                </div>
              </div>

              <div className="space-y-2 min-h-[100px]">
                {stageLeads.slice(0, 5).map((l) => (
                  <div
                    key={l.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectLead(l.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectLead(l.id); } }}
                    className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-emerald-500/40 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="font-medium text-xs truncate flex-1">{l.name}</div>
                      <div
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${stage.tint}15`,
                          color: stage.tint,
                        }}
                      >
                        {l.aiScore}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <span>{l.city}</span>
                      <span>·</span>
                      <span>₹{l.revenuePotential}K</span>
                    </div>
                    {l.websiteStatus === "none" && (
                      <div className="mt-1.5 text-[9px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold">
                        <Globe className="size-2.5" /> No website opportunity
                      </div>
                    )}

                    {/* Quick status changer */}
                    <div
                      className="mt-2 pt-2 border-t border-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Select
                        value={l.status}
                        onValueChange={(v) => updateLeadStatus(l.id, v as LeadStatus)}
                      >
                        <SelectTrigger className="h-6 text-[10px] px-2 py-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_LIST.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                {stageLeads.length > 5 && (
                  <button
                    onClick={() => setView("leads")}
                    className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground py-1.5"
                  >
                    + {stageLeads.length - 5} more…
                  </button>
                )}
                {stageLeads.length === 0 && (
                  <div className="text-center text-[11px] text-muted-foreground italic py-6">
                    No leads
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lost & Follow up */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {(["Lost", "Follow Up"] as LeadStatus[]).map((status) => {
          const list = byStatus[status];
          const Icon = status === "Lost" ? XCircle : Clock;
          const tint = status === "Lost" ? "#f43f5e" : "#64748b";
          return (
            <Card key={status}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="size-4" style={{ color: tint }} />
                  <CardTitle className="text-base">{status}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{list.length}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setView("leads")}>
                  View all <ArrowRight className="size-3" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
                {list.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground italic py-6">
                    No leads in this stage
                  </div>
                )}
                {list.slice(0, 6).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => selectLead(l.id)}
                    className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-muted/60 transition-colors"
                  >
                    <div className="size-8 rounded-md bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {l.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{l.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {l.city} · ₹{l.revenuePotential}K
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {l.lastUpdated.slice(0, 10)}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
