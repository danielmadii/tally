import { requireSession } from "@/lib/server/session";
import { getVoidRequests, getExceptions } from "@/lib/server/queries";
import ApprovalsScreen from "./ApprovalsScreen";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await requireSession();
  // Supervisors see their own shop's requests only; managers see everything.
  const shopScope = session.role === "supervisor" ? session.shopId : null;
  const [requests, exceptions] = await Promise.all([
    getVoidRequests(shopScope),
    getExceptions(),
  ]);

  return <ApprovalsScreen requests={requests} exceptions={exceptions} />;
}
