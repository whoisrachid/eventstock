import { requireContext } from "@/lib/session";
import { fcfa } from "@/lib/format";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import Flash from "@/components/Flash";
import { addEquipment, updateEquipment } from "./actions";

export default async function Equipment({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { supabase, organizationId, role } = await requireContext();
  const canManage = role !== "staff";
  const { data, error } = await supabase
    .from("equipment")
    .select("id,name,quantity_total,price_per_day")
    .eq("organization_id", organizationId)
    .order("name");
  const p = await searchParams;
  return (
    <div className="space-y-5">
      <h1>Matériel</h1>
      <Flash
        error={p.error || (error ? "Chargement impossible, réessayez." : undefined)}
        notice={p.notice}
      />
      {canManage && (
        <form action={addEquipment} className="panel space-y-3">
          <h2>Ajouter du matériel</h2>
          <div className="grid sm:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
            <label>
              Nom
              <input name="name" placeholder="Ex. Chaise Napoléon blanche" required />
            </label>
            <label>
              Quantité en stock
              <input name="quantity_total" type="number" min="0" inputMode="numeric" required />
            </label>
            <label>
              Prix par jour (FCFA)
              <input name="price_per_day" type="number" min="0" inputMode="numeric" required />
            </label>
            <ConfirmSubmit>Ajouter</ConfirmSubmit>
          </div>
        </form>
      )}
      {data && data.length === 0 ? (
        <p className="panel text-[var(--muted)]">
          Aucun matériel pour l'instant. Ajoutez vos chaises, tables, bâches ou sonos ci-dessus.
        </p>
      ) : (
        <ul className="panel !p-0 divide-y divide-[var(--line)]">
          {data?.map((x) => (
            <li key={x.id} className="p-4">
              <details className="group">
                <summary className="flex items-start justify-between gap-4 !text-[var(--ink)] !font-normal">
                  <span className="min-w-0">
                    <strong className="block">{x.name}</strong>
                    <span className="block text-sm text-[var(--muted)] num">
                      {x.quantity_total} en stock, {fcfa(x.price_per_day)} par jour
                    </span>
                  </span>
                  {canManage && (
                    <span className="text-[var(--indigo)] font-semibold text-sm shrink-0">
                      <span className="group-open:hidden">Modifier</span>
                      <span className="hidden group-open:inline">Fermer</span>
                    </span>
                  )}
                </summary>
                {canManage && (
                  <form
                    action={updateEquipment}
                    className="grid sm:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end mt-4"
                  >
                    <input type="hidden" name="equipment_id" value={x.id} />
                    <label>
                      Nom
                      <input name="name" defaultValue={x.name} required />
                    </label>
                    <label>
                      Quantité en stock
                      <input
                        name="quantity_total"
                        type="number"
                        min="0"
                        defaultValue={x.quantity_total}
                        required
                      />
                    </label>
                    <label>
                      Prix par jour (FCFA)
                      <input
                        name="price_per_day"
                        type="number"
                        min="0"
                        defaultValue={x.price_per_day}
                        required
                      />
                    </label>
                    <ConfirmSubmit>Enregistrer</ConfirmSubmit>
                    <p className="text-xs text-[var(--muted)] sm:col-span-4">
                      Un nouveau prix s'applique aux prochaines réservations seulement. Le stock ne
                      peut pas descendre sous ce qui est déjà réservé.
                    </p>
                  </form>
                )}
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
