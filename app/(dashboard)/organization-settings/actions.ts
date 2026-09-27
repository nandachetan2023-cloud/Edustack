"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/context";

export async function updateSeatLimit(seatLimit: number) {
  const admin = await requireAdmin();
  await prisma.tenant.update({ where: { id: admin.tenant.id }, data: { seatLimit: Math.max(1, Math.round(seatLimit)) } });
  revalidatePath("/organization-settings");
  revalidatePath("/(dashboard)", "layout");
  return { ok: true };
}

export async function createDepartment(name: string) {
  const admin = await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Department name is required." };
  const existing = await prisma.department.findUnique({ where: { tenantId_name: { tenantId: admin.tenant.id, name: trimmed } } });
  if (existing) return { ok: false, error: `"${trimmed}" already exists.` };
  const created = await prisma.department.create({ data: { tenantId: admin.tenant.id, name: trimmed } });
  revalidatePath("/organization-settings");
  revalidatePath("/analytics-compliance");
  return { ok: true, department: { id: created.id, name: created.name, userCount: 0 } };
}

export async function renameDepartment(id: string, name: string) {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Department name is required." };
  await prisma.department.update({ where: { id }, data: { name: trimmed } });
  revalidatePath("/organization-settings");
  revalidatePath("/analytics-compliance");
  return { ok: true };
}

export async function deleteDepartment(id: string) {
  await requireAdmin();
  const userCount = await prisma.user.count({ where: { departmentId: id } });
  const courseCount = await prisma.course.count({ where: { departmentId: id } });
  if (userCount > 0 || courseCount > 0) {
    return { ok: false, error: `Can't delete — ${userCount > 0 ? `${userCount} user(s)` : ''}${userCount > 0 && courseCount > 0 ? ' and ' : ''}${courseCount > 0 ? `${courseCount} course(s)` : ''} still assigned.` };
  }
  await prisma.department.delete({ where: { id } });
  revalidatePath("/organization-settings");
  revalidatePath("/analytics-compliance");
  return { ok: true };
}

export async function createInstructor(input: { name: string; title: string }) {
  const admin = await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Instructor name is required." };
  const created = await prisma.instructor.create({ data: { tenantId: admin.tenant.id, name, title: input.title.trim() || null } });
  revalidatePath("/organization-settings");
  revalidatePath("/course-studio");
  return { ok: true, instructor: { id: created.id, name: created.name, title: created.title, courseCount: 0 } };
}

export async function updateInstructor(id: string, input: { name: string; title: string }) {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Instructor name is required." };
  await prisma.instructor.update({ where: { id }, data: { name, title: input.title.trim() || null } });
  revalidatePath("/organization-settings");
  revalidatePath("/course-studio");
  revalidatePath("/course-catalog");
  return { ok: true };
}

export async function deleteInstructor(id: string) {
  await requireAdmin();
  const count = await prisma.course.count({ where: { instructorId: id } });
  if (count > 0) {
    return { ok: false, error: `Can't delete — ${count} course(s) are still assigned to this instructor.` };
  }
  await prisma.instructor.delete({ where: { id } });
  revalidatePath("/organization-settings");
  return { ok: true };
}
