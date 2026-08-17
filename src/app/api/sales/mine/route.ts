import { NextRequest } from "next/server";
import { requireApiSession } from "@/lib/server/session";
import { getMySales } from "@/lib/server/queries";
import { handle } from "@/lib/server/api";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const session = await requireApiSession();
    const period = req.nextUrl.searchParams.get("period") === "month" ? "month" : "today";
    return { sales: await getMySales(session.id, period) };
  });
}
