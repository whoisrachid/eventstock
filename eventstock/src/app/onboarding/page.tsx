import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import Flash from "@/components/Flash";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { friendlyError } from "@/lib/format";
async function createOrganization(formData: FormData) {
  "use server";
  const s = await supabaseServer();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) redirect("/login");
  const name = String(formData.get("name") || "").trim();
  if (name.length < 2) redirect("/onboarding?error=Nom%20trop%20court");
  const { error } = await s.rpc("create_organization", { p_name: name });
  if (error) redirect("/onboarding?error=" + encodeURIComponent(friendlyError(error.message)));
  redirect("/dashboard");
}
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const s = await supabaseServer();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await s.from("memberships").select("organization_id").limit(1);
  if (data?.length) redirect("/dashboard");
  const p = await searchParams;
  return (
    <AuthShell title="Votre entreprise">
      <p className="text-[var(--muted)]">
        Le nom apparaîtra en haut de votre espace. Vous pourrez inviter votre équipe ensuite.
      </p>
      <Flash error={p.error} />
      <form action={createOrganization} className="space-y-4">
        <label>
          Nom de l'entreprise
          <input
            name="name"
            required
            minLength={2}
            maxLength={150}
            placeholder="Ex. Prestige Événements"
          />
        </label>
        <ConfirmSubmit className="w-full">Créer mon espace</ConfirmSubmit>
      </form>
    </AuthShell>
  );
}
