"use server";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/context";
import { domainVerifyRecordName, verifyDomainOwnership } from "@/lib/dns-verify";

export type BrandingUpdateInput = {
  name: string;
  domain: string;
  primaryColor: string;
  radius: string;
  fontPairing: string;
  themeMode: "LIGHT" | "DARK" | "SYSTEM";
  hideWatermark: boolean;
  customEmailDomain: string;
  ssoEnabled: boolean;
};

export async function updateBranding(input: BrandingUpdateInput) {
  const admin = await requireAdmin();
  const tenant = admin.tenant;
  const nextDomain = input.domain.trim() || null;
  const domainChanged = nextDomain !== tenant.domain;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      name: input.name.trim() || tenant.name,
      domain: nextDomain,
      primaryColor: input.primaryColor,
      radius: input.radius,
      fontPairing: input.fontPairing,
      themeMode: input.themeMode,
      hideWatermark: input.hideWatermark,
      customEmailDomain: input.customEmailDomain.trim() || null,
      ssoEnabled: input.ssoEnabled,
      ...(domainChanged ? { domainVerified: false, domainVerifiedAt: null, domainVerifyToken: null } : {}),
    },
  });

  revalidatePath("/branding-settings");
  revalidatePath("/(dashboard)", "layout");

  return { ok: true };
}

export async function resetBranding() {
  const admin = await requireAdmin();
  await prisma.tenant.update({
    where: { id: admin.tenant.id },
    data: {
      primaryColor: "#2563eb",
      radius: "rounded-lg",
      fontPairing: "Plus Jakarta Sans",
      themeMode: "LIGHT",
      hideWatermark: false,
    },
  });
  revalidatePath("/branding-settings");
  revalidatePath("/(dashboard)", "layout");
  return { ok: true };
}

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/x-icon"]);
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function uploadBrandAsset(kind: "logo" | "favicon", formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided." };
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: `Unsupported file type: ${file.type || "unknown"}.` };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File is larger than 2MB." };
  }

  const admin = await requireAdmin();
  const tenant = admin.tenant;
  const ext = file.name.includes(".") ? file.name.split(".").pop() : file.type.split("/").pop();
  const filename = `${kind}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", tenant.id);
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const publicUrl = `/uploads/${tenant.id}/${filename}?v=${Date.now()}`;
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: kind === "logo" ? { logoUrl: publicUrl } : { faviconUrl: publicUrl },
  });

  revalidatePath("/branding-settings");
  revalidatePath("/(dashboard)", "layout");
  return { ok: true, url: publicUrl };
}

export async function generateDomainVerification() {
  const admin = await requireAdmin();
  const tenant = admin.tenant;
  if (!tenant.domain) {
    return { ok: false, error: "Set a custom domain first." };
  }
  const token = tenant.domainVerifyToken ?? `edustack-verify-${randomBytes(12).toString("hex")}`;
  if (!tenant.domainVerifyToken) {
    await prisma.tenant.update({ where: { id: tenant.id }, data: { domainVerifyToken: token } });
  }
  revalidatePath("/branding-settings");
  return { ok: true, recordName: domainVerifyRecordName(tenant.domain), token };
}

export async function verifyDomain() {
  const admin = await requireAdmin();
  const tenant = admin.tenant;
  if (!tenant.domain || !tenant.domainVerifyToken) {
    return { ok: false, verified: false, reason: "Generate a verification record first." };
  }
  const result = await verifyDomainOwnership(tenant.domain, tenant.domainVerifyToken);
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { domainVerified: result.verified, domainVerifiedAt: result.verified ? new Date() : null },
  });
  revalidatePath("/branding-settings");
  return { ok: true, verified: result.verified, reason: result.reason };
}
