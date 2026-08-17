import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/session";
import { getActiveShop } from "@/lib/server/queries";
import { isManager } from "@/lib/types";
import ManagerShell from "./ManagerShell";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const activeShop = await getActiveShop(session.id);
  if (!isManager(session.role)) redirect("/");

  return (
    <ManagerShell name={session.name} role={session.role} shopName={activeShop?.name ?? null}>
      {children}
    </ManagerShell>
  );
}
