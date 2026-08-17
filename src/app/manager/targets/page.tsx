import { redirect } from "next/navigation";

// Targets now lives inside Settings; keep old links working.
export default function TargetsRedirect() {
  redirect("/manager/admin?tab=targets");
}
