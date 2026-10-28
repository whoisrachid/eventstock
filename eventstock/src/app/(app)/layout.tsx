import Nav from "@/components/Nav";
import { requireContext } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { orgName } = await requireContext();
  return (
    <>
      <Nav orgName={orgName} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-28 sm:pb-12">{children}</main>
    </>
  );
}
