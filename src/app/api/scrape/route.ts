/**
 * POST /api/scrape
 *
 * Streams real-time scraping progress as Server-Sent Events.
 *
 * Body: { query, city, state, country, count, industry }
 * Response: SSE stream of { step, pct, count? } events,
 *           ending with { done: true, leads: Lead[] }
 */
import { NextRequest } from "next/server";
import { scrapeGoogleMaps, ScrapeProgress, ScrapedBusiness } from "@/lib/scraper";
import { enrichLead, Lead } from "@/lib/leads-data";
import type { Industry } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 600; // 10 min — Playwright + per-place visits need time
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, city, state, country, count, industry } = body as {
    query: string;
    city: string;
    state: string;
    country: string;
    count: number;
    industry: Industry | "All";
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
        send({ step: "Starting real scraper…", pct: 0 });

        const onProgress = (p: ScrapeProgress) => {
          send({ type: "progress", ...p });
        };

        const scraped: ScrapedBusiness[] = await scrapeGoogleMaps(
          query,
          city,
          state || "",
          country || "India",
          Math.min(count || 8, 20),
          onProgress,
          abortController.signal
        );

        send({
          type: "progress",
          step: `Computing AI scores & revenue potential for ${scraped.length} leads…`,
          pct: 95,
        });

        // Enrich: compute AI score, revenue tier, stars, status, social activity
        const leads: Lead[] = scraped.map((b, i) =>
          enrichLead(b, industry, i)
        );

        send({ type: "done", leads, count: leads.length });
      } catch (err: any) {
        console.error("[/api/scrape] error:", err);
        // Translate common Playwright errors to user-friendly messages
        let message = err?.message || "Scraping failed";
        if (message.includes("Target closed") || message.includes("Browser closed")) {
          message = "Headless browser crashed. Try again with a smaller batch.";
        } else if (message.includes("Timeout") || message.includes("timeout")) {
          message = "Scraping timed out (Google Maps took too long to load). Try again with fewer leads.";
        } else if (message.includes("net::ERR") || message.includes("ECONNRESET")) {
          message = "Network error reaching Google Maps. Please retry in a minute.";
        } else if (message.includes("aborted")) {
          message = "Scraping was cancelled.";
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
