"use server";
import { requireContext } from "@/lib/session";
import { friendlyError } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  quantity_total: z.coerce.number().int().min(0).max(1000000),
  price_per_day: z.coerce.number().int().min(0).max(100000000),
});

function fail(message: string): never {
  redirect("/equipment?error=" + encodeURIComponent(message));
}

export async function addEquipment(form: FormData) {
  const { supabase, organizationId, role } = await requireContext();
  if (role === "staff") fail("Permission insuffisante.");
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) fail("Formulaire invalide.");
  const { error } = await supabase
    .from("equipment")
    .insert({ ...parsed.data, organization_id: organizationId });
  if (error) {
    console.error("equipment insert", error);
    fail(friendlyError(error.message));
  }
  revalidatePath("/equipment");
  redirect("/equipment");
}

export async function updateEquipment(form: FormData) {
  const { supabase, organizationId, role } = await requireContext();
  if (role === "staff") fail("Permission insuffisante.");
  const id = z.string().uuid().safeParse(form.get("equipment_id"));
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!id.success || !parsed.success) fail("Formulaire invalide.");
  const { error } = await supabase.rpc("update_equipment", {
    p_organization_id: organizationId,
    p_equipment_id: id.data,
    p_name: parsed.data.name,
    p_quantity_total: parsed.data.quantity_total,
    p_price_per_day: parsed.data.price_per_day,
  });
  if (error) {
    console.error("update_equipment", error);
    fail(friendlyError(error.message));
  }
  revalidatePath("/equipment");
  redirect("/equipment?notice=" + encodeURIComponent("Matériel mis à jour."));
}
