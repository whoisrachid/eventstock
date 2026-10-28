import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContext } from "@/lib/session";
import { dateTime, fcfa, PAYMENT_METHODS } from "@/lib/format";
import Flash from "@/components/Flash";
import StatusBadge from "@/components/StatusBadge";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { cancelReservation } from "../actions";
import { recordPayment, voidPayment } from "./actions";

export default async function ReservationDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase, organizationId, role } = await requireContext();
  const canManage = role !== "staff";
  const { data: r } = await supabase
    .from("reservations")
    .select(
      "id,start_at,end_at,status,billed_days,subtotal,transport_fee,discount,total,event_location,created_at," +
        "customers(name,phone),reservation_items(id,quantity,unit_price,equipment(name))",
    )
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();
  const res = r as unknown as {
    id: string;
    start_at: string;
    end_at: string;
    status: string;
    billed_days: number;
    subtotal: number;
    transport_fee: number;
    discount: number;
    total: number;
    event_location: string;
    customers: { name: string; phone: string } | null;
    reservation_items: {
      id: string;
      quantity: number;
      unit_price: number;
      equipment: { name: string } | null;
    }[];
  };
  const { data: payments } = await supabase
    .from("payments")
    .select("id,amount,method,reference,created_at,voided_at")
    .eq("organization_id", organizationId)
    .eq("reservation_id", res.id)
    .order("created_at");
  const paid = (payments ?? []).filter((x) => !x.voided_at).reduce((s, x) => s + x.amount, 0);
  const balance = res.total - paid;
  const p = await searchParams;
  const path = `/reservations/${res.id}`;

  return (
    <div className="space-y-5">
      <Link href="/reservations" className="text-sm">
        Retour aux réservations
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>{res.customers?.name ?? "Client"}</h1>
          <p className="text-[var(--muted)] mt-1">
            Du {dateTime(res.start_at)} au {dateTime(res.end_at)}
          </p>
          {res.event_location && <p className="text-[var(--muted)]">{res.event_location}</p>}
          {res.customers?.phone && (
            <a href={`tel:${res.customers.phone.replace(/\s/g, "")}`}>{res.customers.phone}</a>
          )}
        </div>
        <StatusBadge status={res.status} />
      </div>
      <Flash error={p.error} notice={p.notice} />

      <section className="panel space-y-3">
        <h2>Détail</h2>
        <ul className="divide-y divide-[var(--line)]">
          {res.reservation_items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-4 py-3">
              <span className="min-w-0">
                <strong className="block font-semibold">{i.equipment?.name ?? "Matériel"}</strong>
                <span className="block text-sm text-[var(--muted)] num">
                  {i.quantity} × {fcfa(i.unit_price)} × {res.billed_days} j
                </span>
              </span>
              <span className="num whitespace-nowrap">
                {fcfa(i.quantity * i.unit_price * res.billed_days)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 max-w-xs ml-auto text-right border-t border-[var(--line)] pt-3">
          <dt>Sous-total</dt>
          <dd>{fcfa(res.subtotal)}</dd>
          <dt>Transport</dt>
          <dd>{fcfa(res.transport_fee)}</dd>
          <dt>Remise</dt>
          <dd>− {fcfa(res.discount)}</dd>
          <dt className="font-bold text-lg">Total</dt>
          <dd className="font-bold text-lg">{fcfa(res.total)}</dd>
        </dl>
      </section>

      <section className="panel space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2>Paiements</h2>
          <p className="flex flex-wrap gap-x-6 gap-y-1 num">
            <span>
              Payé <strong>{fcfa(paid)}</strong>
            </span>
            <span>
              Reste à payer{" "}
              <strong className={balance > 0 ? "due" : "settled"}>{fcfa(balance)}</strong>
            </span>
          </p>
        </div>
        {res.status === "cancelled" && paid > 0 && (
          <p className="flash bg-[var(--saffron-soft)] text-[#8a5d00]">
            Réservation annulée : {fcfa(paid)} déjà encaissés, à rembourser ou à conserver selon vos
            conditions.
          </p>
        )}
        {payments && payments.length > 0 ? (
          <ul className="divide-y divide-[var(--line)]">
            {payments.map((x) => (
              <li
                key={x.id}
                className={`flex items-center justify-between gap-4 py-3 ${x.voided_at ? "text-[var(--muted)]" : ""}`}
              >
                <span className="min-w-0">
                  <strong className={`block font-semibold ${x.voided_at ? "line-through" : ""}`}>
                    {PAYMENT_METHODS[x.method] ?? x.method}
                  </strong>
                  <span className="block text-sm text-[var(--muted)]">
                    {dateTime(x.created_at)}
                    {x.reference && `, réf. ${x.reference}`}
                    {x.voided_at && ", annulé"}
                  </span>
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className={`num whitespace-nowrap ${x.voided_at ? "line-through" : ""}`}>
                    {fcfa(x.amount)}
                  </span>
                  {role === "owner" && !x.voided_at && (
                    <form action={voidPayment}>
                      <input type="hidden" name="reservation_id" value={res.id} />
                      <input type="hidden" name="payment_id" value={x.id} />
                      <ConfirmSubmit
                        className="btn-ghost !px-3 !min-h-0 !py-1.5 text-sm"
                        message="Annuler ce paiement saisi par erreur ? Il restera visible, barré."
                      >
                        Annuler
                      </ConfirmSubmit>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--muted)]">Aucun paiement pour l'instant.</p>
        )}
        {canManage && res.status !== "cancelled" && balance > 0 && (
          <form
            action={recordPayment}
            className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end border-t border-[var(--line)] pt-4"
          >
            <input type="hidden" name="reservation_id" value={res.id} />
            <label>
              Montant (FCFA)
              <input
                name="amount"
                type="number"
                min={1}
                max={balance}
                defaultValue={balance}
                required
              />
            </label>
            <label>
              Moyen
              <select name="method" required defaultValue="cash">
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Référence (facultatif)
              <input name="reference" maxLength={100} placeholder="N° de transaction" />
            </label>
            <ConfirmSubmit>Enregistrer le paiement</ConfirmSubmit>
          </form>
        )}
      </section>

      {canManage && res.status === "confirmed" && (
        <form action={cancelReservation}>
          <input type="hidden" name="reservation_id" value={res.id} />
          <input type="hidden" name="back" value={path} />
          <ConfirmSubmit
            className="btn-danger"
            message="Annuler cette réservation ? Le matériel redeviendra disponible."
          >
            Annuler la réservation
          </ConfirmSubmit>
        </form>
      )}
    </div>
  );
}
