import { requireApiSession } from "@/lib/server/session";
import { getStock } from "@/lib/server/queries";
import { handle, apiError } from "@/lib/server/api";

export async function GET() {
  return handle(async () => {
    const session = await requireApiSession();
    if (!session.shopId) apiError("No shop assignment", 403);
    return { stock: await getStock(session.shopId) };
  });
}
