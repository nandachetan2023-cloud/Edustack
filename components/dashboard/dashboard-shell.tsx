"use client";

import type { ReactNode } from "react";
import { NavProvider, useNav } from "./nav-context";
import { CommandPaletteProvider } from "./command-palette";
import { Sidebar } from "./sidebar";
import { Header, type NotificationItem } from "./header";
import type { Role } from "@prisma/client";

type DashboardShellProps = {
  tenantName: string;
  tenantDomain: string | null;
  seatsUsed: number;
  seatLimit: number;
  userName: string;
  userRole: Role;
  userTitle: string;
  notifications: NotificationItem[];
  children: ReactNode;
};

function ShellBody({
  tenantName,
  tenantDomain,
  seatsUsed,
  seatLimit,
  userName,
  userRole,
  userTitle,
  notifications,
  children,
}: DashboardShellProps) {
  const { isCollapsed } = useNav();
  return (
    <>
      <Sidebar tenantName={tenantName} tenantDomain={tenantDomain} seatsUsed={seatsUsed} seatLimit={seatLimit} />
      <div className={isCollapsed ? "lg:pl-20" : "lg:pl-72"}>
        <Header userName={userName} userRole={userRole} userTitle={userTitle} notifications={notifications} />
        <main className="w-full pt-16 bg-background min-h-screen">{children}</main>
      </div>
    </>
  );
}

export function DashboardShell(props: DashboardShellProps) {
  return (
    <NavProvider>
      <CommandPaletteProvider>
        <ShellBody {...props} />
      </CommandPaletteProvider>
    </NavProvider>
  );
}
