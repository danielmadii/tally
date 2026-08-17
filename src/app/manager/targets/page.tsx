import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/session";
import { getSalespeopleWithTargets } from "@/lib/server/queries";
import TargetsScreen from "./TargetsScreen";

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/manager");

  const rows = await getSalespeopleWithTargets();
  return <TargetsScreen rows={rows} />;
}
