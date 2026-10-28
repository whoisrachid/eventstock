import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
export async function requireContext() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("organization_id,role,organizations(name)")
    .eq("user_id", user.id)
    .limit(1);
  if (error) throw new Error(error.message);
  if (!memberships?.length) redirect("/onboarding");
  return {
    supabase,
    user,
    organizationId: memberships[0].organization_id,
    role: memberships[0].role as "owner" | "manager" | "staff",
    orgName:
      (memberships[0].organizations as unknown as { name: string } | null)?.name ??
      "Mon entreprise",
  };
}
