import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/session";
import { getActiveShop } from "@/lib/server/queries";
import { db } from "@/lib/server/supabase";
import { isManager } from "@/lib/types";
import SalesShell from "@/components/SalesShell";
import SettingsScreen from "./SettingsScreen";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await requireSession();
  const activeShop = await getActiveShop(session.id);
  if (isManager(session.role)) redirect("/manager");

  const { data: user } = await db()
    .from("app_user")
    .select("phone")
    .eq("id", session.id)
    .maybeSingle();

  return (
    <SalesShell name={session.name} shopName={activeShop?.name ?? null}>
      <SettingsScreen
        name={session.name}
        phone={user?.phone ?? ""}
        shopName={activeShop?.name ?? null}
      />
    </SalesShell>
  );
}
