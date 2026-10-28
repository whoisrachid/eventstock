"use server";
import { requireContext } from "@/lib/session";
import { friendlyError } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
const schema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: z.string().trim().max(30),
});
export async function addCustomer(form: FormData) {
  const { supabase, organizationId } = await requireContext();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect("/customers?error=Formulaire%20invalide");
  const { error } = await supabase
    .from("customers")
    .insert({ ...parsed.data, organization_id: organizationId });
  if (error) redirect("/customers?error=" + encodeURIComponent(friendlyError(error.message)));
  revalidatePath("/customers");
  redirect("/customers");
}
