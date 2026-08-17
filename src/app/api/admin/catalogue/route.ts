import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError, requireRole } from "@/lib/server/api";
import { fetchAll } from "@/lib/server/queries";

export async function GET() {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");

    const [brandsRes, categoriesRes, variants] = await Promise.all([
      db().from("brand").select("id, name").eq("is_active", true).order("name"),
      db().from("category").select("id, name, parent_id").order("name"),
      fetchAll(() =>
        db()
          .from("variant")
          .select(
            `id, sku, shade_name, shade_code, size_label, price, cost_price, reorder_point, is_active,
             product:product_id ( id, name, is_active, brand:brand_id ( name ), category:category_id ( name ) ),
             barcodes:variant_barcode ( barcode )`
          )
          .order("sku")
      ),
    ]);
    for (const r of [brandsRes, categoriesRes]) if (r.error) throw r.error;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    return {
      brands: brandsRes.data,
      categories: categoriesRes.data,
      variants: (variants as any[]).map((v) => ({
        id: v.id,
        sku: v.sku,
        name: [v.product?.name, v.shade_name].filter(Boolean).join(" — "),
        productName: v.product?.name ?? "",
        brand: v.product?.brand?.name ?? "",
        category: v.product?.category?.name ?? "",
        sizeLabel: v.size_label,
        price: Number(v.price),
        costPrice: v.cost_price !== null ? Number(v.cost_price) : null,
        reorderPoint: v.reorder_point,
        isActive: v.is_active && v.product?.is_active !== false,
        barcodes: (v.barcodes ?? []).map((b: any) => b.barcode),
      })),
    };
  });
}

const CreateBody = z.object({
  productName: z.string().min(2).max(150),
  brandName: z.string().min(1).max(100),
  categoryName: z.string().min(1).max(100),
  variants: z
    .array(
      z.object({
        sku: z.string().min(2).max(50),
        shadeName: z.string().max(100).optional(),
        shadeCode: z.string().max(20).optional(),
        sizeLabel: z.string().max(30).optional(),
        price: z.number().positive(),
        costPrice: z.number().nonnegative().optional(),
        barcode: z.string().max(30).optional(),
      })
    )
    .min(1),
});

async function findOrCreate(table: "brand" | "category", name: string): Promise<string> {
  const { data } = await db().from(table).select("id").ilike("name", name.trim()).maybeSingle();
  if (data) return data.id;
  const { data: created, error } = await db()
    .from(table)
    .insert({ name: name.trim() })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");
    const body = CreateBody.parse(await req.json());

    const skus = body.variants.map((v) => v.sku.trim().toUpperCase());
    const { data: skuClash } = await db().from("variant").select("sku").in("sku", skus);
    if (skuClash?.length) {
      apiError(`SKU already exists: ${skuClash.map((s) => s.sku).join(", ")}`, 409);
    }

    const [brandId, categoryId] = await Promise.all([
      findOrCreate("brand", body.brandName),
      findOrCreate("category", body.categoryName),
    ]);

    const { data: product, error } = await db()
      .from("product")
      .insert({ name: body.productName.trim(), brand_id: brandId, category_id: categoryId })
      .select("id")
      .single();
    if (error) throw error;

    for (const v of body.variants) {
      const { data: variant, error: vError } = await db()
        .from("variant")
        .insert({
          product_id: product.id,
          sku: v.sku.trim().toUpperCase(),
          shade_name: v.shadeName?.trim() || null,
          shade_code: v.shadeCode?.trim() || null,
          size_label: v.sizeLabel?.trim() || null,
          price: v.price,
          cost_price: v.costPrice ?? null,
        })
        .select("id")
        .single();
      if (vError) throw vError;

      await db().from("price_history").insert({
        variant_id: variant.id,
        price: v.price,
        cost_price: v.costPrice ?? null,
        changed_by: session.id,
      });

      if (v.barcode?.trim()) {
        const { error: bcError } = await db()
          .from("variant_barcode")
          .insert({ variant_id: variant.id, barcode: v.barcode.trim() });
        if (bcError) throw bcError;
      }
    }

    await db().from("audit_log").insert({
      actor_id: session.id,
      action: "product_create",
      entity: "product",
      entity_id: product.id,
      after: { name: body.productName, brand: body.brandName, variants: body.variants.length },
    });

    return { id: product.id };
  });
}
