"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNav } from "./nav-context";

const MAIN_NAV = [
  { href: "/course-catalog", label: "Course Catalog", icon: "explore" },
  { href: "/my-learning", label: "My Learning", icon: "school" },
  { href: "/analytics-compliance", label: "Analytics & Compliance", icon: "insights" },
  { href: "/branding-settings", label: "White-Label & Branding", icon: "palette" },
];

const ADMIN_NAV = [
  { href: "/user-management", label: "User Management", icon: "manage_accounts" },
  { href: "/course-studio", label: "Course Studio", icon: "edit_note" },
  { href: "/organization-settings", label: "Organization Settings", icon: "corporate_fare" },
  { href: "/api-webhooks", label: "API & Webhooks", icon: "webhook" },
];

type SidebarProps = {
  tenantName: string;
  tenantDomain: string | null;
  seatsUsed: number;
  seatLimit: number;
};

export function Sidebar({ tenantName, tenantDomain, seatsUsed, seatLimit }: SidebarProps) {
  const pathname = usePathname();
  const { isMobileNavOpen, closeMobileNav, isCollapsed, toggleCollapsed } = useNav();
  const seatPercent = Math.min(100, Math.round((seatsUsed / seatLimit) * 100));
  const tenantInitials = tenantName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <>
      {isMobileNavOpen ? (
        <div
          className="fixed inset-0 z-30 bg-inverse-surface/40 backdrop-blur-sm lg:hidden"
          onClick={closeMobileNav}
        />
      ) : null}
      <aside
        className={`fixed left-0 top-0 bottom-0 max-w-[85vw] bg-surface-container-lowest z-40 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-[width,transform] duration-200 ${
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${isCollapsed ? "w-72 lg:w-20" : "w-72"}`}
      >
        <div className="flex flex-col overflow-y-auto overflow-x-hidden">
          <div className={`h-16 px-space-md flex items-center gap-space-sm bg-surface-container-lowest shrink-0 ${isCollapsed ? "lg:justify-center lg:px-0" : "justify-between"}`}>
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="h-8 w-8 rounded-md bg-primary text-on-primary flex items-center justify-center font-title-md text-title-md font-bold shrink-0">
                E
              </div>
              <div className={`flex flex-col overflow-hidden ${isCollapsed ? "lg:hidden" : ""}`}>
                <span className="font-title-md text-title-md text-on-surface tracking-tight truncate leading-tight">
                  EduStack
                </span>
                <span className="font-caption text-caption text-secondary truncate">Enterprise LMS Suite</span>
              </div>
            </div>
            <button
              className={`lg:hidden w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container-low flex items-center justify-center shrink-0 ${isCollapsed ? "lg:hidden" : ""}`}
              onClick={closeMobileNav}
              type="button"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
          <div className={`px-space-md py-space-sm ${isCollapsed ? "lg:px-2" : ""}`}>
            <div className={`p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors ${isCollapsed ? "lg:justify-center lg:p-2" : ""}`}>
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-label-md text-label-md shrink-0">
                  {tenantInitials}
                </div>
                <div className={`flex flex-col min-w-0 ${isCollapsed ? "lg:hidden" : ""}`}>
                  <span className="font-label-md text-label-md text-on-surface truncate">{tenantName}</span>
                  <span className="font-caption text-caption text-secondary truncate">
                    {tenantDomain ?? "no domain set"}
                  </span>
                </div>
              </div>
              <span className={`material-symbols-outlined text-secondary text-base shrink-0 ${isCollapsed ? "lg:hidden" : ""}`}>unfold_more</span>
            </div>
          </div>
          <div className={`px-space-md pt-space-sm ${isCollapsed ? "lg:px-2" : ""}`}>
            <span className={`font-caption text-caption text-secondary uppercase tracking-wider px-space-sm mb-space-xs block ${isCollapsed ? "lg:hidden" : ""}`}>
              Main Workspace
            </span>
            <nav className="flex flex-col gap-1">
              {MAIN_NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileNav}
                    title={isCollapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-space-sm px-space-sm py-2 rounded-xl transition-colors font-label-md text-label-md ${isCollapsed ? "lg:justify-center" : ""} ${
                      active
                        ? "bg-primary-container text-on-primary-container font-semibold"
                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl shrink-0">{item.icon}</span>
                    <span className={isCollapsed ? "lg:hidden" : ""}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className={`px-space-md pt-space-md ${isCollapsed ? "lg:px-2" : ""}`}>
            <span className={`font-caption text-caption text-secondary uppercase tracking-wider px-space-sm mb-space-xs block ${isCollapsed ? "lg:hidden" : ""}`}>
              Administration
            </span>
            <nav className="flex flex-col gap-1">
              {ADMIN_NAV.map((item) => {
                const active = item.href !== "#" && pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeMobileNav}
                    title={isCollapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-space-sm px-space-sm py-2 rounded-xl transition-colors font-label-md text-label-md ${isCollapsed ? "lg:justify-center" : ""} ${
                      active
                        ? "bg-primary-container text-on-primary-container font-semibold"
                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl shrink-0">{item.icon}</span>
                    <span className={isCollapsed ? "lg:hidden" : ""}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
        <div className={`p-space-md flex flex-col gap-space-sm shrink-0 ${isCollapsed ? "lg:px-2" : ""}`}>
          <div className={`p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-2 ${isCollapsed ? "lg:hidden" : ""}`}>
            <div className="flex items-center justify-between font-caption text-caption text-secondary">
              <span className="font-label-sm text-label-sm text-on-surface">Enterprise Tier</span>
              <span>{seatPercent}% Full</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-secondary-container overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: `${seatPercent}%` }} />
            </div>
            <div className="flex items-center justify-between text-secondary font-caption text-caption">
              <span>
                {seatsUsed.toLocaleString("en-US")} / {seatLimit.toLocaleString("en-US")} Seats
              </span>
              <span className="text-tertiary font-semibold">Active</span>
            </div>
          </div>
          <button
            className={`hidden lg:flex items-center gap-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-label-sm text-label-sm py-2 rounded-lg transition-colors ${isCollapsed ? "justify-center" : "px-space-sm"}`}
            onClick={toggleCollapsed}
            type="button"
            title={isCollapsed ? "Expand menu" : "Collapse menu"}
          >
            <span className="material-symbols-outlined text-lg">
              {isCollapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
            </span>
            <span className={isCollapsed ? "hidden" : ""}>Collapse Menu</span>
          </button>
        </div>
      </aside>
    </>
  );
}
