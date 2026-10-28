import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Flash from "@/components/Flash";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { register } from "../auth/actions";

export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const p = await searchParams;
  return (
    <AuthShell title="Créer un compte">
      <p className="text-[var(--muted)]">14 jours d'essai gratuit, sans carte bancaire.</p>
      <Flash error={p.error} />
      <form action={register} className="space-y-4">
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Mot de passe (8 caractères minimum)
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>
        <ConfirmSubmit className="w-full">Créer mon compte</ConfirmSubmit>
      </form>
      <p className="text-sm">
        Déjà inscrit ? <Link href="/login">Se connecter</Link>
      </p>
    </AuthShell>
  );
}
