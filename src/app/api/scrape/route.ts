/**
 * POST /api/scrape
 *
 * Streams real-time scraping progress as Server-Sent Events.
 *
 * Body: { query, city, state, country, count, industry, source }
 *   - source: "google-maps" | "indiamart" | "tradeindia"
 *
 * Response: SSE stream of { step, pct, count? } events,
 *           ending with { done: true, leads: Lead[] }
 */
import { NextRequest } from "next/server";
import { ScrapeProgress, ScrapedBusiness } from "@/lib/scraper";
import {
  scrapeIndiaMART,
  scrapeTradeIndia,
  ScrapeProgress as SDProgress,
  ScrapedBusiness as SDBusiness,
} from "@/lib/scrapers-scrapedo";
import { enrichLead, Lead } from "@/lib/leads-data";
import type { Industry, DataSource } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 600;
export const dynamic = "force-dynamic";

type Source = "google-maps" | "indiamart" | "tradeindia";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, city, state, country, count, industry, source } = body as {
    query: string;
    city: string;
    state: string;
    country: string;
    count: number;
    industry: Industry | "All";
    source: Source;
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
        const safeCount = Math.min(count || 5, source === "google-maps" ? 10 : 30);

        if (source === "google-maps") {
          // Use the existing Playwright-based scraper
          const { scrapeGoogleMaps } = await import("@/lib/scraper");
          scraped = await scrapeGoogleMaps(
            query, city, state || "", country || "India",
            safeCount, onProgress, abortController.signal
          );
        } else if (source === "indiamart") {
          scraped = await scrapeIndiaMART(
            query, city, state || "", country || "India",
            safeCount, onProgress, abortController.signal
          );
        } else if (source === "tradeindia") {
          scraped = await scrapeTradeIndia(
            query, city, state || "", country || "India",
            safeCount, onProgress, abortController.signal
          );
        } else {
          throw new Error(`Unknown source: ${source}`);
        }

        send({
          type: "progress",
          step: `Computing AI scores & revenue potential for ${scraped.length} leads…`,
          pct: 95,
        });

        // Enrich: compute AI score, revenue tier, stars, status, social activity
        const leads: Lead[] = scraped.map((b, i) =>
          enrichLead(b as SDBusiness & { source: DataSource }, industry, i)
        );

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
