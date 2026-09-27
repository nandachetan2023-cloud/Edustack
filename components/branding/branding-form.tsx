"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { initials } from "@/lib/format";
import { contrastRatio, wcagLevel } from "@/lib/wcag";
import {
  updateBranding,
  resetBranding,
  uploadBrandAsset,
  generateDomainVerification,
  verifyDomain,
  type BrandingUpdateInput,
} from "@/app/(dashboard)/branding-settings/actions";

const COLOR_SWATCHES = [
  { hex: "#2563eb", name: "Blue" },
  { hex: "#4f46e5", name: "Indigo" },
  { hex: "#0d9488", name: "Teal" },
  { hex: "#e11d48", name: "Rose" },
];

const RADIUS_OPTIONS: { value: string; label: string; className: string }[] = [
  { value: "rounded-none", label: "Sharp", className: "rounded-none" },
  { value: "rounded-lg", label: "Subtle (Std)", className: "rounded-lg" },
  { value: "rounded-full", label: "Pill", className: "rounded-full" },
];

const FONT_OPTIONS = [
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans", desc: "Geometric • Modern Corporate Clarity" },
  { value: "Inter UI", label: "Inter UI", desc: "High Density • Academic Tabular Focus" },
  { value: "Space Grotesk & Sans", label: "Space Grotesk & Sans", desc: "Tech • Expressive Engineering Vibe" },
];

type BrandingFormProps = {
  initial: {
    name: string;
    domain: string;
    primaryColor: string;
    radius: string;
    fontPairing: string;
    themeMode: "LIGHT" | "DARK" | "SYSTEM";
    hideWatermark: boolean;
    customEmailDomain: string;
    ssoEnabled: boolean;
    ssoProvider: string | null;
    seatsUsed: number;
    logoUrl: string | null;
    faviconUrl: string | null;
    domainVerified: boolean;
    domainVerifiedAt: string | null;
    domainVerifyToken: string | null;
  };
};

export function BrandingForm({ initial }: BrandingFormProps) {
  const [name, setName] = useState(initial.name);
  const [domain, setDomain] = useState(initial.domain);
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [radius, setRadius] = useState(initial.radius);
  const [fontPairing, setFontPairing] = useState(initial.fontPairing);
  const [themeMode, setThemeMode] = useState(initial.themeMode);
  const [hideWatermark, setHideWatermark] = useState(initial.hideWatermark);
  const [customEmailEnabled, setCustomEmailEnabled] = useState(Boolean(initial.customEmailDomain));
  const [ssoEnabled, setSsoEnabled] = useState(initial.ssoEnabled);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [isPending, startTransition] = useTransition();

  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [faviconUrl, setFaviconUrl] = useState(initial.faviconUrl);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [domainVerified, setDomainVerified] = useState(initial.domainVerified);
  const [domainVerifiedAt, setDomainVerifiedAt] = useState(initial.domainVerifiedAt);
  const [domainVerifyToken, setDomainVerifyToken] = useState(initial.domainVerifyToken);
  const [domainRecordName, setDomainRecordName] = useState<string | null>(
    initial.domainVerifyToken && initial.domain ? `_edustack-verify.${initial.domain}` : null,
  );
  const [domainCheckState, setDomainCheckState] = useState<"idle" | "checking" | "failed">("idle");
  const [domainCheckReason, setDomainCheckReason] = useState<string | null>(null);
  const [domainPending, startDomainTransition] = useTransition();

  const contrastAgainstWhite = useMemo(() => {
    const ratio = contrastRatio(primaryColor, "#ffffff");
    return { ratio, level: wcagLevel(ratio) };
  }, [primaryColor]);

  async function handleAssetUpload(kind: "logo" | "favicon", file: File) {
    setUploadError(null);
    const setUploading = kind === "logo" ? setLogoUploading : setFaviconUploading;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadBrandAsset(kind, formData);
    setUploading(false);
    if (!result.ok) {
      setUploadError(result.error ?? "Upload failed.");
      return;
    }
    if (kind === "logo") setLogoUrl(result.url ?? null);
    else setFaviconUrl(result.url ?? null);
  }

  function generateRecord() {
    startDomainTransition(async () => {
      const result = await generateDomainVerification();
      if (result.ok) {
        setDomainVerifyToken(result.token ?? null);
        setDomainRecordName(result.recordName ?? null);
        setDomainCheckState("idle");
        setDomainCheckReason(null);
      } else {
        setDomainCheckReason(result.error ?? "Could not generate a verification record.");
      }
    });
  }

  function runDomainCheck() {
    setDomainCheckState("checking");
    startDomainTransition(async () => {
      const result = await verifyDomain();
      if (result.verified) {
        setDomainVerified(true);
        setDomainVerifiedAt(new Date().toISOString());
        setDomainCheckState("idle");
        setDomainCheckReason(null);
      } else {
        setDomainVerified(false);
        setDomainCheckState("failed");
        setDomainCheckReason(result.reason ?? "Verification failed.");
      }
    });
  }

  const dirty = useMemo(() => {
    return (
      name !== initial.name ||
      domain !== initial.domain ||
      primaryColor !== initial.primaryColor ||
      radius !== initial.radius ||
      fontPairing !== initial.fontPairing ||
      themeMode !== initial.themeMode ||
      hideWatermark !== initial.hideWatermark ||
      customEmailEnabled !== Boolean(initial.customEmailDomain) ||
      ssoEnabled !== initial.ssoEnabled
    );
  }, [name, domain, primaryColor, radius, fontPairing, themeMode, hideWatermark, customEmailEnabled, ssoEnabled, initial]);

  function discardChanges() {
    setName(initial.name);
    setDomain(initial.domain);
    setPrimaryColor(initial.primaryColor);
    setRadius(initial.radius);
    setFontPairing(initial.fontPairing);
    setThemeMode(initial.themeMode);
    setHideWatermark(initial.hideWatermark);
    setCustomEmailEnabled(Boolean(initial.customEmailDomain));
    setSsoEnabled(initial.ssoEnabled);
  }

  function save() {
    setSaveState("saving");
    const payload: BrandingUpdateInput = {
      name,
      domain,
      primaryColor,
      radius,
      fontPairing,
      themeMode,
      hideWatermark,
      customEmailDomain: customEmailEnabled ? `noreply@${domain || "example.com"}` : "",
      ssoEnabled,
    };
    startTransition(async () => {
      await updateBranding(payload);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2200);
    });
  }

  function reset() {
    startTransition(async () => {
      await resetBranding();
      setPrimaryColor("#2563eb");
      setRadius("rounded-lg");
      setFontPairing("Plus Jakarta Sans");
      setThemeMode("LIGHT");
      setHideWatermark(false);
    });
  }

  const previewCardRadius = RADIUS_OPTIONS.find((r) => r.value === radius)?.className ?? "rounded-lg";

  return (
    <>
      <div className="w-full px-gutter-sm sm:px-gutter-lg py-space-md bg-surface-container-lowest shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-headline-md text-headline-md text-on-surface tracking-tight">White-Label Branding Suite</span>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">{domain || "no domain set"}</span>
          </div>
          <p className="font-body-sm text-body-sm text-secondary mt-0.5">Customize your academy look, theme tokens, and enterprise authentication — saved to the database.</p>
        </div>
        <div className="flex items-center gap-space-sm shrink-0 flex-wrap">
          <button className="h-10 px-4 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container font-label-md text-label-md transition-colors disabled:opacity-50" onClick={discardChanges} disabled={!dirty} type="button">
            Discard Changes
          </button>
          <button
            className="h-10 px-5 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md flex items-center gap-2 shadow-sm transition-colors disabled:opacity-60"
            onClick={save}
            disabled={isPending}
            type="button"
          >
            <span className="material-symbols-outlined text-lg">{saveState === "saved" ? "check_circle" : saveState === "saving" ? "sync" : "cloud_done"}</span>
            {saveState === "saved" ? "Saved to Database" : saveState === "saving" ? "Saving..." : "Save & Publish Changes"}
          </button>
        </div>
      </div>

      <div className="w-full px-gutter-sm sm:px-gutter-lg py-space-lg grid grid-cols-1 xl:grid-cols-12 gap-gutter-lg items-start">
        <div className="xl:col-span-7 flex flex-col gap-space-lg">
          {/* Brand Identity */}
          <section className="p-space-md sm:p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center gap-2.5 pb-2">
              <div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">domain</span>
              </div>
              <div>
                <h2 className="font-title-md text-title-md text-on-surface">Brand Identity &amp; Domain Routing</h2>
                <p className="font-caption text-caption text-secondary">Establish institutional naming and CDN routing.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-2">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between">
                  Tenant Academy Name
                </label>
                <input
                  className="h-10 px-3.5 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest shadow-sm transition-all"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between">
                  Custom White-Label Domain
                  {domainVerified && domain === initial.domain ? (
                    <span className="text-tertiary font-label-sm text-label-sm font-semibold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">verified</span> DNS Verified
                    </span>
                  ) : (
                    <span className="text-secondary font-label-sm text-label-sm font-semibold">Unverified</span>
                  )}
                </label>
                <input
                  className="w-full h-10 px-3.5 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest shadow-sm transition-all"
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="academy.yourcompany.com"
                />
              </div>
            </div>

            {domain ? (
              <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2.5">
                {dirty ? (
                  <p className="font-caption text-caption text-secondary">Save your changes above before verifying this domain.</p>
                ) : domainVerified && domain === initial.domain ? (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary text-base">check_circle</span>
                    <span className="font-body-sm text-body-sm text-on-surface">
                      Ownership verified{domainVerifiedAt ? ` on ${new Date(domainVerifiedAt).toLocaleDateString("en-US")}` : ""} via real DNS TXT lookup.
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-body-sm text-body-sm text-secondary">
                        Prove ownership with a real DNS TXT record — actually checked via a live lookup, not simulated.
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-sm text-label-sm font-semibold transition-colors disabled:opacity-50"
                          onClick={generateRecord}
                          disabled={domainPending}
                          type="button"
                        >
                          {domainVerifyToken ? "Regenerate Record" : "Generate Verification Record"}
                        </button>
                        {domainVerifyToken ? (
                          <button
                            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-sm text-label-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1"
                            onClick={runDomainCheck}
                            disabled={domainPending}
                            type="button"
                          >
                            {domainCheckState === "checking" ? "Checking DNS…" : "Verify Now"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {domainVerifyToken && domainRecordName ? (
                      <div className="p-2.5 rounded-lg bg-surface-container-lowest flex flex-col gap-1.5 font-mono text-caption text-caption">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-secondary">TXT record name:</span>
                          <span className="text-on-surface truncate">{domainRecordName}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-secondary">Value:</span>
                          <span className="text-on-surface truncate">{domainVerifyToken}</span>
                        </div>
                      </div>
                    ) : null}
                    {domainCheckState === "failed" && domainCheckReason ? (
                      <p className="font-caption text-caption text-error">{domainCheckReason}</p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </section>

          {/* Brand Assets */}
          <section className="p-space-md sm:p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center gap-2.5 pb-2">
              <div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">image</span>
              </div>
              <div>
                <h2 className="font-title-md text-title-md text-on-surface">Brand Assets</h2>
                <p className="font-caption text-caption text-secondary">Upload your logo and favicon — stored and served from this app.</p>
              </div>
            </div>
            {uploadError ? <p className="font-caption text-caption text-error">{uploadError}</p> : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-3">
                <span className="font-label-sm text-label-sm text-on-surface font-semibold uppercase tracking-wider">Primary Logo</span>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-surface-container-lowest p-2 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Tenant logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="material-symbols-outlined text-2xl text-secondary">image</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-caption text-caption text-secondary">PNG, JPEG, WEBP, or SVG • Max 2MB</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        ref={logoInputRef}
                        className="hidden"
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleAssetUpload("logo", file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        className="px-2.5 py-1 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-caption text-caption font-semibold transition-colors disabled:opacity-50"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        type="button"
                      >
                        {logoUploading ? "Uploading…" : logoUrl ? "Replace" : "Upload"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-3">
                <span className="font-label-sm text-label-sm text-on-surface font-semibold uppercase tracking-wider">Favicon</span>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-surface-container-lowest p-2 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
                    {faviconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={faviconUrl} alt="Tenant favicon" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="material-symbols-outlined text-2xl text-secondary">image</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-caption text-caption text-secondary">PNG or ICO, 32×32 recommended • Max 2MB</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        ref={faviconInputRef}
                        className="hidden"
                        type="file"
                        accept="image/png,image/x-icon,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleAssetUpload("favicon", file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        className="px-2.5 py-1 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-caption text-caption font-semibold transition-colors disabled:opacity-50"
                        onClick={() => faviconInputRef.current?.click()}
                        disabled={faviconUploading}
                        type="button"
                      >
                        {faviconUploading ? "Uploading…" : faviconUrl ? "Replace" : "Upload"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Theme & Colors */}
          <section className="p-space-md sm:p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center gap-2.5 pb-2">
              <div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">palette</span>
              </div>
              <div>
                <h2 className="font-title-md text-title-md text-on-surface">Design System &amp; Brand Tokens</h2>
                <p className="font-caption text-caption text-secondary">Configure accent color, typography, and geometry.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="font-label-md text-label-md text-on-surface font-semibold">Primary Brand Accent</label>
                <span
                  className={`px-2.5 py-1 rounded-full font-caption text-caption flex items-center gap-1 font-semibold ${
                    contrastAgainstWhite.level === "FAIL"
                      ? "bg-error-container text-on-error-container"
                      : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                  }`}
                  title="Contrast of this color against white button text"
                >
                  <span className="material-symbols-outlined text-xs">contrast</span>
                  {contrastAgainstWhite.level === "FAIL" ? "Fails WCAG" : `WCAG ${contrastAgainstWhite.level}`} · {contrastAgainstWhite.ratio.toFixed(2)}:1
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-space-sm items-center">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    className={`p-2 rounded-lg bg-surface-container-low flex items-center gap-2 text-left transition-colors ${
                      primaryColor.toLowerCase() === swatch.hex ? "ring-2 ring-primary" : "hover:bg-surface-container"
                    }`}
                    onClick={() => setPrimaryColor(swatch.hex)}
                    type="button"
                  >
                    <div className="w-6 h-6 rounded-full shadow-sm shrink-0 flex items-center justify-center text-white" style={{ backgroundColor: swatch.hex }}>
                      {primaryColor.toLowerCase() === swatch.hex ? <span className="material-symbols-outlined text-sm">check</span> : null}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface font-semibold truncate">{swatch.name}</span>
                      <span className="font-caption text-caption text-secondary font-mono">{swatch.hex.toUpperCase()}</span>
                    </div>
                  </button>
                ))}
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container-low">
                  <div className="w-6 h-6 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: primaryColor }} />
                  <input
                    className="w-full bg-transparent font-mono text-body-sm font-semibold text-on-surface focus:outline-none uppercase"
                    type="text"
                    value={primaryColor.toUpperCase()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-F]{0,6}$/i.test(val)) setPrimaryColor(val);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-2">
              <div className="flex flex-col gap-2">
                <label className="font-label-md text-label-md text-on-surface font-semibold">Tenant Typography Pairing</label>
                <div className="flex flex-col gap-2">
                  {FONT_OPTIONS.map((font) => (
                    <label key={font.value} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors">
                      <div className="flex items-center gap-2.5">
                        <input
                          className="accent-primary w-4 h-4"
                          type="radio"
                          name="font_pair"
                          checked={fontPairing === font.value}
                          onChange={() => setFontPairing(font.value)}
                        />
                        <div className="flex flex-col">
                          <span className="font-label-md text-label-md text-on-surface font-semibold">{font.label}</span>
                          <span className="font-caption text-caption text-secondary">{font.desc}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-label-md text-label-md text-on-surface font-semibold">Component Geometry &amp; Radius</label>
                <div className="grid grid-cols-3 gap-2">
                  {RADIUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`p-3 rounded-lg bg-surface-container-low flex flex-col items-center gap-2 transition-colors ${
                        radius === opt.value ? "ring-2 ring-primary" : "hover:bg-surface-container"
                      }`}
                      onClick={() => setRadius(opt.value)}
                      type="button"
                    >
                      <div className={`w-8 h-8 ${opt.className} bg-primary-container text-on-primary-container flex items-center justify-center font-caption text-caption font-bold`} />
                      <span className="font-label-sm text-label-sm text-on-surface font-semibold">{opt.label}</span>
                    </button>
                  ))}
                </div>
                <label className="font-label-md text-label-md text-on-surface font-semibold mt-3">Default Campus Theme Mode</label>
                <div className="p-1 rounded-xl bg-surface-container-low grid grid-cols-3 gap-1">
                  {(["LIGHT", "DARK", "SYSTEM"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={`py-2 rounded-lg font-label-sm text-label-sm flex items-center justify-center gap-1.5 transition-colors ${
                        themeMode === mode ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold" : "text-secondary hover:text-on-surface font-medium"
                      }`}
                      onClick={() => setThemeMode(mode)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {mode === "LIGHT" ? "light_mode" : mode === "DARK" ? "dark_mode" : "settings_system_daydream"}
                      </span>{" "}
                      {mode === "LIGHT" ? "Light" : mode === "DARK" ? "Dark" : "System"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Enterprise controls */}
          <section className="p-space-md sm:p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center gap-2.5 pb-2">
              <div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">shield_lock</span>
              </div>
              <div>
                <h2 className="font-title-md text-title-md text-on-surface">Enterprise White-Label Controls &amp; Auth</h2>
                <p className="font-caption text-caption text-secondary">Eliminate platform branding and manage identity federation.</p>
              </div>
            </div>
            <div className="flex flex-col gap-space-sm pt-2">
              <div className="p-space-md rounded-lg bg-surface-container-low flex items-center justify-between gap-4">
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">Remove EduStack Watermark &amp; Badges</span>
                  <p className="font-body-sm text-body-sm text-secondary">Hides &quot;Powered by EduStack&quot; from the course player, certificates, and login screens.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input className="sr-only peer" type="checkbox" checked={hideWatermark} onChange={(e) => setHideWatermark(e.target.checked)} />
                  <div className="w-11 h-6 bg-secondary-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
              <div className="p-space-md rounded-lg bg-surface-container-low flex items-center justify-between gap-4">
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">Custom Transactional Email Domain</span>
                  <p className="font-body-sm text-body-sm text-secondary">
                    Certificates and invites send from{" "}
                    <code className="bg-surface-container-high px-1 rounded font-mono text-on-surface">noreply@{domain || "yourdomain.com"}</code>.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input className="sr-only peer" type="checkbox" checked={customEmailEnabled} onChange={(e) => setCustomEmailEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-secondary-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
              <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-xl">vpn_key</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">SAML 2.0 / OIDC Single Sign-On</span>
                      <span className={`px-2 py-0.5 rounded font-caption text-caption font-bold ${ssoEnabled ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-surface-container-high text-secondary"}`}>
                        {ssoEnabled ? "Configured" : "Disabled"}
                      </span>
                    </div>
                    <span className="font-caption text-caption text-secondary truncate">
                      {initial.ssoProvider ?? "No identity provider"} • {initial.seatsUsed.toLocaleString("en-US")} Active Users
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input className="sr-only peer" type="checkbox" checked={ssoEnabled} onChange={(e) => setSsoEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-secondary-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT: Live preview */}
        <div className="xl:col-span-5 xl:sticky xl:top-20 flex flex-col gap-space-md">
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">devices</span>
              <span className="font-label-md text-label-md text-on-surface font-semibold">Live Learner Viewport</span>
            </div>
            <div className="p-1 rounded-lg bg-surface-container-low flex items-center gap-1">
              <button
                className={`px-2.5 py-1 rounded font-caption text-caption font-semibold flex items-center gap-1 transition-colors ${viewport === "desktop" ? "bg-surface-container-lowest text-primary shadow-xs" : "text-secondary hover:text-on-surface"}`}
                onClick={() => setViewport("desktop")}
                type="button"
              >
                <span className="material-symbols-outlined text-sm">desktop_windows</span> Desktop
              </button>
              <button
                className={`px-2.5 py-1 rounded font-caption text-caption font-semibold flex items-center gap-1 transition-colors ${viewport === "mobile" ? "bg-surface-container-lowest text-primary shadow-xs" : "text-secondary hover:text-on-surface"}`}
                onClick={() => setViewport("mobile")}
                type="button"
              >
                <span className="material-symbols-outlined text-sm">smartphone</span> Mobile
              </button>
            </div>
          </div>

          <div className={`w-full rounded-2xl bg-[#0b1329] p-3 shadow-xl transition-all duration-300 ${viewport === "mobile" ? "max-w-[390px] mx-auto" : "max-w-full"}`}>
            <div className="flex items-center justify-between pb-2.5 px-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-error" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 text-white/80 font-caption text-caption font-mono truncate">
                <span className="material-symbols-outlined text-xs text-emerald-400">lock</span>
                <span className="truncate">{domain || "your-academy.com"}</span>
              </div>
              <span className="material-symbols-outlined text-sm text-white/40">refresh</span>
            </div>
            <div className="w-full bg-[#f8fafc] rounded-xl overflow-hidden shadow-inner flex flex-col min-h-[480px]">
              <div className="w-full h-14 bg-white px-4 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 ${previewCardRadius} flex items-center justify-center text-white shrink-0 font-bold text-xs overflow-hidden`} style={{ backgroundColor: primaryColor }}>
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials(name || "Academy")
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-title-md text-title-md text-[#0f172a] tracking-tight leading-none truncate">{name || "Your Academy"}</span>
                    <span className="font-caption text-caption text-secondary">Enterprise Cohorts</span>
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center font-caption text-caption font-bold shrink-0">JD</div>
              </div>
              <div className="p-5 text-white flex flex-col gap-2 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #0b1329 100%)` }}>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-caption text-caption uppercase tracking-wider font-semibold w-fit">Fall Cohort</span>
                <h3 className="font-headline-sm text-headline-sm text-white leading-tight">Advanced Distributed Systems Architecture</h3>
                <button className={`h-8 px-3 ${previewCardRadius} bg-white font-label-sm text-label-sm font-bold shadow-sm w-fit`} style={{ color: primaryColor }} type="button">
                  Resume Module 4
                </button>
              </div>
              <div className="p-4 flex flex-col gap-3 flex-1">
                <span className="font-label-md text-label-md text-on-surface font-bold">Curated Learning Tracks</span>
                <div className={`grid ${viewport === "mobile" ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
                  <div className={`p-3 ${previewCardRadius} bg-white shadow-sm flex flex-col justify-between gap-2.5`}>
                    <span className="px-2 py-0.5 rounded bg-surface-container-low font-caption text-caption font-semibold w-fit" style={{ color: primaryColor }}>
                      DevOps
                    </span>
                    <h4 className="font-label-md text-label-md text-on-surface font-semibold">Kubernetes at Enterprise Scale</h4>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full rounded-full w-[68%]" style={{ backgroundColor: primaryColor }} />
                    </div>
                  </div>
                  <div className={`p-3 ${previewCardRadius} bg-white shadow-sm flex flex-col justify-between gap-2.5`}>
                    <span className="px-2 py-0.5 rounded bg-surface-container-low font-caption text-caption font-semibold w-fit" style={{ color: primaryColor }}>
                      Security
                    </span>
                    <h4 className="font-label-md text-label-md text-on-surface font-semibold">Zero-Trust Cloud Governance</h4>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full rounded-full bg-secondary w-0" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="py-2.5 px-4 bg-white shadow-inner flex items-center justify-between font-caption text-caption text-secondary">
                <span>© {new Date().getFullYear()} {name || "Your Academy"}. All rights reserved.</span>
                {!hideWatermark ? <span className="text-outline text-xs">Powered by EduStack Engine</span> : null}
              </div>
            </div>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-secondary text-base shrink-0">code</span>
              <span className="font-mono text-body-sm text-on-surface truncate">
                --tenant-primary: <span className="font-bold" style={{ color: primaryColor }}>{primaryColor.toUpperCase()}</span>;
              </span>
            </div>
            <button
              className="px-3 py-1 rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold transition-colors flex items-center gap-1 shrink-0"
              onClick={() => navigator.clipboard?.writeText(`--tenant-primary: ${primaryColor};`)}
              type="button"
            >
              <span className="material-symbols-outlined text-xs">content_copy</span> Copy CSS Var
            </button>
          </div>

          <div className="flex justify-end">
            <button className="font-label-sm text-label-sm text-secondary hover:text-error transition-colors" onClick={reset} disabled={isPending} type="button">
              Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
