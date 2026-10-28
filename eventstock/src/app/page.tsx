import Link from "next/link";

const POINTS = [
  {
    title: "Pas de double location",
    text: "Avant chaque confirmation, EventStock vérifie combien de pièces sont déjà prises sur les mêmes heures.",
  },
  {
    title: "Le bon montant",
    text: "Jours facturés, transport et remise : le total est calculé pour vous, sans erreur de calcul.",
  },
  {
    title: "Chaque franc suivi",
    text: "Avances et soldes en espèces, Wave, Orange Money ou MTN MoMo, avec le reste à payer toujours visible.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="awning" aria-hidden />
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <header className="flex items-center justify-between py-5">
          <span className="font-extrabold text-xl text-[var(--indigo)]">EventStock</span>
          <Link href="/login" className="font-semibold">
            Se connecter
          </Link>
        </header>
        <section className="py-12 sm:py-20 max-w-3xl">
          <h1 className="!text-4xl sm:!text-6xl !leading-[1.05]">
            Vos chaises, bâches et sonos ne seront plus jamais louées deux fois.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-[var(--muted)] max-w-2xl">
            L'outil des loueurs de matériel événementiel en Côte d'Ivoire : stock, clients,
            réservations et paiements au même endroit, depuis votre téléphone.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/register" className="btn !px-6 !py-3 text-lg">
              Essayer 14 jours gratuitement
            </Link>
            <Link href="/login">J'ai déjà un compte</Link>
          </div>
        </section>
        <section className="grid sm:grid-cols-3 gap-8 border-t border-[var(--line)] py-12">
          {POINTS.map((p) => (
            <div key={p.title}>
              <h2>{p.title}</h2>
              <p className="mt-2 text-[var(--muted)]">{p.text}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
