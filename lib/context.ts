import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function getDemoTenant() {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: "acme-academy" },
  });
  return tenant;
}

/** The real logged-in user (with tenant + department), or redirect to /login. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Like requireUser, but bounces LEARNER-role users back to /my-learning. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role === "LEARNER") redirect("/my-learning");
  return user;
}
