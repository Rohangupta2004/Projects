"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { STATUS_COLORS, STATUS_LIST } from "@/lib/leads-data";
import type { LeadStatus } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Phone,
  Mail,
  Globe,
  GlobeLock,
  Instagram,
  Facebook,
  Linkedin,
  Star,
  MapPin,
  Sparkles,
  IndianRupee,
  TrendingUp,
  Zap,
  Gauge,
  Palette,
  Search,
  Smartphone,
  Copy,
  MessageCircle,
  PhoneCall,
  Linkedin as LinkedinIcon,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function LeadDetailPanel() {
  const selectedLeadId = useStore((s) => s.selectedLeadId);
  const selectLead = useStore((s) => s.selectLead);
  const leads = useStore((s) => s.leads);
  const updateLeadStatus = useStore((s) => s.updateLeadStatus);
  const [outreachTab, setOutreachTab] = useState("whatsapp");
  const [copied, setCopied] = useState<string | null>(null);

  const lead = leads.find((l) => l.id === selectedLeadId);

  const isOpen = !!lead;

  const outreach = useMemo(() => {
    if (!lead) return null;
    return generateOutreach(lead);
  }, [lead]);

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && selectLead(null)}>
      <SheetContent className="w-full sm:max-w-2xl p-0 overflow-y-auto">
        {lead && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-5 border-b border-border bg-gradient-to-br from-emerald-500/5 to-transparent">
              <div className="flex items-start gap-3">
                <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shrink-0">
                  {lead.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <SheetHeader className="p-0 space-y-0">
                    <SheetTitle className="text-lg leading-tight">{lead.name}</SheetTitle>
                    <SheetDescription className="flex items-center gap-2 mt-1 flex-wrap">
                      <span>{lead.category}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><MapPin className="size-3" /> {lead.city}, {lead.state}</span>
                    </SheetDescription>
                  </SheetHeader>
                </div>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => selectLead(null)}>
                  <X className="size-4" />
                </Button>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <Select
                  value={lead.status}
                  onValueChange={(v) => updateLeadStatus(lead.id, v as LeadStatus)}
                >
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LIST.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {lead.phone && (
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <PhoneCall className="size-3.5 mr-1" /> Call
                  </Button>
                )}
                {lead.website && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                    <a href={lead.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="size-3.5 mr-1" /> Visit
                    </a>
                  </Button>
                )}
                <Badge className={cn("text-[10px] border", STATUS_COLORS[lead.status])}>
                  {lead.status}
                </Badge>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 p-5 space-y-5 overflow-y-auto">
              {/* AI Score Card — the hero */}
              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="size-4 text-emerald-500" />
                  <span className="text-sm font-semibold">AI Priority Score</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">Auto-generated</span>
                </div>
                <div className="flex items-end gap-4 mb-3">
                  <div className="text-5xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">
                    {lead.aiScore}
                    <span className="text-lg text-muted-foreground font-normal">/100</span>
                  </div>
                  <div className="flex gap-0.5 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-5",
                          i < lead.stars
                            ? "fill-amber-400 text-amber-400"
                            : "fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700"
                        )}
                      />
                    ))}
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</div>
                    <div className="font-bold text-sm">
                      {lead.stars === 5 ? "★★★★★ Critical" :
                       lead.stars === 4 ? "★★★★ High" :
                       lead.stars === 3 ? "★★★ Medium" :
                       lead.stars === 2 ? "★★ Low" : "★ Cold"}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed bg-background/60 rounded-lg p-3 border border-border">
                  <span className="font-semibold text-foreground">AI says:</span> {lead.aiReason}.
                  {" "}{lead.socialActivity}. Likely to {lead.websiteStatus === "none" ? "buy a new website" : lead.websiteStatus === "modern" ? "need upgrades / SEO retainer" : "need a website redesign"}.
                </div>
              </div>

              {/* Revenue Potential Score — the unique feature */}
              <div className="rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <IndianRupee className="size-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Website Revenue Potential</div>
                      <div className="text-[10px] text-muted-foreground">Unique to LeadForge AI</div>
                    </div>
                  </div>
                  <Badge className={cn(
                    "text-[10px]",
                    lead.revenueTier === "Premium" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" :
                    lead.revenueTier === "High" ? "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30" :
                    lead.revenueTier === "Medium" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {lead.revenueTier} budget
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-bold">₹{lead.revenuePotential}K</span>
                  <span className="text-xs text-muted-foreground">estimated project value</span>
                </div>
                {/* Bar */}
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      lead.revenueTier === "Premium" ? "bg-gradient-to-r from-emerald-500 to-teal-500" :
                      lead.revenueTier === "High" ? "bg-teal-500" :
                      lead.revenueTier === "Medium" ? "bg-amber-500" :
                      "bg-slate-400"
                    )}
                    style={{ width: `${Math.min(100, (lead.revenuePotential / 80) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>₹10K</span><span>₹40K</span><span>₹80K+</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-3 leading-relaxed bg-muted/40 rounded-md p-2.5">
                  <span className="font-semibold text-foreground">Why this number?</span> Based on
                  {" "}{lead.category} industry baseline, {lead.reviews} Google reviews
                  {" "}(establishment signal), {lead.city} market rates, and existing web investment
                  {" "}({lead.websiteStatus === "modern" ? "already spends on web" : "no web spend yet"}).
                </div>
              </div>

              {/* Website Score Breakdown */}
              {lead.websiteScore ? (
                <div className="rounded-xl border border-border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Gauge className="size-4 text-emerald-500" />
                      <span className="text-sm font-semibold">Website Score Breakdown</span>
                    </div>
                    <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      Overall: {lead.websiteScore.overall}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Speed", value: lead.websiteScore.speed, icon: Gauge, color: "emerald" },
                      { label: "Design", value: lead.websiteScore.design, icon: Palette, color: "teal" },
                      { label: "SEO", value: lead.websiteScore.seo, icon: Search, color: "amber" },
                      { label: "Mobile", value: lead.websiteScore.mobile, icon: Smartphone, color: "violet" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <s.icon className="size-3.5" /> {s.label}
                          </div>
                          <span className={cn(
                            "text-sm font-bold",
                            s.value >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                            s.value >= 40 ? "text-amber-600 dark:text-amber-400" :
                            "text-rose-600 dark:text-rose-400"
                          )}>
                            {s.value}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              s.value >= 70 ? "bg-emerald-500" :
                              s.value >= 40 ? "bg-amber-500" :
                              "bg-rose-500"
                            )}
                            style={{ width: `${s.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : lead.website ? (
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="size-4 text-sky-500" />
                    <span className="text-sm font-semibold">Website Found</span>
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-xs text-sky-600 dark:text-sky-400 hover:underline truncate max-w-[200px]"
                    >
                      {lead.website}
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    URL scraped from Google Maps. To grade this site (Speed / Design / SEO / Mobile),
                    run a follow-up audit — would require a second Playwright pass per site.
                    For now, treat the website's existence as a neutral signal in the AI score.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <GlobeLock className="size-4 text-rose-500" />
                    <span className="text-sm font-semibold">No Website Detected</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This business has no online presence beyond Google Maps. High-intervention
                    opportunity — they need a website from scratch. Estimated 7-14 day project, ₹{lead.revenuePotential}K value.
                  </p>
                </div>
              )}

              {/* AI Recommendation */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="size-4 text-emerald-500" />
                  <span className="text-sm font-semibold">AI Recommendation</span>
                </div>
                <div className="text-sm leading-relaxed">
                  Instead of <span className="line-through text-muted-foreground">"Contact this company"</span>,
                  {" "}AI says:
                </div>
                <div className="mt-2 text-sm bg-emerald-500/5 border-l-2 border-emerald-500 pl-3 py-2 rounded-r-md">
                  Owner has{" "}
                  <span className="font-semibold">{lead.websiteStatus === "none" ? "no website" : `an ${lead.websiteStatus} website`}</span>.
                  {" "}Google rating <span className="font-semibold">{lead.googleRating?.toFixed(1) ?? "N/A"}</span> with{" "}
                  <span className="font-semibold">{lead.reviews} reviews</span>.
                  {" "}{lead.socialActivity}.
                  {" "}Likely to {lead.websiteStatus === "none" ? "buy a website" : "redesign"}.
                  {" "}Priority: <span className="font-bold text-amber-600 dark:text-amber-400">{"★".repeat(lead.stars)}</span>
                </div>
              </div>

              {/* Contact info */}
              <div className="rounded-xl border border-border p-5">
                <div className="text-sm font-semibold mb-3">Contact Information</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ContactRow icon={Phone} label="Phone" value={lead.phone} onCopy={() => copy(lead.phone, "phone")} copied={copied === "phone"} />
                  <ContactRow icon={Mail} label="Email" value={lead.email || "Not found"} onCopy={() => lead.email && copy(lead.email, "email")} copied={copied === "email"} missing={!lead.email} />
                  <ContactRow icon={Globe} label="Website" value={lead.website || "None"} onCopy={() => lead.website && copy(lead.website, "site")} copied={copied === "site"} missing={!lead.website} />
                  <ContactRow icon={MapPin} label="Location" value={`${lead.city}, ${lead.state}, ${lead.country}`} onCopy={() => copy(`${lead.city}, ${lead.state}`, "loc")} copied={copied === "loc"} />
                  {lead.facebook && <ContactRow icon={Facebook} label="Facebook" value={lead.facebook} onCopy={() => copy(lead.facebook, "fb")} copied={copied === "fb"} />}
                  {lead.instagram && <ContactRow icon={Instagram} label="Instagram" value={lead.instagram} onCopy={() => copy(lead.instagram, "ig")} copied={copied === "ig"} />}
                  {lead.linkedin && <ContactRow icon={Linkedin} label="LinkedIn" value={lead.linkedin} onCopy={() => copy(lead.linkedin, "li")} copied={copied === "li"} />}
                </div>

                {/* Google rating block */}
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Google Rating</div>
                    {lead.googleRating !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-bold">{lead.googleRating.toFixed(1)}</span>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn("size-3", i < Math.floor(lead.googleRating!) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700")} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">({lead.reviews} reviews)</span>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Not rated</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Source</div>
                    <Badge variant="outline" className="text-[10px]">{lead.source}</Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Last Updated</div>
                    <div className="text-xs">{lead.lastUpdated.slice(0, 10)}</div>
                  </div>
                </div>
              </div>

              {/* Outreach Generator */}
              <div className="rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-emerald-500" />
                    <span className="text-sm font-semibold">Outreach Generator</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">1-click scripts</span>
                </div>
                <Tabs value={outreachTab} onValueChange={setOutreachTab}>
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="whatsapp" className="text-xs"><MessageCircle className="size-3.5 mr-1" /> WhatsApp</TabsTrigger>
                    <TabsTrigger value="email" className="text-xs"><Mail className="size-3.5 mr-1" /> Email</TabsTrigger>
                    <TabsTrigger value="call" className="text-xs"><PhoneCall className="size-3.5 mr-1" /> Call</TabsTrigger>
                    <TabsTrigger value="linkedin" className="text-xs"><LinkedinIcon className="size-3.5 mr-1" /> LinkedIn</TabsTrigger>
                  </TabsList>

                  {outreach && (
                    <>
                      <TabsContent value="whatsapp" className="mt-3">
                        <OutreachCard
                          text={outreach.whatsapp}
                          onCopy={() => copy(outreach.whatsapp, "wa")}
                          copied={copied === "wa"}
                          tone="emerald"
                          hint="Paste into WhatsApp Web"
                        />
                      </TabsContent>
                      <TabsContent value="email" className="mt-3 space-y-2">
                        <div className="text-xs">
                          <span className="text-muted-foreground">Subject:</span>{" "}
                          <span className="font-medium">{outreach.emailSubject}</span>
                        </div>
                        <OutreachCard
                          text={outreach.email}
                          onCopy={() => copy(outreach.email, "em")}
                          copied={copied === "em"}
                          tone="sky"
                          hint="Paste into Gmail / Outlook"
                        />
                      </TabsContent>
                      <TabsContent value="call" className="mt-3">
                        <OutreachCard
                          text={outreach.call}
                          onCopy={() => copy(outreach.call, "cl")}
                          copied={copied === "cl"}
                          tone="violet"
                          hint="Read while on call"
                        />
                      </TabsContent>
                      <TabsContent value="linkedin" className="mt-3">
                        <OutreachCard
                          text={outreach.linkedin}
                          onCopy={() => copy(outreach.linkedin, "li2")}
                          copied={copied === "li2"}
                          tone="sky"
                          hint="Connection request note"
                        />
                      </TabsContent>
                    </>
                  )}
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  onCopy,
  copied,
  missing,
}: {
  icon: any;
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  missing?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/50 transition-colors group">
      <Icon className={cn("size-4 shrink-0", missing ? "text-rose-400" : "text-emerald-500")} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={cn("text-xs truncate", missing && "text-rose-500 italic")}>{value}</div>
      </div>
      {!missing && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onCopy}
        >
          {copied ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </Button>
      )}
    </div>
  );
}

function OutreachCard({
  text,
  onCopy,
  copied,
  tone,
  hint,
}: {
  text: string;
  onCopy: () => void;
  copied: boolean;
  tone: "emerald" | "sky" | "violet";
  hint: string;
}) {
  const toneClass = {
    emerald: "border-emerald-500/30 bg-emerald-500/5",
    sky: "border-sky-500/30 bg-sky-500/5",
    violet: "border-violet-500/30 bg-violet-500/5",
  }[tone];

  return (
    <div className={cn("rounded-lg border p-3 relative", toneClass)}>
      <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed pr-8">{text}</pre>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
        <span className="text-[10px] text-muted-foreground">{hint}</span>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={onCopy}>
          {copied ? <><CheckCircle2 className="size-3 mr-1 text-emerald-500" /> Copied</> : <><Copy className="size-3 mr-1" /> Copy</>}
        </Button>
      </div>
    </div>
  );
}

// ---------- Outreach script generator ----------

function generateOutreach(lead: any) {
  const firstName = lead.name.split(" ")[1] || "there";
  const needLine =
    lead.websiteStatus === "none"
      ? `I noticed ${lead.name} doesn't have a website yet`
      : lead.websiteStatus === "old"
      ? `I came across your website and noticed it could use a refresh`
      : lead.websiteStatus === "broken"
      ? `I tried visiting your website but it seems to be down`
      : `I came across ${lead.name} online`;

  const ratingLine =
    lead.googleRating !== null
      ? `Your Google rating of ${lead.googleRating.toFixed(1)} with ${lead.reviews} reviews shows you're clearly doing great work.`
      : `Your business looks well-established in ${lead.city}.`;

  const socialLine =
    lead.socialActivity !== "Limited social presence"
      ? ` Also noticed you're ${lead.socialActivity.toLowerCase()} — great engagement signal.`
      : "";

  const pitch =
    lead.websiteStatus === "none"
      ? `I help ${lead.category.toLowerCase()} businesses in ${lead.state} get online with fast, mobile-friendly websites that bring in real enquiries. A simple 5-page site with WhatsApp click-to-chat typically pays for itself in 2-3 months.`
      : `I specialize in redesigning websites for ${lead.category.toLowerCase()} businesses — focusing on speed, mobile UX, and SEO so you actually show up when people search "${lead.category.toLowerCase()} in ${lead.city}".`;

  const cta = `Would you be open to a quick 10-minute call this week? I can show you 2-3 mockup ideas for ${lead.name} — no obligation.`;

  return {
    whatsapp: `Hi ${firstName}, this is Rahul from LeadForge. ${needLine}. ${ratingLine}${socialLine}\n\n${pitch}\n\n${cta}\n\n— Rahul\nLeadForge AI`,
    emailSubject: `Quick idea for ${lead.name}'s online presence`,
    email: `Hi ${firstName},\n\n${needLine}. ${ratingLine}${socialLine}\n\n${pitch}\n\n${cta}\n\nBest regards,\nRahul Agarwal\nLeadForge AI\n+91 98765 43210`,
    call: `OPENER: "Hi, is this ${firstName} from ${lead.name}? Hi, this is Rahul from LeadForge — I'll be brief, I promise."\n\nHOOK: ${needLine}. ${ratingLine}${socialLine}\n\nPITCH (15 sec): ${pitch}\n\nCLOSE: ${cta}\n\n[If no → ask for follow-up in 3 months]\n[If yes → book a 10-min Zoom, send calendar invite]`,
    linkedin: `Hi ${firstName}, came across ${lead.name} while researching ${lead.category.toLowerCase()} businesses in ${lead.city}. ${ratingLine} ${needLine} — would love to share some quick ideas. Open to a 10-min chat?`,
  };
}
