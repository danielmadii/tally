import { requireSession } from "@/lib/server/session";
import { db } from "@/lib/server/supabase";
import { getReconciliations, getActiveShop } from "@/lib/server/queries";
import ReconcileScreen from "./ReconcileScreen";

export const dynamic = "force-dynamic";

export default async function ReconcilePage() {
  const session = await requireSession();
  const activeShop = await getActiveShop(session.id);
  const shopScope = session.role === "supervisor" ? activeShop?.id ?? null : null;

  const [{ data: shops }, recent] = await Promise.all([
    db().from("shop").select("id, name").eq("is_active", true).order("name"),
    getReconciliations(shopScope),
  ]);

  return (
    <ReconcileScreen
      shops={session.role === "supervisor" ? [] : shops ?? []}
      ownShopName={activeShop?.name ?? null}
      recent={recent}
    />
  );
}
