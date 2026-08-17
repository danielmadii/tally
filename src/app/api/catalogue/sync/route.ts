import { requireApiSession } from "@/lib/server/session";
import { getCatalogue } from "@/lib/server/queries";
import { handle } from "@/lib/server/api";

export async function GET() {
  return handle(async () => {
    await requireApiSession();
    const items = await getCatalogue();
    return { items, syncedAt: new Date().toISOString() };
  });
}
