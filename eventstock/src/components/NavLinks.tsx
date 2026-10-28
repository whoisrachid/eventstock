"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Package, Users } from "lucide-react";

const LINKS = [
  { href: "/dashboard", label: "Accueil", Icon: Home },
  { href: "/reservations", label: "Réservations", Icon: CalendarDays },
  { href: "/equipment", label: "Matériel", Icon: Package },
  { href: "/customers", label: "Clients", Icon: Users },
];

// Liens de navigation : en ligne sur ordinateur, barre d'onglets fixée en bas sur téléphone.
export default function NavLinks({ variant }: { variant: "top" | "bottom" }) {
  const path = usePathname();
  if (variant === "top")
    return (
      <div className="hidden sm:flex gap-1">
        {LINKS.map(({ href, label }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`px-3 py-2 rounded-md font-semibold no-underline hover:no-underline ${
                active
                  ? "bg-[var(--indigo-soft)] text-[var(--indigo)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    );
  return (
    <nav
      aria-label="Navigation principale"
      className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-[var(--line)] grid grid-cols-4 pb-[env(safe-area-inset-bottom)]"
    >
      {LINKS.map(({ href, label, Icon }) => {
        const active = path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-xs font-semibold no-underline hover:no-underline ${
              active ? "text-[var(--indigo)]" : "text-[var(--muted)]"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
