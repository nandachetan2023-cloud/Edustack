"use client";

import { useState } from "react";
import { useNav } from "./nav-context";
import { useCommandPalette } from "./command-palette";
import { initials } from "@/lib/format";

export type NotificationItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  tone: "error" | "primary" | "tertiary";
};

type HeaderProps = {
  userName: string;
  userRole: string;
  userTitle?: string;
  notifications: NotificationItem[];
};

const TONE_CLASSES: Record<NotificationItem["tone"], string> = {
  error: "bg-error-container text-on-error-container",
  primary: "bg-primary-container text-on-primary-container",
  tertiary: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
};

const SHORTCUTS = [
  { keys: "⌘ / Ctrl + K", desc: "Open global search" },
  { keys: "Esc", desc: "Close any dialog or panel" },
];

export function Header({ userName, userRole, userTitle, notifications }: HeaderProps) {
  const { openMobileNav, isCollapsed } = useNav();
  const { open: openPalette } = useCommandPalette();
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <header className={`fixed top-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-xl z-20 shadow-[0_1px_8px_rgba(0,0,0,0.04)] ${isCollapsed ? "lg:left-20" : "lg:left-72"}`}>
      <div className="h-16 w-full px-space-sm sm:px-space-lg flex items-center justify-between gap-space-sm sm:gap-space-md">
        <div className="flex items-center gap-space-sm min-w-0 flex-1">
          <button
            className="lg:hidden w-9 h-9 shrink-0 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low flex items-center justify-center transition-colors"
            onClick={openMobileNav}
            type="button"
            aria-label="Open menu"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>
          <div className="hidden sm:flex flex-1 max-w-lg">
            <button className="relative flex items-center w-full text-left" onClick={openPalette} type="button">
              <span className="material-symbols-outlined absolute left-3 text-secondary text-lg pointer-events-none">
                search
              </span>
              <span className="w-full h-10 pl-10 pr-16 bg-surface-container-lowest text-secondary font-body-sm text-body-sm rounded-lg flex items-center">
                Search courses, learners, cohorts, or reports...
              </span>
              <kbd className="hidden md:block absolute right-3 px-1.5 py-0.5 rounded bg-surface-container-low text-secondary font-caption text-caption">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-space-xs sm:gap-space-sm shrink-0">
          <button
            className="hidden md:flex h-9 px-space-sm rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container items-center gap-1.5 font-label-md text-label-md transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Invite Learners
          </button>
          <button
            className="md:hidden w-9 h-9 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low flex items-center justify-center transition-colors"
            type="button"
            aria-label="Invite learners"
          >
            <span className="material-symbols-outlined text-xl">person_add</span>
          </button>
          <div className="relative">
            <button
              className="hidden sm:flex w-9 h-9 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low items-center justify-center transition-colors"
              type="button"
              aria-label="Help"
              onClick={() => {
                setHelpOpen((v) => !v);
                setNotifOpen(false);
              }}
            >
              <span className="material-symbols-outlined text-xl">help_outline</span>
            </button>
            {helpOpen ? (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setHelpOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-surface-container-lowest shadow-xl z-30 p-4 flex flex-col gap-3">
                  <span className="font-title-md text-title-md text-on-surface font-bold">Keyboard Shortcuts</span>
                  <div className="flex flex-col gap-2">
                    {SHORTCUTS.map((s) => (
                      <div key={s.keys} className="flex items-center justify-between gap-2">
                        <span className="font-body-sm text-body-sm text-secondary">{s.desc}</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-surface-container-low text-on-surface font-caption text-caption shrink-0">{s.keys}</kbd>
                      </div>
                    ))}
                  </div>
                  <div className="h-px bg-surface-container-high" />
                  <span className="font-body-sm text-body-sm text-secondary">
                    Need more help? Contact <span className="text-primary font-semibold">support@edustack.io</span>
                  </span>
                </div>
              </>
            ) : null}
          </div>
          <div className="relative">
            <button
              className="w-9 h-9 rounded-lg bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low flex items-center justify-center transition-colors"
              type="button"
              aria-label="Notifications"
              onClick={() => {
                setNotifOpen((v) => !v);
                setHelpOpen(false);
              }}
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            {notifications.length > 0 ? <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error rounded-full" /> : null}
            {notifOpen ? (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl bg-surface-container-lowest shadow-xl z-30 p-2 flex flex-col gap-1 max-h-96 overflow-y-auto">
                  <span className="font-title-md text-title-md text-on-surface font-bold px-2 py-1.5">Notifications</span>
                  {notifications.length === 0 ? (
                    <div className="px-2 py-6 text-center font-body-sm text-body-sm text-secondary">You&apos;re all caught up.</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-surface-container-low transition-colors">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TONE_CLASSES[n.tone]}`}>
                          <span className="material-symbols-outlined text-base">{n.icon}</span>
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-label-md text-label-md text-on-surface truncate">{n.title}</span>
                          <span className="font-caption text-caption text-secondary truncate">{n.subtitle}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : null}
          </div>
          <div className="hidden sm:block h-6 w-px bg-surface-container-high mx-space-xs" />
          <div className="flex items-center gap-space-sm pl-space-xs">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-sm text-label-sm font-bold">
              {initials(userName)}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="font-label-sm text-label-sm text-on-surface leading-tight">{userName}</span>
              <span className="font-caption text-caption text-secondary leading-tight">{userTitle ?? userRole}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
