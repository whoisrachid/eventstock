import Link from "next/link";

// Cadre des pages publiques (connexion, inscription, mot de passe).
export default function AuthShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="max-w-md mx-auto">
        <Link
          href="/"
          className="inline-block mb-6 font-extrabold text-xl text-[var(--indigo)] no-underline hover:no-underline"
        >
          EventStock
        </Link>
        <div className="bg-white border border-[var(--line)] rounded-[14px] overflow-hidden">
          <div className="awning" aria-hidden />
          <div className="p-6 sm:p-8 space-y-5">
            <h1>{title}</h1>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
