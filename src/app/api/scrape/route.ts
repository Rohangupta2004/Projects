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
export const maxDuration = 300; // 5 min — Playwright needs time
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
          Math.min(count || 15, 30),
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
        send({
          type: "error",
          message: err?.message || "Scraping failed",
        });
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
