"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { UnitSwitcher } from "@/components/unit-switcher";
import { ROLE_LABELS, navItemsForRole, type NavItem } from "@/lib/roles";
import type { Role } from "@/generated/prisma/enums";

type Unit = { id: string; name: string; code: string; active: boolean };

export function Shell({
  children,
  user,
  units,
  currentUnitId,
}: {
  children: React.ReactNode;
  user: { name: string; role: Role };
  units: Unit[];
  currentUnitId: string;
}) {
  const pathname = usePathname();
  const items = navItemsForRole(user.role);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Controle de Embalagens</p>
          <p className="text-xs text-slate-500">
            {user.name} · {ROLE_LABELS[user.role]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.role === "ADMIN" && units.length > 0 && (
            <UnitSwitcher units={units} currentUnitId={currentUnitId} />
          )}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-3 md:block">
          <NavLinks items={items} pathname={pathname} />
        </nav>

        <main className="flex-1 p-4 pb-24 md:pb-4">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t border-slate-200 bg-white md:hidden">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 whitespace-nowrap px-2 py-2.5 text-xs font-medium ${
              pathname === item.href ? "text-blue-600" : "text-slate-500"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
              pathname === item.href
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
