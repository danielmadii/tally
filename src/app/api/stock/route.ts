import { requireApiSession } from "@/lib/server/session";
import { getStock, getActiveShop } from "@/lib/server/queries";
import { handle, apiError } from "@/lib/server/api";

export async function GET() {
  return handle(async () => {
    const session = await requireApiSession();
    const shop = await getActiveShop(session.id);
    if (!shop) apiError("No shop assignment", 403);
    return { stock: await getStock(shop.id) };
  });
}
