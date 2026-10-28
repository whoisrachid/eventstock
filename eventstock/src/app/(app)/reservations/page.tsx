import Link from "next/link";
import { requireContext } from "@/lib/session";
import { dateTime, fcfa } from "@/lib/format";
import Flash from "@/components/Flash";
import StatusBadge from "@/components/StatusBadge";
import ReservationCards, { BalanceText } from "@/components/ReservationCards";
import ReservationForm from "@/components/ReservationForm";
import { createReservation } from "./actions";

export default async function Reservations({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; new?: string }>;
}) {
  const { supabase, organizationId, role } = await requireContext();
  const canManage = role !== "staff";
  const [r, c, e, b] = await Promise.all([
    supabase
      .from("reservations")
      .select("id,start_at,end_at,status,total,event_location,customers(name)")
      .eq("organization_id", organizationId)
      .order("start_at", { ascending: false })
      .limit(100),
    supabase
      .from("customers")
      .select("id,name")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("equipment")
      .select("id,name,quantity_total,price_per_day")
      .eq("organization_id", organizationId)
      .order("name"),
    supabase
      .from("reservation_balances")
      .select("reservation_id,balance")
      .eq("organization_id", organizationId)
      .order("start_at", { ascending: false })
      .limit(100),
  ]);
  const balanceOf = new Map((b.data ?? []).map((x) => [x.reservation_id, x.balance]));
  const p = await searchParams;
  const missing = !c.data?.length ? "un client" : !e.data?.length ? "du matériel" : null;

  return (
    <div className="space-y-5">
      <h1>Réservations</h1>
      <Flash error={p.error} notice={p.notice} />
      {canManage &&
        (missing ? (
          <p className="panel text-[var(--muted)]">
            Pour réserver, ajoutez d'abord {missing} :{" "}
            <Link href={missing === "un client" ? "/customers" : "/equipment"}>c'est par ici</Link>.
          </p>
        ) : (
          <details className="panel" open={p.new === "1" || !!p.error || !r.data?.length}>
            <summary className="text-lg">Nouvelle réservation</summary>
            <div className="mt-4">
              <ReservationForm
                action={createReservation}
                customers={c.data ?? []}
                equipment={e.data ?? []}
              />
            </div>
          </details>
        ))}
      {r.data && r.data.length > 0 && (
        <ReservationCards
          className="sm:hidden"
          items={r.data.map((x) => ({
            ...x,
            customerName: (x.customers as unknown as { name: string } | null)?.name ?? "Client",
            balance: balanceOf.get(x.id) ?? x.total,
          }))}
        />
      )}
      {r.data && r.data.length > 0 && (
        <div className="table-wrap hidden sm:block">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Période</th>
                <th>Statut</th>
                <th className="amount">Total</th>
                <th className="amount">Reste à payer</th>
              </tr>
            </thead>
            <tbody>
              {r.data.map((x) => {
                const balance = balanceOf.get(x.id) ?? x.total;
                return (
                  <tr key={x.id}>
                    <td>
                      <Link href={`/reservations/${x.id}`} className="font-semibold">
                        {(x.customers as unknown as { name: string } | null)?.name ?? "Client"}
                      </Link>
                      {x.event_location && (
                        <span className="block text-sm text-[var(--muted)]">
                          {x.event_location}
                        </span>
                      )}
                    </td>
                    <td className="text-sm whitespace-nowrap">
                      {dateTime(x.start_at)}
                      <span className="block text-[var(--muted)]">au {dateTime(x.end_at)}</span>
                    </td>
                    <td>
                      <StatusBadge status={x.status} />
                    </td>
                    <td className="amount">{fcfa(x.total)}</td>
                    <td className="amount">
                      <BalanceText status={x.status} balance={balance} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
