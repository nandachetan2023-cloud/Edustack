"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";

export async function login(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({ where: { email: normalizedEmail } });

  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: "Incorrect email or password." };
  }
  if (!user.isActive) {
    return { ok: false, error: "This account has been deactivated. Contact your admin." };
  }

  await createSession(user.id);
  return { ok: true, redirectTo: user.role === "LEARNER" ? "/my-learning" : "/analytics-compliance" };
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
