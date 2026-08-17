import { requireSession } from "@/lib/server/session";
import { getVoidRequests, getExceptions, getActiveShop } from "@/lib/server/queries";
import ApprovalsScreen from "./ApprovalsScreen";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await requireSession();
  const activeShop = await getActiveShop(session.id);
  // Supervisors see their own shop's requests only; managers see everything.
  const shopScope = session.role === "supervisor" ? activeShop?.id ?? null : null;
  const [requests, exceptions] = await Promise.all([
    getVoidRequests(shopScope),
    getExceptions(shopScope),
  ]);

  return <ApprovalsScreen requests={requests} exceptions={exceptions} />;
}
