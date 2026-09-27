"use client";

import { useMemo, useState } from "react";
import { initials, relativeTime } from "@/lib/format";

export type RegistryRow = {
  enrollmentId: string;
  courseId: string;
  title: string;
  instructorName: string | null;
  progressPercent: number;
  hoursLogged: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  isMandatory: boolean;
  isSaved: boolean;
  lastActiveAt: string | null;
  nextUp: string;
};

type Tab = "in-progress" | "compliance" | "completed" | "saved";

const TABS: { id: Tab; label: string; filter: (r: RegistryRow) => boolean }[] = [
  { id: "in-progress", label: "In Progress", filter: (r) => r.status === "IN_PROGRESS" },
  { id: "compliance", label: "Mandatory Compliance", filter: (r) => r.isMandatory },
  { id: "completed", label: "Completed", filter: (r) => r.status === "COMPLETED" },
  { id: "saved", label: "Saved", filter: (r) => r.isSaved },
];

export function RegistryTabs({ rows }: { rows: RegistryRow[] }) {
  const [activeTab, setActiveTab] = useState<Tab>("in-progress");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, rows.filter(t.filter).length])) as Record<Tab, number>,
    [rows],
  );

  const visibleRows = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab)!;
    return rows
      .filter(tab.filter)
      .filter((r) => r.title.toLowerCase().includes(query.toLowerCase()) || (r.instructorName ?? "").toLowerCase().includes(query.toLowerCase()));
  }, [rows, activeTab, query]);

  return (
    <div className="rounded-xl bg-surface-container-lowest shadow-sm overflow-hidden p-space-md flex flex-col gap-space-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-space-xs">
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-surface-container-low rounded-lg">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`px-3 py-1.5 rounded-md font-label-sm text-label-sm whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm"
                  : "text-secondary hover:text-on-surface"
              }`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label} ({counts[tab.id]})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="relative">
            <input
              className="h-8 pl-7 pr-3 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-lg placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary w-40"
              placeholder="Filter courses..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="material-symbols-outlined absolute left-2 top-2 text-secondary text-sm">filter_list</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col divide-y divide-surface-container-low">
        {visibleRows.length === 0 ? (
          <div className="py-8 text-center font-body-sm text-body-sm text-secondary">No courses match this view yet.</div>
        ) : (
          visibleRows.map((row) => (
            <div
              key={row.enrollmentId}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-low/40 rounded-lg px-2 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0 font-label-sm text-label-sm font-bold">
                  {initials(row.title)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-title-md text-title-md text-on-surface truncate font-semibold">{row.title}</span>
                  <div className="flex items-center gap-2 text-secondary font-caption text-caption truncate">
                    <span>{row.instructorName ?? "Self-paced"}</span>
                    <span>•</span>
                    <span>{row.hoursLogged}h logged</span>
                    <span>•</span>
                    <span className="text-tertiary font-semibold truncate">{row.nextUp}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 sm:self-center self-end">
                <div className="flex flex-col items-end gap-1 w-24">
                  <span className="font-label-sm text-label-sm text-on-surface font-medium">
                    {row.status === "NOT_STARTED" ? "Not started" : `${Math.round(row.progressPercent)}%`}
                  </span>
                  <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                    <div
                      className={`h-full rounded-full ${row.status === "COMPLETED" ? "bg-tertiary" : "bg-primary"}`}
                      style={{ width: `${row.progressPercent}%` }}
                    />
                  </div>
                </div>
                <button className="h-8 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm transition-colors" type="button">
                  {row.status === "COMPLETED" ? "Review" : row.status === "NOT_STARTED" ? "Start" : "Resume"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function lastActiveLabel(iso: string | null) {
  return relativeTime(iso ? new Date(iso) : null);
}
