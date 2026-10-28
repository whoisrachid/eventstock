"use server";
import { requireContext } from "@/lib/session";
import { friendlyError, PAYMENT_METHODS } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const paymentSchema = z.object({
  reservation_id: z.string().uuid(),
  amount: z.coerce.number().int().positive().max(100_000_000_000),
  method: z.enum(Object.keys(PAYMENT_METHODS) as [string, ...string[]]),
  reference: z.string().trim().max(100).default(""),
});

function back(id: string, key: "error" | "notice", message: string): never {
  redirect(`/reservations/${id}?${key}=${encodeURIComponent(message)}`);
}

export async function recordPayment(form: FormData) {
  const { supabase, organizationId, role } = await requireContext();
  const parsed = paymentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const id = z.string().uuid().safeParse(form.get("reservation_id"));
    if (!id.success) redirect("/reservations");
    back(id.data, "error", "Montant ou moyen de paiement invalide.");
  }
  const d = parsed.data;
  if (role === "staff") back(d.reservation_id, "error", "Permission insuffisante.");
  const { error } = await supabase.rpc("record_payment", {
    p_organization_id: organizationId,
    p_reservation_id: d.reservation_id,
    p_amount: d.amount,
    p_method: d.method,
    p_reference: d.reference || null,
  });
  if (error) {
    console.error("record_payment", error);
    back(d.reservation_id, "error", friendlyError(error.message));
  }
  revalidatePath(`/reservations/${d.reservation_id}`);
  back(d.reservation_id, "notice", "Paiement enregistré.");
}

export async function voidPayment(form: FormData) {
  const { supabase, organizationId, role } = await requireContext();
  const reservationId = z.string().uuid().safeParse(form.get("reservation_id"));
  const paymentId = z.string().uuid().safeParse(form.get("payment_id"));
  if (!reservationId.success || !paymentId.success) redirect("/reservations");
  if (role !== "owner")
    back(reservationId.data, "error", "Seul le propriétaire peut annuler un paiement.");
  const { error } = await supabase.rpc("void_payment", {
    p_organization_id: organizationId,
    p_payment_id: paymentId.data,
  });
  if (error) {
    console.error("void_payment", error);
    back(reservationId.data, "error", friendlyError(error.message));
  }
  revalidatePath(`/reservations/${reservationId.data}`);
  back(reservationId.data, "notice", "Paiement annulé.");
}
