"use server";
import { requireContext } from "@/lib/session";
import { friendlyError } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const optionalInt = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(0).max(max).optional(),
  );

const createSchema = z.object({
  customer_id: z.string().uuid(),
  start_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  end_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  event_location: z.string().trim().max(200).default(""),
  billed_days: optionalInt(366),
  transport_fee: optionalInt(100_000_000),
  discount: optionalInt(100_000_000_000),
  items: z
    .array(
      z.object({
        equipment_id: z.string().uuid(),
        quantity: z.coerce.number().int().positive().max(1_000_000),
      }),
    )
    .min(1)
    .max(100),
});

// Les champs "datetime-local" n'ont pas de fuseau : on les lit à l'heure d'Abidjan (UTC+0, sans heure d'été).
function abidjan(local: string): Date {
  return new Date(`${local}:00Z`);
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createReservation(form: FormData) {
  const { supabase, organizationId, role } = await requireContext();
  if (role === "staff") fail("/reservations", "Permission insuffisante.");
  const ids = form.getAll("equipment_id");
  const quantities = form.getAll("quantity");
  const parsed = createSchema.safeParse({
    ...Object.fromEntries(form),
    items: ids.map((id, i) => ({ equipment_id: id, quantity: quantities[i] })),
  });
  if (!parsed.success) fail("/reservations", "Formulaire invalide.");
  const d = parsed.data;
  if (new Set(d.items.map((i) => i.equipment_id)).size !== d.items.length)
    fail("/reservations", "Le même matériel apparaît deux fois.");
  if (d.billed_days === 0) fail("/reservations", "Nombre de jours facturés invalide.");
  const start = abidjan(d.start_at);
  const end = abidjan(d.end_at);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end)
    fail("/reservations", "La date de fin doit être après la date de début.");
  const { data, error } = await supabase.rpc("create_confirmed_reservation", {
    p_organization_id: organizationId,
    p_customer_id: d.customer_id,
    p_start_at: start.toISOString(),
    p_end_at: end.toISOString(),
    p_items: d.items,
    p_billed_days: d.billed_days ?? null,
    p_transport_fee: d.transport_fee ?? 0,
    p_discount: d.discount ?? 0,
    p_event_location: d.event_location,
  });
  if (error) {
    console.error("create_confirmed_reservation", error);
    fail("/reservations", friendlyError(error.message));
  }
  revalidatePath("/reservations");
  redirect(`/reservations/${data}?notice=${encodeURIComponent("Réservation confirmée.")}`);
}

export async function cancelReservation(form: FormData) {
  const { supabase, organizationId, role } = await requireContext();
  const id = z.string().uuid().safeParse(form.get("reservation_id"));
  const back = String(form.get("back") || "/reservations");
  // Retour vers la liste ou la fiche de la réservation uniquement (pas de redirection arbitraire).
  const path = /^\/reservations(\/[0-9a-f-]{36})?$/.test(back) ? back : "/reservations";
  if (!id.success) fail(path, "Réservation invalide.");
  if (role === "staff") fail(path, "Permission insuffisante.");
  const { error } = await supabase.rpc("cancel_reservation", {
    p_organization_id: organizationId,
    p_reservation_id: id.data,
  });
  if (error) {
    console.error("cancel_reservation", error);
    fail(path, friendlyError(error.message));
  }
  revalidatePath("/reservations");
  redirect(
    `${path}?notice=${encodeURIComponent("Réservation annulée, le matériel est de nouveau disponible.")}`,
  );
}
