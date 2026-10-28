import Link from "next/link";
import { dateTime, fcfa } from "@/lib/format";
import StatusBadge from "./StatusBadge";

export type ReservationSummary = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  total: number;
  event_location: string;
  customerName: string;
  balance?: number;
};

export function BalanceText({ status, balance }: { status: string; balance: number }) {
  if (status === "cancelled") return <>—</>;
  return balance > 0 ? (
    <span className="due">{fcfa(balance)}</span>
  ) : (
    <span className="settled">Soldé</span>
  );
}

// Liste de réservations en cartes, lisible sur téléphone.
export default function ReservationCards({
  items,
  className = "",
}: {
  items: ReservationSummary[];
  className?: string;
}) {
  return (
    <ul className={`space-y-3 ${className}`}>
      {items.map((r) => (
        <li key={r.id}>
          <Link
            href={`/reservations/${r.id}`}
            className="panel !p-4 block no-underline hover:no-underline hover:border-[var(--indigo)] text-[var(--ink)]"
          >
            <span className="flex items-start justify-between gap-3">
              <strong className="min-w-0 truncate">{r.customerName}</strong>
              <StatusBadge status={r.status} />
            </span>
            <span className="block text-sm text-[var(--muted)] mt-1">
              {dateTime(r.start_at)} au {dateTime(r.end_at)}
            </span>
            {r.event_location && (
              <span className="block text-sm text-[var(--muted)] truncate">{r.event_location}</span>
            )}
            {r.balance !== undefined && (
              <span className="flex justify-between gap-3 mt-2 pt-2 border-t border-[var(--line)] text-sm num">
                <span>Total {fcfa(r.total)}</span>
                <span>
                  {r.status !== "cancelled" && r.balance > 0 && "Reste "}
                  <BalanceText status={r.status} balance={r.balance} />
                </span>
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
