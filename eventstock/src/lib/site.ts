import { headers } from "next/headers";

// Adresse publique du site, pour les liens envoyés par email.
export async function siteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// N'autorise que les redirections internes au site (ex. "/reset-password").
export function safeNext(next: string | null, fallback = "/dashboard"): string {
  return next && /^\/[a-z0-9\-/]*$/i.test(next) && !next.startsWith("//") ? next : fallback;
}
