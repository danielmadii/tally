import { requireApiSession } from "@/lib/server/session";
import { getMyStats, getActiveShop } from "@/lib/server/queries";
import { handle } from "@/lib/server/api";

export async function GET() {
  return handle(async () => {
    const session = await requireApiSession();
    const shop = await getActiveShop(session.id);
    return getMyStats(session.id, shop?.id ?? null);
  });
}
