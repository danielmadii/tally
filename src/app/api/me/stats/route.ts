import { requireApiSession } from "@/lib/server/session";
import { getMyStats } from "@/lib/server/queries";
import { handle } from "@/lib/server/api";

export async function GET() {
  return handle(async () => {
    const session = await requireApiSession();
    return getMyStats(session.id, session.shopId);
  });
}
