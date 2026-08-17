import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError, requireRole } from "@/lib/server/api";

export async function GET() {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");

    const [usersRes, assignRes] = await Promise.all([
      db()
        .from("app_user")
        .select("id, full_name, phone, role, is_active, last_login_at")
        .order("full_name"),
      db()
        .from("user_shop")
        .select("user_id, shop_id, shop:shop_id ( name )")
        .is("end_date", null),
    ]);
    if (usersRes.error) throw usersRes.error;
    if (assignRes.error) throw assignRes.error;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const shops = new Map(
      (assignRes.data ?? []).map((a: any) => [a.user_id, { id: a.shop_id, name: a.shop?.name }])
    );
    return {
      users: (usersRes.data ?? []).map((u: any) => ({
        id: u.id,
        name: u.full_name,
        phone: u.phone,
        role: u.role,
        isActive: u.is_active,
        lastLoginAt: u.last_login_at,
        shopId: shops.get(u.id)?.id ?? null,
        shopName: shops.get(u.id)?.name ?? null,
      })),
    };
  });
}

const CreateBody = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(4).max(20),
  pin: z.string().regex(/^\d{4,6}$/),
  role: z.enum(["salesperson", "supervisor", "area_manager", "admin"]),
  shopId: z.string().uuid().nullable().optional(),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");
    const body = CreateBody.parse(await req.json());

    const { data: existing } = await db()
      .from("app_user")
      .select("id")
      .eq("phone", body.phone.trim())
      .maybeSingle();
    if (existing) apiError("A user with that phone number already exists", 409);

    const { data: user, error } = await db()
      .from("app_user")
      .insert({
        full_name: body.name.trim(),
        phone: body.phone.trim(),
        pin_hash: bcrypt.hashSync(body.pin, 10),
        role: body.role,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (body.shopId) {
      const { error: assignError } = await db()
        .from("user_shop")
        .insert({ user_id: user.id, shop_id: body.shopId });
      if (assignError) throw assignError;
    }

    await db().from("audit_log").insert({
      actor_id: session.id,
      action: "user_create",
      entity: "app_user",
      entity_id: user.id,
      after: { name: body.name, phone: body.phone, role: body.role, shop_id: body.shopId ?? null },
    });

    return { id: user.id };
  });
}
