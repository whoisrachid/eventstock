import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Flash from "@/components/Flash";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { requestPasswordReset } from "../auth/actions";

export default async function ForgotPassword({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const p = await searchParams;
  return (
    <AuthShell title="Mot de passe oublié">
      <p className="text-[var(--muted)]">
        Indiquez votre email : vous recevrez un lien pour choisir un nouveau mot de passe.
      </p>
      <Flash error={p.error} />
      <form action={requestPasswordReset} className="space-y-4">
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <ConfirmSubmit className="w-full">Envoyer le lien</ConfirmSubmit>
      </form>
      <Link href="/login" className="text-sm">
        Retour à la connexion
      </Link>
    </AuthShell>
  );
}
