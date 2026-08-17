import { redirect } from "next/navigation";
import { requireSession } from "@/lib/server/session";
import TeamScreen from "./TeamScreen";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/manager");

  return (
    <div>
      <h1 className="page-title">Team</h1>
      <div className="mt-5">
        <TeamScreen />
      </div>
    </div>
  );
}
