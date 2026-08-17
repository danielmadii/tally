import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/session";
import { isManager } from "@/lib/types";
import SalesShell from "@/components/SalesShell";
import SellScreen from "./SellScreen";

export default async function Page() {
  const session = await requireSession();
  if (isManager(session.role)) redirect("/manager");

  return (
    <SalesShell name={session.name} shopName={session.shopName}>
      <SellScreen sellerName={session.name} />
    </SalesShell>
  );
}
