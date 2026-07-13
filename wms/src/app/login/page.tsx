import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/dal";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  // Safe to check here (a page render, not a Server Action) because we
  // only ever redirect — never write the cookie. See proxy.ts for why that
  // distinction matters.
  const user = await getOptionalUser();
  if (user) {
    redirect("/");
  }

  return <LoginForm />;
}
