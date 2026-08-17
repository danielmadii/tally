export type Role = "salesperson" | "supervisor" | "area_manager" | "admin";

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
  shopId: string | null;
  shopName: string | null;
}

/** One catalogue entry per sellable variant, as cached on the phone. */
export interface CatalogueItem {
  variantId: string;
  productName: string;
  brandName: string;
  categoryName: string;
  shadeName: string | null;
  shadeCode: string | null;
  sizeLabel: string | null;
  sku: string;
  price: number;
  imageUrl: string | null;
  barcodes: string[];
  /** lowercase concatenation of all searchable fields */
  haystack: string;
}

export interface BasketLine {
  item: CatalogueItem;
  qty: number;
  discount: number;
}

export interface SaleLinePayload {
  variant_id: string;
  qty: number;
  unit_price: number;
  discount: number;
}

export interface MyStats {
  todayRevenue: number;
  todayUnits: number;
  rank: number | null;
  shopHeadcount: number;
  monthRevenue: number;
  monthTarget: number | null;
  attainmentPct: number | null;
}

export interface MySale {
  id: string;
  saleNo: string;
  soldAt: string;
  total: number;
  status: string;
  voidRequestedAt: string | null;
  lines: { name: string; qty: number; lineTotal: number }[];
}

export const isManager = (role: Role) => role !== "salesperson";
