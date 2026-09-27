import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === "LEARNER" ? "/my-learning" : "/analytics-compliance");

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-space-xl">
      <LoginForm />
    </div>
  );
}
