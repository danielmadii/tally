import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { createSession } from "@/lib/server/session";
import { handle, apiError } from "@/lib/server/api";
import type { Role } from "@/lib/types";

const Body = z.object({
  phone: z.string().min(4),
  pin: z.string().min(4).max(6),
  remember: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = Body.parse(await req.json());

    const { data: user, error } = await db()
      .from("app_user")
      .select("id, full_name, phone, pin_hash, role, is_active")
      .eq("phone", body.phone.trim())
      .maybeSingle();
    if (error) throw error;

    if (!user || !user.is_active || !(await bcrypt.compare(body.pin, user.pin_hash))) {
      apiError("Wrong phone number or PIN", 401);
    }

    // Active shop assignment for today — the session is bound to it.
    const { data: assignment } = await db()
      .from("user_shop")
      .select("shop:shop_id ( id, name )")
      .eq("user_id", user.id)
      .is("end_date", null)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const shop = (assignment as any)?.shop ?? null;
    if (!shop && user.role === "salesperson") {
      apiError("You are not assigned to a shop. Ask your supervisor.", 403);
    }

    await createSession(
      {
        id: user.id,
        name: user.full_name,
        role: user.role as Role,
        shopId: shop?.id ?? null,
        shopName: shop?.name ?? null,
      },
      body.remember ? 30 : 1
    );

    await db().from("app_user").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);

    return { role: user.role, name: user.full_name };
  });
}
