"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/context";
import { triggerWebhooks } from "@/lib/webhooks";
import type { Role } from "@prisma/client";

export async function createUser(input: { name: string; email: string; role: Role; departmentId: string | null; jobTitle: string }) {
  const admin = await requireAdmin();
  const tenant = admin.tenant;
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !email) {
    return { ok: false, error: "Name and email are required." };
  }

  const existing = await prisma.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } });
  if (existing) {
    return { ok: false, error: `A user with email ${email} already exists.` };
  }

  const created = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name,
      email,
      role: input.role,
      departmentId: input.departmentId,
      jobTitle: input.jobTitle.trim() || null,
    },
  });

  await triggerWebhooks(tenant.id, "USER_CREATED", { id: created.id, name: created.name, email: created.email, role: created.role });

  revalidatePath("/user-management");
  revalidatePath("/(dashboard)", "layout");
  return { ok: true, id: created.id };
}

export async function updateUserRole(userId: string, role: Role) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/user-management");
  return { ok: true };
}

export async function toggleUserActive(userId: string) {
  await requireAdmin();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive } });
  revalidatePath("/user-management");
  revalidatePath("/(dashboard)", "layout");
  return { ok: true, isActive: !user.isActive };
}

export type BulkImportRow = { name: string; email: string; role: Role; department: string; jobTitle: string };

export async function bulkImportUsers(rows: BulkImportRow[]) {
  const admin = await requireAdmin();
  const tenant = admin.tenant;
  const departments = await prisma.department.findMany({ where: { tenantId: tenant.id } });
  const deptByName = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const name = row.name.trim();
    const email = row.email.trim().toLowerCase();
    if (!name || !email) {
      skipped++;
      continue;
    }
    const existing = await prisma.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } });
    if (existing) {
      skipped++;
      errors.push(`${email} already exists — skipped`);
      continue;
    }
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name,
        email,
        role: row.role,
        departmentId: deptByName.get(row.department.trim().toLowerCase()) ?? null,
        jobTitle: row.jobTitle.trim() || null,
      },
    });
    created++;
  }

  revalidatePath("/user-management");
  revalidatePath("/(dashboard)", "layout");
  return { ok: true, created, skipped, errors };
}
