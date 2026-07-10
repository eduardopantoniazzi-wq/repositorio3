import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";

export default async function Home() {
  const user = await requireUser();

  switch (user.role) {
    case "OPERADOR_ENVASE":
      redirect("/saidas/nova");
    case "ESTOQUISTA":
      redirect("/saldo");
    case "ADMIN":
      redirect("/dashboard");
  }
}
