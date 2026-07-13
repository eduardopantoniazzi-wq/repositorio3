"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";

const LoginSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }),
  password: z.string().min(1, { error: "Informe a senha." }),
});

export type LoginState =
  | {
      error?: string;
    }
  | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Preencha e-mail e senha corretamente." };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return { error: "Usuário ou senha inválidos." };
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return { error: "Usuário ou senha inválidos." };
  }

  await createSession({
    userId: user.id,
    name: user.name,
    role: user.role,
    unitId: user.unitId,
  });

  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
