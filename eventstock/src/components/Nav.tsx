import Link from "next/link";
import { logout } from "@/app/auth/actions";
import NavLinks from "./NavLinks";

export default function Nav({ orgName }: { orgName: string }) {
  return (
    <header className="bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link href="/dashboard" className="no-underline hover:no-underline min-w-0">
          <span className="block font-extrabold text-lg leading-none text-[var(--indigo)]">
            EventStock
          </span>
          <span className="block text-sm text-[var(--muted)] truncate">{orgName}</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <NavLinks variant="top" />
          <form action={logout}>
            <button className="btn-ghost !px-3 text-sm">Déconnexion</button>
          </form>
        </div>
      </div>
      <div className="awning" aria-hidden />
      <NavLinks variant="bottom" />
    </header>
  );
}
