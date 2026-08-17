import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/session";
import { getActiveShop } from "@/lib/server/queries";
import { isManager } from "@/lib/types";
import SalesShell from "@/components/SalesShell";
import MySalesScreen from "./MySalesScreen";

export default async function Page() {
  const session = await requireSession();
  const activeShop = await getActiveShop(session.id);
  if (isManager(session.role)) redirect("/manager");

  return (
    <SalesShell name={session.name} shopName={activeShop?.name ?? null}>
      <MySalesScreen />
    </SalesShell>
  );
}
