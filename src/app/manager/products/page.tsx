import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/session";
import CatalogueScreen from "./CatalogueScreen";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const session = await requireSession();
  // Only admins maintain the catalogue; everyone else gets the sales report.
  if (session.role !== "admin") redirect("/manager/products/performance");

  return (
    <div>
      <h1 className="page-title">Products</h1>
      <div className="mt-4">
        <CatalogueScreen />
      </div>
    </div>
  );
}
