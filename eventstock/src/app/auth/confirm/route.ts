import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/site";

// Point d'arrivée des liens envoyés par email (confirmation d'inscription, mot de passe oublié).
// Accepte les deux formats Supabase : ?token_hash=…&type=… (recommandé) ou ?code=…
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const supabase = await supabaseServer();

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
    if (error) console.error("verifyOtp", error.message);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) console.error("exchangeCodeForSession", error.message);
  }

  const target = new URL(ok ? next : "/login", url.origin);
  if (!ok) target.searchParams.set("error", "Lien invalide ou expiré. Recommencez la demande.");
  return NextResponse.redirect(target);
}
