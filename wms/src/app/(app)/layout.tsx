import { requireUser } from "@/lib/dal";
import { resolveActiveUnitId, listUnitsForSwitcher } from "@/lib/units";
import { Shell } from "@/components/shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const currentUnitId = await resolveActiveUnitId(user);
  const units = user.role === "ADMIN" ? await listUnitsForSwitcher() : [];

  return (
    <Shell user={user} units={units} currentUnitId={currentUnitId}>
      {children}
    </Shell>
  );
}
