import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/context";
import { BrandingForm } from "@/components/branding/branding-form";

export const dynamic = "force-dynamic";

export default async function BrandingSettingsPage() {
  const admin = await requireAdmin();
  const tenant = admin.tenant;
  const seatsUsed = await prisma.user.count({ where: { tenantId: tenant.id } });

  return (
    <div className="flex flex-col w-full">
      <BrandingForm
        initial={{
          name: tenant.name,
          domain: tenant.domain ?? "",
          primaryColor: tenant.primaryColor,
          radius: tenant.radius,
          fontPairing: tenant.fontPairing,
          themeMode: tenant.themeMode,
          hideWatermark: tenant.hideWatermark,
          customEmailDomain: tenant.customEmailDomain ?? "",
          ssoEnabled: tenant.ssoEnabled,
          ssoProvider: tenant.ssoProvider,
          seatsUsed,
          logoUrl: tenant.logoUrl,
          faviconUrl: tenant.faviconUrl,
          domainVerified: tenant.domainVerified,
          domainVerifiedAt: tenant.domainVerifiedAt ? tenant.domainVerifiedAt.toISOString() : null,
          domainVerifyToken: tenant.domainVerifyToken,
        }}
      />
    </div>
  );
}
