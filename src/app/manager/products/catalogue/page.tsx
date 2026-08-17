import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/session";
import ProductsTabs from "../ProductsTabs";
import CatalogueScreen from "./CatalogueScreen";

export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/manager/products");

  return (
    <div>
      <h1 className="page-title">Products</h1>
      <p className="page-desc">
        Every item that can be sold — add, import, price and retire products.
      </p>
      <ProductsTabs />
      <CatalogueScreen />
    </div>
  );
}
