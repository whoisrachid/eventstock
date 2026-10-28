import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import Flash from "@/components/Flash";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { supabaseServer } from "@/lib/supabase/server";
import { updatePassword } from "../auth/actions";

export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(
      "/forgot-password?error=" + encodeURIComponent("Lien expiré, recommencez la demande."),
    );
  const p = await searchParams;
  return (
    <AuthShell title="Nouveau mot de passe">
      <p className="text-[var(--muted)]">Compte : {user.email}</p>
      <Flash error={p.error} />
      <form action={updatePassword} className="space-y-4">
        <label>
          Nouveau mot de passe (8 caractères minimum)
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirmer le mot de passe
          <input
            name="confirm"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>
        <ConfirmSubmit className="w-full">Enregistrer le mot de passe</ConfirmSubmit>
      </form>
    </AuthShell>
  );
}
