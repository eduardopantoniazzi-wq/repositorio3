import type { Role } from "@/generated/prisma/enums";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  ESTOQUISTA: "Estoquista",
  OPERADOR_ENVASE: "Operador de Envase",
};

export type NavItem = {
  href: string;
  label: string;
  icon: "home" | "box" | "in" | "out" | "scale" | "count" | "chart" | "users";
};

export function navItemsForRole(role: Role): NavItem[] {
  switch (role) {
    case "OPERADOR_ENVASE":
      // Minimal-friction flow: withdrawal is the only thing this role does.
      return [{ href: "/saidas/nova", label: "Retirar", icon: "out" }];
    case "ESTOQUISTA":
      return [
        { href: "/saidas/nova", label: "Retirar", icon: "out" },
        { href: "/entradas/nova", label: "Receber", icon: "in" },
        { href: "/saldo", label: "Saldo", icon: "scale" },
        { href: "/contagens", label: "Contagem", icon: "count" },
        { href: "/skus", label: "SKUs", icon: "box" },
      ];
    case "ADMIN":
      return [
        { href: "/dashboard", label: "Dashboard", icon: "chart" },
        { href: "/saldo", label: "Saldo", icon: "scale" },
        { href: "/entradas/nova", label: "Receber", icon: "in" },
        { href: "/saidas/nova", label: "Retirar", icon: "out" },
        { href: "/contagens", label: "Contagem", icon: "count" },
        { href: "/skus", label: "SKUs", icon: "box" },
        { href: "/admin/usuarios", label: "Usuários", icon: "users" },
        { href: "/admin/unidades", label: "Unidades", icon: "users" },
      ];
  }
}
