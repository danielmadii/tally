import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, requireRole } from "@/lib/server/api";

const Body = z.object({
  rows: z
    .array(
      z.object({
        brand: z.string().min(1).max(120),
        sku: z.string().min(1).max(60),
        name: z.string().min(1).max(250),
        barcode: z.string().max(30).nullable().optional(),
        price: z.number().nonnegative().nullable().optional(),
        costPrice: z.number().nonnegative().nullable().optional(),
        category: z.string().max(120).nullable().optional(),
        qty: z.number().int().nonnegative().nullable().optional(),
      })
    )
    .min(1)
    .max(20000),
  defaultCategory: z.string().min(1).max(120).default("Imported"),
  // Optional shop: imported items get a stock record there (opening stock if
  // the file carries quantities, otherwise zero on hand awaiting goods-in).
  shopId: z.string().uuid().nullable().optional(),
});

const CHUNK = 500;

async function findOrCreateByName(table: "brand" | "category", names: string[]) {
  const map = new Map<string, string>();
  const { data: existing, error } = await db().from(table).select("id, name");
  if (error) throw error;
  for (const row of existing ?? []) map.set(row.name.trim().toLowerCase(), row.id);

  const missing = [...new Set(names.map((n) => n.trim()))].filter(
    (n) => !map.has(n.toLowerCase())
  );
  if (missing.length) {
    const { data: created, error: createError } = await db()
      .from(table)
      .insert(missing.map((name) => ({ name })))
      .select("id, name");
    if (createError) throw createError;
    for (const row of created ?? []) map.set(row.name.trim().toLowerCase(), row.id);
  }
  return map;
}

/**
 * Bulk catalogue import (Excel/CSV parsed client-side). Idempotent by SKU:
 * rows whose SKU already exists are skipped, so re-running a corrected file
 * is safe. Unpriced rows import as inactive — visible in admin, not sellable.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");
    const body = Body.parse(await req.json());

    // Normalize + dedupe within the payload (first occurrence wins).
    const seenSkus = new Set<string>();
    const seenBarcodes = new Set<string>();
    let inFileDuplicateSkus = 0;
    let duplicateBarcodesDropped = 0;

    const rows = [];
    for (const raw of body.rows) {
      const sku = raw.sku.trim().toUpperCase();
      if (seenSkus.has(sku)) {
        inFileDuplicateSkus++;
        continue;
      }
      seenSkus.add(sku);
      let barcode = raw.barcode?.trim() || null;
      if (barcode) {
        if (seenBarcodes.has(barcode)) {
          duplicateBarcodesDropped++;
          barcode = null;
        } else {
          seenBarcodes.add(barcode);
        }
      }
      rows.push({
        sku,
        barcode,
        brand: raw.brand.trim(),
        name: raw.name.trim(),
        price: raw.price ?? null,
        costPrice: raw.costPrice ?? null,
        category: raw.category?.trim() || body.defaultCategory,
        qty: raw.qty ?? null,
      });
    }

    // Skip SKUs and barcodes that already exist in the catalogue. Lookups are
    // scoped to the payload's values in chunks — a full-table select silently
    // truncates at PostgREST's 1000-row cap on large catalogues.
    async function fetchExisting(
      table: "variant" | "variant_barcode",
      column: "sku" | "barcode",
      values: string[]
    ) {
      const found = new Set<string>();
      for (let i = 0; i < values.length; i += 400) {
        const { data, error } = await db()
          .from(table)
          .select(column)
          .in(column, values.slice(i, i + 400));
        if (error) throw error;
        for (const row of (data ?? []) as Record<string, string>[]) found.add(row[column]);
      }
      return found;
    }
    const [existingSkus, existingBarcodes] = await Promise.all([
      fetchExisting("variant", "sku", rows.map((r) => r.sku)),
      fetchExisting(
        "variant_barcode",
        "barcode",
        rows.map((r) => r.barcode).filter((b): b is string => !!b)
      ),
    ]);

    let skippedExisting = 0;
    const toImport = rows.filter((r) => {
      if (existingSkus.has(r.sku)) {
        skippedExisting++;
        return false;
      }
      if (r.barcode && existingBarcodes.has(r.barcode)) {
        duplicateBarcodesDropped++;
        r.barcode = null;
      }
      return true;
    });

    const [brandMap, categoryMap] = await Promise.all([
      findOrCreateByName("brand", toImport.map((r) => r.brand)),
      findOrCreateByName("category", toImport.map((r) => r.category)),
    ]);

    let created = 0;
    let unpriced = 0;

    for (let i = 0; i < toImport.length; i += CHUNK) {
      const chunk = toImport.slice(i, i + CHUNK);

      const { data: products, error: productError } = await db()
        .from("product")
        .insert(
          chunk.map((r) => ({
            code: r.sku,
            name: r.name,
            brand_id: brandMap.get(r.brand.toLowerCase()),
            category_id: categoryMap.get(r.category.toLowerCase()),
          }))
        )
        .select("id, code");
      if (productError) throw productError;
      const productIds = new Map((products ?? []).map((p) => [p.code, p.id]));

      const { data: variants, error: variantError } = await db()
        .from("variant")
        .insert(
          chunk.map((r) => ({
            product_id: productIds.get(r.sku),
            sku: r.sku,
            price: r.price ?? 0,
            cost_price: r.costPrice,
            is_active: r.price !== null && r.price > 0,
          }))
        )
        .select("id, sku");
      if (variantError) throw variantError;
      const variantIds = new Map((variants ?? []).map((v) => [v.sku, v.id]));

      const priced = chunk.filter((r) => r.price !== null && r.price > 0);
      unpriced += chunk.length - priced.length;
      if (priced.length) {
        const { error: historyError } = await db().from("price_history").insert(
          priced.map((r) => ({
            variant_id: variantIds.get(r.sku),
            price: r.price,
            cost_price: r.costPrice,
            changed_by: session.id,
          }))
        );
        if (historyError) throw historyError;
      }

      const withBarcode = chunk.filter((r) => r.barcode);
      if (withBarcode.length) {
        const { error: barcodeError } = await db().from("variant_barcode").insert(
          withBarcode.map((r) => ({
            variant_id: variantIds.get(r.sku),
            barcode: r.barcode,
          }))
        );
        if (barcodeError) throw barcodeError;
      }

      if (body.shopId) {
        const { error: levelError } = await db().from("stock_level").insert(
          chunk.map((r) => ({
            shop_id: body.shopId,
            variant_id: variantIds.get(r.sku),
            qty_on_hand: r.qty ?? 0,
          }))
        );
        if (levelError) throw levelError;

        // Only real quantities enter the ledger — a zero row is just a listing.
        const withQty = chunk.filter((r) => (r.qty ?? 0) > 0);
        if (withQty.length) {
          const { error: movementError } = await db().from("stock_movement").insert(
            withQty.map((r) => ({
              shop_id: body.shopId,
              variant_id: variantIds.get(r.sku),
              qty_delta: r.qty,
              movement_type: "stock_in",
              created_by: session.id,
              note: "Import opening stock",
            }))
          );
          if (movementError) throw movementError;
        }
      }

      created += chunk.length;
    }

    await db().from("audit_log").insert({
      actor_id: session.id,
      action: "catalogue_import",
      entity: "variant",
      after: { created, skippedExisting, unpriced, duplicateBarcodesDropped, inFileDuplicateSkus },
    });

    return { created, skippedExisting, unpriced, duplicateBarcodesDropped, inFileDuplicateSkus };
  });
}
