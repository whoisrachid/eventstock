"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/format";
import { siteUrl } from "@/lib/site";
export async function login(formData: FormData) {
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  });
  if (error) redirect("/login?error=" + encodeURIComponent(friendlyError(error.message)));
  redirect("/dashboard");
}
export async function register(formData: FormData) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    options: { emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/onboarding` },
  });
  if (error) redirect("/register?error=" + encodeURIComponent(friendlyError(error.message)));
  if (!data.session)
    redirect(
      "/login?notice=" + encodeURIComponent("Confirmez votre adresse email puis connectez-vous."),
    );
  redirect("/onboarding");
}
export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) redirect("/forgot-password?error=Adresse%20email%20invalide");
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/reset-password`,
  });
  // Même message que l'adresse existe ou non : on ne révèle pas qui a un compte.
  if (error && /rate limit/i.test(error.message))
    redirect("/forgot-password?error=" + encodeURIComponent(friendlyError(error.message)));
  if (error) console.error("resetPasswordForEmail", error.message);
  redirect(
    "/login?notice=" +
      encodeURIComponent("Si un compte existe pour cette adresse, un email vient d'être envoyé."),
  );
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password.length < 8)
    redirect("/reset-password?error=" + encodeURIComponent("8 caractères minimum."));
  if (password !== confirm)
    redirect(
      "/reset-password?error=" + encodeURIComponent("Les deux mots de passe ne correspondent pas."),
    );
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=" + encodeURIComponent("Lien expiré, recommencez."));
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const same = /different from the old/i.test(error.message);
    redirect(
      "/reset-password?error=" +
        encodeURIComponent(
          same ? "Choisissez un mot de passe différent de l'ancien." : friendlyError(error.message),
        ),
    );
  }
  redirect("/dashboard");
}
