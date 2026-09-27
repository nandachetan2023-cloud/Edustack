"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type NavContextValue = {
  isMobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
};

const NavContext = createContext<NavContextValue | null>(null);
const COLLAPSE_STORAGE_KEY = "edustack.sidebar.collapsed";

export function NavProvider({ children }: { children: ReactNode }) {
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [isCollapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    } catch {
      // localStorage unavailable (private window, etc.) — keep default.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <NavContext.Provider
      value={{
        isMobileNavOpen,
        openMobileNav: () => setMobileNavOpen(true),
        closeMobileNav: () => setMobileNavOpen(false),
        isCollapsed,
        toggleCollapsed,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within a NavProvider");
  return ctx;
}
