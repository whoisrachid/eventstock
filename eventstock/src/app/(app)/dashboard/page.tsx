import Link from "next/link";
import { requireContext } from "@/lib/session";
import { fcfa } from "@/lib/format";
import ReservationCards from "@/components/ReservationCards";

export default async function Dashboard() {
  const { supabase, organizationId, role } = await requireContext();
  const now = new Date();
  const inAWeek = new Date(now.getTime() + 7 * 86_400_000);
  const [week, due, e, c] = await Promise.all([
    // Réservations en cours ou qui commencent dans les 7 jours
    supabase
      .from("reservations")
      .select("id,start_at,end_at,status,total,event_location,customers(name)")
      .eq("organization_id", organizationId)
      .in("status", ["confirmed", "out"])
      .lt("start_at", inAWeek.toISOString())
      .gt("end_at", now.toISOString())
      .order("start_at")
      .limit(20),
    supabase
      .from("reservation_balances")
      .select("reservation_id,balance")
      .eq("organization_id", organizationId)
      .neq("status", "cancelled")
      .gt("balance", 0),
    supabase
      .from("equipment")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);
  const toCollect = (due.data ?? []).reduce((s, x) => s + x.balance, 0);
  const isEmpty = !e.count && !c.count;

  return (
    <div className="space-y-6">
      <h1>Cette semaine</h1>

      {isEmpty && (
        <section className="panel space-y-3">
          <h2>Pour commencer</h2>
          <p className="text-[var(--muted)]">
            Ajoutez votre matériel et un premier client, puis créez votre première réservation.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/equipment" className="btn">
              Ajouter du matériel
            </Link>
            <Link href="/customers" className="btn btn-ghost">
              Ajouter un client
            </Link>
          </div>
        </section>
      )}

      <div className="grid sm:grid-cols-[2fr_1fr] gap-6 items-start">
        <section className="space-y-3">
          {week.data && week.data.length > 0 ? (
            <ReservationCards
              items={week.data.map((r) => ({
                ...r,
                customerName: (r.customers as unknown as { name: string } | null)?.name ?? "Client",
              }))}
            />
          ) : (
            !isEmpty && (
              <div className="panel text-[var(--muted)]">
                Aucune réservation dans les 7 prochains jours.{" "}
                {role !== "staff" && <Link href="/reservations">Créer une réservation</Link>}
              </div>
            )
          )}
        </section>

        <aside className="panel space-y-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Reste à encaisser</p>
            <p className={`text-3xl font-extrabold num ${toCollect > 0 ? "due" : ""}`}>
              {fcfa(toCollect)}
            </p>
            <p className="text-sm text-[var(--muted)]">
              sur {due.data?.length ?? 0} réservation{(due.data?.length ?? 0) > 1 ? "s" : ""}
            </p>
          </div>
          <div className="border-t border-[var(--line)] pt-4 text-sm space-y-1">
            <p>
              <Link href="/equipment">{e.count ?? 0} références de matériel</Link>
            </p>
            <p>
              <Link href="/customers">{c.count ?? 0} clients</Link>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
