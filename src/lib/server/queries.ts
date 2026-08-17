import { db } from "@/lib/server/supabase";
import { businessDate, monthStart } from "@/lib/format";
import type { CatalogueItem, MyStats, MySale } from "@/lib/types";

/**
 * PostgREST caps every response at 1000 rows — reads that can exceed that
 * (catalogue, stock) must page or they silently truncate.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchAll<T = any>(
  build: () => { range: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }> }
): Promise<T[]> {
  const size = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await build().range(from, from + size - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < size) break;
  }
  return all;
}

// ---------- catalogue ----------

export async function getCatalogue(): Promise<CatalogueItem[]> {
  const data = await fetchAll(() =>
    db()
      .from("variant")
      .select(
        `id, sku, shade_name, shade_code, size_label, price, image_url,
         product:product_id!inner ( name, is_active,
           brand:brand_id ( name ),
           category:category_id ( name ) ),
         barcodes:variant_barcode ( barcode )`
      )
      .eq("is_active", true)
      .order("sku")
  );

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data as any[])
    .filter((v) => v.product?.is_active !== false)
    .map((v) => {
      const item: CatalogueItem = {
        variantId: v.id,
        productName: v.product.name,
        brandName: v.product.brand?.name ?? "",
        categoryName: v.product.category?.name ?? "",
        shadeName: v.shade_name,
        shadeCode: v.shade_code,
        sizeLabel: v.size_label,
        sku: v.sku,
        price: Number(v.price),
        imageUrl: v.image_url,
        barcodes: (v.barcodes ?? []).map((b: any) => b.barcode),
        haystack: "",
      };
      item.haystack = [
        item.productName,
        item.brandName,
        item.categoryName,
        item.shadeName,
        item.shadeCode,
        item.sizeLabel,
        item.sku,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return item;
    });
}

// ---------- salesperson stats ----------

export async function getMyStats(userId: string, shopId: string | null): Promise<MyStats> {
  const today = businessDate();
  const mStart = monthStart();

  const [todayRes, monthRes, targetRes, shopTodayRes] = await Promise.all([
    db()
      .from("sale")
      .select("total, sale_line ( qty )")
      .eq("salesperson_id", userId)
      .eq("business_date", today)
      .eq("status", "completed"),
    db()
      .from("sale")
      .select("total")
      .eq("salesperson_id", userId)
      .gte("business_date", mStart)
      .eq("status", "completed"),
    db()
      .from("target")
      .select("target_value")
      .eq("user_id", userId)
      .eq("period_month", mStart)
      .maybeSingle(),
    shopId
      ? db()
          .from("sale")
          .select("salesperson_id, total")
          .eq("shop_id", shopId)
          .eq("business_date", today)
          .eq("status", "completed")
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const r of [todayRes, monthRes, targetRes]) {
    if (r.error) throw r.error;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const todayRevenue = (todayRes.data ?? []).reduce((s, r: any) => s + Number(r.total), 0);
  const todayUnits = (todayRes.data ?? []).reduce(
    (s, r: any) => s + (r.sale_line ?? []).reduce((q: number, l: any) => q + l.qty, 0),
    0
  );
  const monthRevenue = (monthRes.data ?? []).reduce((s, r: any) => s + Number(r.total), 0);
  const monthTarget = targetRes.data?.target_value ? Number(targetRes.data.target_value) : null;

  // Rank within the shop today (rank-only visibility: no colleague figures leave the server)
  const byPerson = new Map<string, number>();
  for (const r of (shopTodayRes.data ?? []) as any[]) {
    byPerson.set(r.salesperson_id, (byPerson.get(r.salesperson_id) ?? 0) + Number(r.total));
  }
  const ranked = [...byPerson.entries()].sort((a, b) => b[1] - a[1]);
  const idx = ranked.findIndex(([id]) => id === userId);

  return {
    todayRevenue,
    todayUnits,
    rank: idx >= 0 ? idx + 1 : null,
    shopHeadcount: ranked.length,
    monthRevenue,
    monthTarget,
    attainmentPct: monthTarget ? Math.round((monthRevenue / monthTarget) * 100) : null,
  };
}

export async function getMySales(userId: string, period: "today" | "month"): Promise<MySale[]> {
  const from = period === "today" ? businessDate() : monthStart();
  const { data, error } = await db()
    .from("sale")
    .select(
      `id, sale_no, sold_at, total, status, void_requested_at,
       sale_line ( qty, line_total, variant:variant_id ( shade_name, product:product_id ( name ) ) )`
    )
    .eq("salesperson_id", userId)
    .gte("business_date", from)
    .order("sold_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data as any[]).map((s) => ({
    id: s.id,
    saleNo: s.sale_no,
    soldAt: s.sold_at,
    total: Number(s.total),
    status: s.status,
    voidRequestedAt: s.void_requested_at,
    lines: (s.sale_line ?? []).map((l: any) => ({
      name: [l.variant?.product?.name, l.variant?.shade_name].filter(Boolean).join(" — "),
      qty: l.qty,
      lineTotal: Number(l.line_total),
    })),
  }));
}

// ---------- stock ----------

export async function getStock(shopId: string) {
  const data = await fetchAll(() =>
    db()
      .from("stock_level")
      .select(
        `qty_on_hand, updated_at,
         variant:variant_id!inner ( id, sku, shade_name, size_label, price, reorder_point,
           product:product_id ( name, brand:brand_id ( name ) ) )`
      )
      .eq("shop_id", shopId)
      .order("qty_on_hand", { ascending: true })
      .order("variant_id")
  );

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data as any[]).map((r) => ({
    variantId: r.variant.id,
    sku: r.variant.sku,
    name: [r.variant.product?.name, r.variant.shade_name].filter(Boolean).join(" — "),
    brand: r.variant.product?.brand?.name ?? "",
    price: Number(r.variant.price),
    qtyOnHand: r.qty_on_hand,
    reorderPoint: r.variant.reorder_point,
    low: r.qty_on_hand <= r.variant.reorder_point,
  }));
}

// ---------- manager dashboard ----------

export async function getLiveDashboard() {
  const today = businessDate();
  const [salesRes, shopsRes, usersRes] = await Promise.all([
    db()
      .from("sale")
      .select("shop_id, salesperson_id, sold_at, total, sale_line ( qty )")
      .eq("business_date", today)
      .eq("status", "completed"),
    db().from("shop").select("id, code, name").eq("is_active", true).order("name"),
    db().from("app_user").select("id, full_name"),
  ]);
  for (const r of [salesRes, shopsRes, usersRes]) if (r.error) throw r.error;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const sales = (salesRes.data ?? []) as any[];
  const users = new Map((usersRes.data ?? []).map((u: any) => [u.id, u.full_name]));

  const perShop = (shopsRes.data ?? []).map((shop: any) => {
    const rows = sales.filter((s) => s.shop_id === shop.id);
    return {
      shopId: shop.id,
      code: shop.code,
      name: shop.name,
      revenue: rows.reduce((s, r) => s + Number(r.total), 0),
      transactions: rows.length,
      units: rows.reduce(
        (s, r) => s + (r.sale_line ?? []).reduce((q: number, l: any) => q + l.qty, 0),
        0
      ),
    };
  });

  const hourly = new Map<number, number>();
  for (const s of sales) {
    const h = new Date(s.sold_at).getHours();
    hourly.set(h, (hourly.get(h) ?? 0) + Number(s.total));
  }
  const hourlyTrend = [...hourly.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, revenue]) => ({ hour: `${String(hour).padStart(2, "0")}:00`, revenue }));

  const byPerson = new Map<string, number>();
  for (const s of sales) {
    byPerson.set(s.salesperson_id, (byPerson.get(s.salesperson_id) ?? 0) + Number(s.total));
  }
  const topSalespeople = [...byPerson.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, revenue]) => ({ name: users.get(id) ?? "Unknown", revenue }));

  return {
    totalRevenue: perShop.reduce((s, r) => s + r.revenue, 0),
    totalTransactions: sales.length,
    perShop,
    hourlyTrend,
    topSalespeople,
  };
}

export async function getLeaderboard() {
  const mStart = monthStart();
  const today = businessDate();
  const [salesRes, usersRes, targetsRes, assignRes] = await Promise.all([
    db()
      .from("sale")
      .select("salesperson_id, shop_id, total, sale_line ( qty )")
      .gte("business_date", mStart)
      .eq("status", "completed"),
    db().from("app_user").select("id, full_name, role").eq("is_active", true),
    db().from("target").select("user_id, target_value").eq("period_month", mStart),
    db().from("user_shop").select("user_id, shop:shop_id ( name )").is("end_date", null),
  ]);
  for (const r of [salesRes, usersRes, targetsRes, assignRes]) if (r.error) throw r.error;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const targets = new Map(
    (targetsRes.data ?? [])
      .filter((t: any) => t.user_id)
      .map((t: any) => [t.user_id, Number(t.target_value)])
  );
  const shops = new Map(
    (assignRes.data ?? []).map((a: any) => [a.user_id, a.shop?.name ?? ""])
  );

  // Pro-rate target by elapsed days so mid-month attainment is meaningful.
  const day = Number(today.slice(8, 10));
  const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  const elapsedFraction = day / daysInMonth;

  const rows = (usersRes.data ?? [])
    .filter((u: any) => u.role === "salesperson")
    .map((u: any) => {
      const mine = ((salesRes.data ?? []) as any[]).filter((s) => s.salesperson_id === u.id);
      const revenue = mine.reduce((s, r) => s + Number(r.total), 0);
      const units = mine.reduce(
        (s, r) => s + (r.sale_line ?? []).reduce((q: number, l: any) => q + l.qty, 0),
        0
      );
      const target = targets.get(u.id) ?? null;
      const proRated = target ? target * elapsedFraction : null;
      return {
        userId: u.id,
        name: u.full_name,
        shopName: shops.get(u.id) ?? "",
        revenue,
        units,
        transactions: mine.length,
        target,
        attainmentPct: proRated ? Math.round((revenue / proRated) * 100) : null,
      };
    })
    .sort((a, b) => (b.attainmentPct ?? -1) - (a.attainmentPct ?? -1) || b.revenue - a.revenue);

  return rows;
}

// ---------- product performance (this month, live query) ----------

export async function getProductPerformance(shopId: string | null = null) {
  const mStart = monthStart();
  let query = db()
    .from("sale_line")
    .select(
      `qty, line_total,
       sale:sale_id!inner ( business_date, status, shop_id ),
       variant:variant_id!inner ( id, sku, shade_name,
         product:product_id ( name, brand:brand_id ( name ), category:category_id ( name ) ) )`
    )
    .gte("sale.business_date", mStart)
    .eq("sale.status", "completed");
  if (shopId) query = query.eq("sale.shop_id", shopId);
  const { data, error } = await query;
  if (error) throw error;

  // Per-shop view also shows what is left on that shop's shelf.
  const stockMap = new Map<string, number>();
  if (shopId) {
    const { data: levels, error: stockError } = await db()
      .from("stock_level")
      .select("variant_id, qty_on_hand")
      .eq("shop_id", shopId);
    if (stockError) throw stockError;
    for (const l of levels ?? []) stockMap.set(l.variant_id, l.qty_on_hand);
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const byVariant = new Map<
    string,
    { name: string; brand: string; category: string; sku: string; units: number; revenue: number }
  >();
  for (const row of (data ?? []) as any[]) {
    const v = row.variant;
    const entry = byVariant.get(v.id) ?? {
      name: [v.product?.name, v.shade_name].filter(Boolean).join(" — "),
      brand: v.product?.brand?.name ?? "",
      category: v.product?.category?.name ?? "",
      sku: v.sku,
      units: 0,
      revenue: 0,
    };
    entry.units += row.qty;
    entry.revenue += Number(row.line_total);
    byVariant.set(v.id, entry);
  }
  return [...byVariant.entries()]
    .map(([variantId, e]) => ({
      variantId,
      ...e,
      qtyOnHand: shopId ? stockMap.get(variantId) ?? 0 : null,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Variants with stock on hand and no sale in a shop for N days (default 60). */
export async function getDeadStock(days = 60, shopId: string | null = null) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let levelsQuery = db()
    .from("stock_level")
    .select(
      `shop_id, variant_id, qty_on_hand,
       variant:variant_id!inner ( sku, shade_name, product:product_id ( name, brand:brand_id ( name ) ) )`
    )
    .gt("qty_on_hand", 0);
  if (shopId) levelsQuery = levelsQuery.eq("shop_id", shopId);
  const [levelsRes, recentRes, shopsRes] = await Promise.all([
    levelsQuery,
    db()
      .from("stock_movement")
      .select("shop_id, variant_id")
      .eq("movement_type", "sale")
      .gte("created_at", cutoff),
    db().from("shop").select("id, name"),
  ]);
  for (const r of [levelsRes, recentRes, shopsRes]) if (r.error) throw r.error;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const sold = new Set((recentRes.data ?? []).map((m: any) => `${m.shop_id}:${m.variant_id}`));
  const shopNames = new Map((shopsRes.data ?? []).map((s: any) => [s.id, s.name]));

  return ((levelsRes.data ?? []) as any[])
    .filter((l) => !sold.has(`${l.shop_id}:${l.variant_id}`))
    .map((l) => ({
      shopName: shopNames.get(l.shop_id) ?? "",
      name: [l.variant.product?.name, l.variant.shade_name].filter(Boolean).join(" — "),
      brand: l.variant.product?.brand?.name ?? "",
      sku: l.variant.sku,
      qtyOnHand: l.qty_on_hand,
    }))
    .sort((a, b) => b.qtyOnHand - a.qtyOnHand);
}

// ---------- shops overview & drill-down ----------

export async function getShopsOverview() {
  const today = businessDate();
  const [shopsRes, salesRes, lowRes, staffRes] = await Promise.all([
    db().from("shop").select("id, code, name, city, is_active").order("name"),
    db()
      .from("sale")
      .select("shop_id, total, sale_line ( qty )")
      .eq("business_date", today)
      .eq("status", "completed"),
    db().rpc("low_stock_counts"),
    db()
      .from("user_shop")
      .select("shop_id, user:user_id!inner ( role, is_active )")
      .is("end_date", null),
  ]);
  for (const r of [shopsRes, salesRes, lowRes, staffRes]) if (r.error) throw r.error;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const lowByShop = new Map(
    ((lowRes.data ?? []) as any[]).map((r) => [r.shop_id, Number(r.low_count)])
  );
  return (shopsRes.data ?? []).map((shop: any) => {
    const sales = ((salesRes.data ?? []) as any[]).filter((s) => s.shop_id === shop.id);
    const staff = ((staffRes.data ?? []) as any[]).filter(
      (a) => a.shop_id === shop.id && a.user?.is_active && a.user?.role === "salesperson"
    );
    return {
      id: shop.id,
      code: shop.code,
      name: shop.name,
      city: shop.city,
      isActive: shop.is_active,
      revenueToday: sales.reduce((s, r) => s + Number(r.total), 0),
      transactionsToday: sales.length,
      unitsToday: sales.reduce(
        (s, r) => s + (r.sale_line ?? []).reduce((q: number, l: any) => q + l.qty, 0),
        0
      ),
      staffCount: staff.length,
      lowStockCount: lowByShop.get(shop.id) ?? 0,
    };
  });
}

export async function getShopDetail(shopId: string) {
  const today = businessDate();
  const mStart = monthStart();

  const [shopRes, todayRes, monthRes, staffRes, targetsRes] = await Promise.all([
    db().from("shop").select("id, code, name, city, is_active").eq("id", shopId).maybeSingle(),
    db()
      .from("sale")
      .select("salesperson_id, total, sale_line ( qty )")
      .eq("shop_id", shopId)
      .eq("business_date", today)
      .eq("status", "completed"),
    db()
      .from("sale")
      .select("salesperson_id, total, sale_line ( qty )")
      .eq("shop_id", shopId)
      .gte("business_date", mStart)
      .eq("status", "completed"),
    db()
      .from("user_shop")
      .select("user:user_id!inner ( id, full_name, role, is_active )")
      .eq("shop_id", shopId)
      .is("end_date", null),
    db().from("target").select("user_id, target_value").eq("period_month", mStart),
  ]);
  for (const r of [todayRes, monthRes, staffRes, targetsRes]) if (r.error) throw r.error;
  if (!shopRes.data) return null;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const targets = new Map(
    (targetsRes.data ?? [])
      .filter((t: any) => t.user_id)
      .map((t: any) => [t.user_id, Number(t.target_value)])
  );

  const day = Number(today.slice(8, 10));
  const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  const elapsedFraction = day / daysInMonth;

  const staff = ((staffRes.data ?? []) as any[])
    .map((a) => a.user)
    .filter((u) => u?.is_active && u.role === "salesperson")
    .map((u) => {
      const todaySales = ((todayRes.data ?? []) as any[]).filter((s) => s.salesperson_id === u.id);
      const monthSales = ((monthRes.data ?? []) as any[]).filter((s) => s.salesperson_id === u.id);
      const monthRevenue = monthSales.reduce((s, r) => s + Number(r.total), 0);
      const target = targets.get(u.id) ?? null;
      const proRated = target ? target * elapsedFraction : null;
      return {
        userId: u.id,
        name: u.full_name,
        todayRevenue: todaySales.reduce((s, r) => s + Number(r.total), 0),
        monthRevenue,
        monthUnits: monthSales.reduce(
          (s, r) => s + (r.sale_line ?? []).reduce((q: number, l: any) => q + l.qty, 0),
          0
        ),
        target,
        attainmentPct: proRated ? Math.round((monthRevenue / proRated) * 100) : null,
      };
    })
    .sort((a, b) => b.monthRevenue - a.monthRevenue);

  const todaySales = (todayRes.data ?? []) as any[];
  return {
    shop: shopRes.data,
    today: {
      revenue: todaySales.reduce((s, r) => s + Number(r.total), 0),
      transactions: todaySales.length,
      units: todaySales.reduce(
        (s, r) => s + (r.sale_line ?? []).reduce((q: number, l: any) => q + l.qty, 0),
        0
      ),
    },
    staff,
    stock: await getStock(shopId),
  };
}

// ---------- void approvals & exceptions ----------

export async function getVoidRequests(shopId: string | null) {
  let query = db()
    .from("sale")
    .select(
      `id, sale_no, sold_at, total, void_requested_at, void_request_reason, shop_id,
       salesperson:salesperson_id ( full_name ),
       shop:shop_id ( name ),
       sale_line ( qty, variant:variant_id ( shade_name, product:product_id ( name ) ) )`
    )
    .eq("status", "completed")
    .not("void_requested_at", "is", null)
    .order("void_requested_at", { ascending: true });
  if (shopId) query = query.eq("shop_id", shopId);
  const { data, error } = await query;
  if (error) throw error;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data as any[]).map((s) => ({
    id: s.id,
    saleNo: s.sale_no,
    soldAt: s.sold_at,
    total: Number(s.total),
    requestedAt: s.void_requested_at,
    reason: s.void_request_reason ?? "",
    salesperson: s.salesperson?.full_name ?? "",
    shopName: s.shop?.name ?? "",
    lines: (s.sale_line ?? []).map(
      (l: any) =>
        `${l.qty} × ${[l.variant?.product?.name, l.variant?.shade_name].filter(Boolean).join(" — ")}`
    ),
  }));
}

/** Exception report: voids this month plus every discounted sale, with who. */
export async function getExceptions() {
  const mStart = monthStart();
  const { data, error } = await db()
    .from("sale")
    .select(
      `id, sale_no, sold_at, total, discount_total, status, void_reason,
       salesperson:salesperson_id ( full_name ), shop:shop_id ( name )`
    )
    .gte("business_date", mStart)
    .or("status.eq.voided,discount_total.gt.0")
    .order("sold_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data as any[]).map((s) => ({
    id: s.id,
    saleNo: s.sale_no,
    soldAt: s.sold_at,
    total: Number(s.total),
    discount: Number(s.discount_total),
    status: s.status,
    voidReason: s.void_reason,
    salesperson: s.salesperson?.full_name ?? "",
    shopName: s.shop?.name ?? "",
  }));
}

// ---------- targets ----------

export async function getSalespeopleWithTargets() {
  const mStart = monthStart();
  const [usersRes, targetsRes, assignRes] = await Promise.all([
    db().from("app_user").select("id, full_name").eq("role", "salesperson").eq("is_active", true).order("full_name"),
    db().from("target").select("user_id, target_value").eq("period_month", mStart).not("user_id", "is", null),
    db().from("user_shop").select("user_id, shop:shop_id ( name )").is("end_date", null),
  ]);
  for (const r of [usersRes, targetsRes, assignRes]) if (r.error) throw r.error;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const targets = new Map((targetsRes.data ?? []).map((t: any) => [t.user_id, Number(t.target_value)]));
  const shops = new Map((assignRes.data ?? []).map((a: any) => [a.user_id, a.shop?.name ?? ""]));
  return (usersRes.data ?? []).map((u: any) => ({
    userId: u.id,
    name: u.full_name,
    shopName: shops.get(u.id) ?? "",
    target: targets.get(u.id) ?? null,
  }));
}

// ---------- reconciliation ----------

export async function getRecordedTotal(shopId: string, date: string) {
  const { data, error } = await db()
    .from("sale")
    .select("total")
    .eq("shop_id", shopId)
    .eq("business_date", date)
    .eq("status", "completed");
  if (error) throw error;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).reduce((s, r: any) => s + Number(r.total), 0);
}

export async function getReconciliations(shopId: string | null, limit = 14) {
  let query = db()
    .from("reconciliation")
    .select("id, shop_id, business_date, till_total, created_at, shop:shop_id ( name )")
    .order("business_date", { ascending: false })
    .limit(limit);
  if (shopId) query = query.eq("shop_id", shopId);
  const { data, error } = await query;
  if (error) throw error;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const rows = [];
  for (const r of (data ?? []) as any[]) {
    const recorded = await getRecordedTotal(r.shop_id, r.business_date);
    rows.push({
      id: r.id,
      shopName: r.shop?.name ?? "",
      date: r.business_date,
      tillTotal: Number(r.till_total),
      recorded,
      variance: recorded - Number(r.till_total),
    });
  }
  return rows;
}
