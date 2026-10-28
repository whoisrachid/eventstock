import { requireContext } from "@/lib/session";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import Flash from "@/components/Flash";
import { addCustomer } from "./actions";

export default async function Customers({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, organizationId } = await requireContext();
  const { data } = await supabase
    .from("customers")
    .select("id,name,phone")
    .eq("organization_id", organizationId)
    .order("name");
  const p = await searchParams;
  return (
    <div className="space-y-5">
      <h1>Clients</h1>
      <Flash error={p.error} />
      <form action={addCustomer} className="panel space-y-3">
        <h2>Ajouter un client</h2>
        <div className="grid sm:grid-cols-[2fr_1fr_auto] gap-3 items-end">
          <label>
            Nom
            <input name="name" placeholder="Ex. Famille Kouassi" required />
          </label>
          <label>
            Téléphone
            <input name="phone" type="tel" inputMode="tel" placeholder="07 00 00 00 00" />
          </label>
          <ConfirmSubmit>Ajouter</ConfirmSubmit>
        </div>
      </form>
      {data && data.length === 0 ? (
        <p className="panel text-[var(--muted)]">Aucun client pour l'instant.</p>
      ) : (
        <div className="table-wrap">
          <table className="!min-w-0">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((x) => (
                <tr key={x.id}>
                  <td className="font-semibold">{x.name}</td>
                  <td>
                    {x.phone ? <a href={`tel:${x.phone.replace(/\s/g, "")}`}>{x.phone}</a> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
