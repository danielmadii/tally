import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/supabase";
import { businessDate } from "@/lib/format";

/**
 * Nightly job (vercel.ts cron, runs after the 06:00 business-day cut-off):
 * aggregates the closed business day into daily_summary and reports any
 * stock ledger/cache discrepancies. Protected by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The day that just closed = the business date of 24h ago.
  const closed = businessDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const { data: summary, error } = await db().rpc("rebuild_daily_summary", { p_date: closed });
  if (error) {
    console.error("[cron/summarize]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: discrepancies, error: discError } = await db().rpc("stock_discrepancies");
  if (discError) console.error("[cron/summarize] discrepancy check failed", discError);
  if (discrepancies?.length) {
    console.warn(`[cron/summarize] ${discrepancies.length} stock discrepancies — ledger wins`, discrepancies);
  }

  return NextResponse.json({ summary, discrepancies: discrepancies?.length ?? 0 });
}
