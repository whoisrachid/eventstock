import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Flash from "@/components/Flash";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { login } from "../auth/actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const p = await searchParams;
  return (
    <AuthShell title="Connexion">
      <Flash error={p.error} notice={p.notice} />
      <form action={login} className="space-y-4">
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Mot de passe
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <ConfirmSubmit className="w-full">Se connecter</ConfirmSubmit>
      </form>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/register">Créer un compte</Link>
        <Link href="/forgot-password">Mot de passe oublié ?</Link>
      </div>
    </AuthShell>
  );
}
