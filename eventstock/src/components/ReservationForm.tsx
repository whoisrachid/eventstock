"use client";
import { useMemo, useState } from "react";
import ConfirmSubmit from "./ConfirmSubmit";
import { fcfa } from "@/lib/format";

type Equipment = { id: string; name: string; quantity_total: number; price_per_day: number };
type Customer = { id: string; name: string };
type Line = { key: number; equipment_id: string; quantity: number };

// Même règle que la base : toute tranche de 24 h entamée compte pour un jour.
function computedDays(start: string, end: string): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.min(366, Math.max(1, Math.ceil(ms / 86_400_000)));
}

export default function ReservationForm({
  action,
  customers,
  equipment,
}: {
  action: (form: FormData) => Promise<void>;
  customers: Customer[];
  equipment: Equipment[];
}) {
  const [lines, setLines] = useState<Line[]>([{ key: 0, equipment_id: "", quantity: 1 }]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [days, setDays] = useState("");
  const [transport, setTransport] = useState("");
  const [discount, setDiscount] = useState("");

  const byId = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);
  const autoDays = computedDays(start, end);
  const billedDays = days ? Number(days) : autoDays;
  const perDay = lines.reduce(
    (sum, l) => sum + (byId.get(l.equipment_id)?.price_per_day ?? 0) * (l.quantity || 0),
    0,
  );
  const subtotal = billedDays ? perDay * billedDays : 0;
  const total = subtotal + Number(transport || 0) - Number(discount || 0);
  const chosen = new Set(lines.map((l) => l.equipment_id));

  function update(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  return (
    <form action={action} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <label>
          Client
          <select name="customer_id" required>
            <option value="">Sélectionner</option>
            {customers.map((x) => (
              <option value={x.id} key={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Lieu de l'événement
          <input name="event_location" maxLength={200} placeholder="Ex. Cocody, Riviera 2" />
        </label>
        <label>
          Début
          <input
            type="datetime-local"
            name="start_at"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          Fin
          <input
            type="datetime-local"
            name="end_at"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1">Matériel</legend>
        {lines.map((l) => (
          <div
            key={l.key}
            className="grid grid-cols-[1fr_5.5rem_auto] gap-2 items-center [&_select]:mt-0 [&_input]:mt-0"
          >
            <select
              name="equipment_id"
              required
              aria-label="Matériel"
              value={l.equipment_id}
              onChange={(e) => update(l.key, { equipment_id: e.target.value })}
            >
              <option value="">Sélectionner</option>
              {equipment.map((x) => (
                <option
                  value={x.id}
                  key={x.id}
                  disabled={chosen.has(x.id) && x.id !== l.equipment_id}
                >
                  {x.name}, {fcfa(x.price_per_day)} par jour ({x.quantity_total} en stock)
                </option>
              ))}
            </select>
            <input
              type="number"
              name="quantity"
              min={1}
              required
              aria-label="Quantité"
              value={l.quantity}
              onChange={(e) => update(l.key, { quantity: Number(e.target.value) })}
            />
            <button
              type="button"
              className="btn-ghost"
              disabled={lines.length === 1}
              onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
              aria-label="Retirer cette ligne"
            >
              ✕
            </button>
          </div>
        ))}
        {lines.length < equipment.length && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() =>
              setLines((ls) => [
                ...ls,
                { key: Math.max(...ls.map((x) => x.key)) + 1, equipment_id: "", quantity: 1 },
              ])
            }
          >
            + Ajouter du matériel
          </button>
        )}
      </fieldset>

      <div className="grid sm:grid-cols-3 gap-3">
        <label>
          Jours facturés
          <input
            type="number"
            name="billed_days"
            min={1}
            max={366}
            placeholder={autoDays ? `${autoDays} (calcul auto)` : "Calcul auto"}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </label>
        <label>
          Transport (FCFA)
          <input
            type="number"
            name="transport_fee"
            min={0}
            placeholder="0"
            value={transport}
            onChange={(e) => setTransport(e.target.value)}
          />
        </label>
        <label>
          Remise (FCFA)
          <input
            type="number"
            name="discount"
            min={0}
            placeholder="0"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
        <p className="text-sm text-[var(--muted)] num">
          {billedDays && perDay > 0 ? (
            <>
              Estimation : {fcfa(perDay)} par jour × {billedDays} j ={" "}
              <strong className="text-[var(--ink)] text-lg">{fcfa(Math.max(0, total))}</strong>
            </>
          ) : (
            "Choisissez les dates et le matériel pour voir le montant."
          )}
        </p>
        <ConfirmSubmit>Confirmer la réservation</ConfirmSubmit>
      </div>
    </form>
  );
}
