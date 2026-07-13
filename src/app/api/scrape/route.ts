/**
 * POST /api/scrape
 *
 * Streams real-time scraping progress as Server-Sent Events.
 *
 * Body: { query, city, state, country, count, industry, source, enrichWebsites }
 *   - source: "google-maps" | "indiamart" | "tradeindia" | "all"
 *   - enrichWebsites: boolean — if true, fetch each lead's official website
 *     to extract email + social links + website status
 *
 * Response: SSE stream of { step, pct, count? } events,
 *           ending with { done: true, leads: Lead[] }
 */
import { NextRequest } from "next/server";
import { ScrapeProgress, ScrapedBusiness } from "@/lib/scraper";
import {
  scrapeIndiaMART,
  scrapeTradeIndia,
  enrichWebsite,
  ScrapeProgress as SDProgress,
  ScrapedBusiness as SDBusiness,
} from "@/lib/scrapers-scrapedo";
import { enrichLead, Lead } from "@/lib/leads-data";
import type { Industry, DataSource } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 600;
export const dynamic = "force-dynamic";

type Source = "google-maps" | "indiamart" | "tradeindia" | "all";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, city, state, country, count, industry, source, enrichWebsites } = body as {
    query: string;
    city: string;
    state: string;
    country: string;
    count: number;
    industry: Industry | "All";
    source: Source;
    enrichWebsites?: boolean;
  };

  if (!query || !city) {
    return new Response(JSON.stringify({ error: "query and city required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const abortController = new AbortController();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        send({ step: `Starting ${source} scraper…`, pct: 0 });

        const onProgress = (p: ScrapeProgress | SDProgress) => {
          send({ type: "progress", ...p });
        };

        let scraped: (ScrapedBusiness | SDBusiness)[] = [];

        if (source === "all") {
          // Run all three scrapers in parallel with smaller per-source batches
          const perSource = Math.max(3, Math.ceil((count || 9) / 3));
          send({
            type: "progress",
            step: `Scraping all 3 sources in parallel (${perSource} each = ${perSource * 3} total)…`,
            pct: 10,
          });

          const { scrapeGoogleMaps } = await import("@/lib/scraper");
          const [gm, im, ti] = await Promise.allSettled([
            scrapeGoogleMaps(query, city, state || "", country || "India", perSource,
              (p) => send({ type: "progress", step: `[Google Maps] ${p.step}`, pct: 10 + Math.round(p.pct * 0.25) }),
              abortController.signal),
            scrapeIndiaMART(query, city, state || "", country || "India", perSource,
              (p) => send({ type: "progress", step: `[IndiaMART] ${p.step}`, pct: 35 + Math.round(p.pct * 0.25) }),
              abortController.signal),
            scrapeTradeIndia(query, city, state || "", country || "India", perSource,
              (p) => send({ type: "progress", step: `[TradeIndia] ${p.step}`, pct: 60 + Math.round(p.pct * 0.25) }),
              abortController.signal),
          ]);

          if (gm.status === "fulfilled") scraped.push(...gm.value);
          if (im.status === "fulfilled") scraped.push(...im.value);
          if (ti.status === "fulfilled") scraped.push(...ti.value);

          // Deduplicate by name (case-insensitive)
          const seen = new Set<string>();
          scraped = scraped.filter((b) => {
            const key = b.name.toLowerCase().trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          send({
            type: "progress",
            step: `All sources done. Got ${scraped.length} unique businesses.`,
            pct: 88,
          });
        } else if (source === "google-maps") {
          const { scrapeGoogleMaps } = await import("@/lib/scraper");
          scraped = await scrapeGoogleMaps(
            query, city, state || "", country || "India",
            Math.min(count || 5, 10), onProgress, abortController.signal
          );
        } else if (source === "indiamart") {
          scraped = await scrapeIndiaMART(
            query, city, state || "", country || "India",
            Math.min(count || 10, 30), onProgress, abortController.signal
          );
        } else if (source === "tradeindia") {
          scraped = await scrapeTradeIndia(
            query, city, state || "", country || "India",
            Math.min(count || 10, 30), onProgress, abortController.signal
          );
        } else {
          throw new Error(`Unknown source: ${source}`);
        }

        // Enrich leads with AI score, revenue tier, etc.
        send({
          type: "progress",
          step: `Computing AI scores & revenue potential for ${scraped.length} leads…`,
          pct: enrichWebsites ? 90 : 95,
        });

        let leads: Lead[] = scraped.map((b, i) =>
          enrichLead(b as SDBusiness & { source: DataSource }, industry, i)
        );

        // Optional: enrich each lead with data from their official website
        if (enrichWebsites && leads.length > 0) {
          const withSites = leads.filter((l) => l.website);
          if (withSites.length > 0) {
            send({
              type: "progress",
              step: `Visiting ${withSites.length} official websites in parallel for emails & socials…`,
              pct: 92,
            });

            // Visit websites in parallel (batches of 3 to avoid rate limits)
            const batchSize = 3;
            for (let batchStart = 0; batchStart < withSites.length; batchStart += batchSize) {
              if (abortController.signal.aborted) throw new Error("aborted");
              const batch = withSites.slice(batchStart, batchStart + batchSize);
              const batchNum = Math.floor(batchStart / batchSize) + 1;
              const totalBatches = Math.ceil(withSites.length / batchSize);
              send({
                type: "progress",
                step: `Enriching batch ${batchNum}/${totalBatches} (${batch.length} sites in parallel)…`,
                pct: 92 + Math.round(((batchStart + batch.length) / withSites.length) * 6),
              });

              // Process this batch in parallel
              const enrichments = await Promise.allSettled(
                batch.map((lead) => enrichWebsite(lead.website!))
              );

              // Apply successful enrichments
              const enrichmentMap = new Map<string, any>();
              batch.forEach((lead, i) => {
                const r = enrichments[i];
                if (r.status === "fulfilled") {
                  enrichmentMap.set(lead.id, r.value);
                }
              });

              leads = leads.map((l) => {
                const enr = enrichmentMap.get(l.id);
                if (!enr) return l;
                return {
                  ...l,
                  email: enr.email || l.email,
                  facebook: enr.facebook || l.facebook,
                  instagram: enr.instagram || l.instagram,
                  linkedin: enr.linkedin || l.linkedin,
                  websiteStatus: enr.websiteStatus,
                  websiteScore: enr.websiteScore,
                };
              });
            }

            send({
              type: "progress",
              step: `Website enrichment complete.`,
              pct: 98,
            });
          }
        }

        send({ type: "done", leads, count: leads.length });
      } catch (err: any) {
        console.error("[/api/scrape] error:", err);
        let message = err?.message || "Scraping failed";
        if (message.includes("Target closed") || message.includes("Browser closed")) {
          message = "Headless browser crashed. Try again with a smaller batch.";
        } else if (message.includes("Timeout") || message.includes("timeout")) {
          message = "Scraping timed out. Try again with fewer leads.";
        } else if (message.includes("net::ERR") || message.includes("ECONNRESET")) {
          message = "Network error reaching the source. Please retry in a minute.";
        } else if (message.includes("aborted")) {
          message = "Scraping was cancelled.";
        } else if (message.includes("scrape.do")) {
          message = "Scrape.do proxy error: " + message;
        }
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
