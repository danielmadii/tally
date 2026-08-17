import { destroySession } from "@/lib/server/session";
import { handle } from "@/lib/server/api";

export async function POST() {
  return handle(async () => {
    await destroySession();
    return { ok: true };
  });
}
