import { redirect } from "next/navigation";
import { StoreIcon } from "lucide-react";
import { requireSession } from "@/lib/server/session";
import { getActiveShop } from "@/lib/server/queries";
import { getTranslator } from "@/lib/i18n/server";
import { isManager } from "@/lib/types";
import SalesShell from "@/components/SalesShell";
import SellScreen from "./SellScreen";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await requireSession();
  const activeShop = await getActiveShop(session.id);
  if (isManager(session.role)) redirect("/manager");

  const { t } = await getTranslator();
  // A closed shop cannot take sales, so the sell screen says so up front
  // instead of letting someone scan a basket that will be refused.
  const closed = !activeShop || !activeShop.isActive;

  return (
    <SalesShell name={session.name} shopName={activeShop?.name ?? null}>
      {closed ? (
        <div className="mx-auto max-w-md px-4 pt-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <StoreIcon className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="mt-5 text-lg font-semibold text-slate-900">{t("shopClosedTitle")}</h1>
          <p className="mt-2 text-sm text-slate-500">{t("shopClosedBody")}</p>
        </div>
      ) : (
        <SellScreen sellerName={session.name} />
      )}
    </SalesShell>
  );
}
