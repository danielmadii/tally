import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/session";
import AdminScreen from "./AdminScreen";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/manager");
  return <AdminScreen />;
}
