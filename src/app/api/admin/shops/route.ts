import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError, requireRole } from "@/lib/server/api";

export async function GET() {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");
    const { data, error } = await db()
      .from("shop")
      .select("id, code, name, city, is_active, opened_on")
      .order("name");
    if (error) throw error;
    return { shops: data };
  });
}

const CreateBody = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(2).max(100),
  city: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");
    const body = CreateBody.parse(await req.json());

    const { data: existing } = await db()
      .from("shop")
      .select("id")
      .eq("code", body.code.trim().toUpperCase())
      .maybeSingle();
    if (existing) apiError("A shop with that code already exists", 409);

    const { data: shop, error } = await db()
      .from("shop")
      .insert({
        code: body.code.trim().toUpperCase(),
        name: body.name.trim(),
        city: body.city?.trim() || null,
        opened_on: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (error) throw error;

    await db().from("audit_log").insert({
      actor_id: session.id,
      action: "shop_create",
      entity: "shop",
      entity_id: shop.id,
      after: { code: body.code, name: body.name },
    });

    return { id: shop.id };
  });
}
