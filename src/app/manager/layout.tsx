import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/session";
import { isManager } from "@/lib/types";
import ManagerShell from "./ManagerShell";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (!isManager(session.role)) redirect("/");

  return (
    <ManagerShell name={session.name} role={session.role}>
      {children}
    </ManagerShell>
  );
}
