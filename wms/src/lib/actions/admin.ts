"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

const CreateUserSchema = z.object({
  name: z.string().trim().min(2, { error: "Informe o nome." }),
  email: z.email({ error: "E-mail inválido." }),
  password: z.string().min(6, { error: "Senha deve ter ao menos 6 caracteres." }),
  role: z.enum(["ADMIN", "ESTOQUISTA", "OPERADOR_ENVASE"]),
  unitId: z.string().optional(),
});

export type CreateUserState = { error?: string; success?: boolean } | undefined;

export async function createUser(_prevState: CreateUserState, formData: FormData): Promise<CreateUserState> {
  await requireRole("ADMIN");

  const parsed = CreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    unitId: formData.get("unitId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos." };
  }
  const data = parsed.data;

  if (data.role !== "ADMIN" && !data.unitId) {
    return { error: "Selecione a unidade para este perfil." };
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: "Já existe um usuário com este e-mail." };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      unitId: data.role === "ADMIN" ? null : data.unitId,
    },
  });

  revalidatePath("/admin/usuarios");
  return { success: true };
}

export async function toggleUserActive(formData: FormData) {
  const currentUser = await requireRole("ADMIN");
  const userId = formData.get("userId");
  if (typeof userId !== "string") return;

  // An admin locking out their own account (or the last remaining admin)
  // would leave nobody able to log in and undo it.
  if (userId === currentUser.userId) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  if (user.active && user.role === "ADMIN") {
    const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
    if (activeAdmins <= 1) return;
  }

  await prisma.user.update({ where: { id: userId }, data: { active: !user.active } });
  revalidatePath("/admin/usuarios");
}

const CreateUnitSchema = z.object({
  code: z.string().trim().min(1, { error: "Informe a sigla da unidade." }),
  name: z.string().trim().min(2, { error: "Informe o nome da unidade." }),
});

export type CreateUnitState = { error?: string; success?: boolean } | undefined;

export async function createUnit(_prevState: CreateUnitState, formData: FormData): Promise<CreateUnitState> {
  await requireRole("ADMIN");

  const parsed = CreateUnitSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos." };
  }

  const existing = await prisma.unit.findUnique({ where: { code: parsed.data.code.toUpperCase() } });
  if (existing) {
    return { error: "Já existe uma unidade com esta sigla." };
  }

  await prisma.unit.create({
    data: { code: parsed.data.code.toUpperCase(), name: parsed.data.name, active: true },
  });

  revalidatePath("/admin/unidades");
  return { success: true };
}

export async function toggleUnitActive(formData: FormData) {
  await requireRole("ADMIN");
  const unitId = formData.get("unitId");
  if (typeof unitId !== "string") return;

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) return;
  await prisma.unit.update({ where: { id: unitId }, data: { active: !unit.active } });
  revalidatePath("/admin/unidades");
}
