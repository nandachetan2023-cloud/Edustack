"use client";

import { useMemo, useState, useTransition } from "react";
import { initials, relativeTime } from "@/lib/format";
import { nudgeLearner } from "@/app/(dashboard)/analytics-compliance/actions";
import { downloadCsv, toCsv } from "@/lib/csv";

export type RosterRow = {
  enrollmentId: string;
  userName: string;
  userEmail: string;
  departmentName: string;
  courseTitle: string;
  progressPercent: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  lastActiveAt: string | null;
  remindedAt: string | null;
};

function NudgeButton({ enrollmentId, remindedAt }: { enrollmentId: string; remindedAt: string | null }) {
  const [lastReminded, setLastReminded] = useState(remindedAt);
  const [isPending, startTransition] = useTransition();

  function nudge() {
    startTransition(async () => {
      await nudgeLearner(enrollmentId);
      setLastReminded(new Date().toISOString());
    });
  }

  if (lastReminded) {
    const hoursAgo = Math.round((Date.now() - new Date(lastReminded).getTime()) / (1000 * 60 * 60));
    return (
      <span className="h-8 px-2.5 rounded-lg bg-surface-container text-secondary font-label-sm text-label-sm inline-flex items-center gap-1">
        <span className="material-symbols-outlined text-sm">check</span>
        Nudged {hoursAgo < 1 ? "just now" : `${hoursAgo}h ago`}
      </span>
    );
  }

  return (
    <button
      className="h-8 px-2.5 rounded-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error font-label-sm text-label-sm inline-flex items-center gap-1 transition-colors disabled:opacity-60"
      onClick={nudge}
      disabled={isPending}
      type="button"
    >
      <span className="material-symbols-outlined text-sm">send</span> {isPending ? "Sending…" : "Nudge"}
    </button>
  );
}

const STATUS_META: Record<RosterRow["status"], { label: string; icon: string; className: string }> = {
  COMPLETED: { label: "Compliant", icon: "check_circle", className: "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant" },
  IN_PROGRESS: { label: "In Progress", icon: "hourglass_top", className: "bg-surface-container-high text-primary" },
  NOT_STARTED: { label: "Not Started", icon: "radio_button_unchecked", className: "bg-surface-container-high text-secondary" },
  OVERDUE: { label: "Overdue", icon: "warning", className: "bg-error-container text-on-error-container" },
};

const PAGE_SIZE = 8;

export function ComplianceRoster({ rows }: { rows: RosterRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const text = `${r.userName} ${r.userEmail} ${r.courseTitle}`.toLowerCase();
      const matchesQuery = !query || text.includes(query.toLowerCase());
      const matchesStatus = status === "ALL" || r.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [rows, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md sm:p-space-lg flex flex-col gap-space-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Learner Compliance Roster</h3>
          <p className="font-body-sm text-body-sm text-secondary">Individual participant progression, certifications, and compliance audit trail</p>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-secondary text-base">search</span>
            <input
              className="h-9 pl-8 pr-3 bg-surface-container-low rounded-lg font-body-sm text-body-sm text-on-surface placeholder:text-secondary focus:outline-none focus:bg-surface-container w-52 sm:w-64"
              placeholder="Filter employee or email..."
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            className="h-9 px-space-sm bg-surface-container-low rounded-lg font-label-sm text-label-sm text-on-surface border-none focus:outline-none"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Compliant</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="OVERDUE">Overdue</option>
          </select>
          <button
            className="h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold flex items-center gap-1.5 transition-colors"
            onClick={() => {
              const csv = toCsv(
                filtered.map((r) => ({
                  name: r.userName,
                  email: r.userEmail,
                  department: r.departmentName,
                  course: r.courseTitle,
                  progress: `${Math.round(r.progressPercent)}%`,
                  status: STATUS_META[r.status].label,
                  lastActive: relativeTime(r.lastActiveAt ? new Date(r.lastActiveAt) : null),
                })),
                [
                  { key: "name", label: "Employee" },
                  { key: "email", label: "Email" },
                  { key: "department", label: "Department" },
                  { key: "course", label: "Assigned Track" },
                  { key: "progress", label: "Progress" },
                  { key: "status", label: "Status" },
                  { key: "lastActive", label: "Last Active" },
                ],
              );
              downloadCsv(`compliance-roster-${new Date().toISOString().slice(0, 10)}.csv`, csv);
            }}
            type="button"
          >
            <span className="material-symbols-outlined text-sm">file_download</span>
            Export CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-surface-container-low text-secondary font-label-sm text-label-sm">
              <th className="py-3 px-space-md rounded-l-lg">Employee</th>
              <th className="py-3 px-space-sm">Department</th>
              <th className="py-3 px-space-sm">Assigned Mandatory Track</th>
              <th className="py-3 px-space-sm">Progress</th>
              <th className="py-3 px-space-sm">Last Active</th>
              <th className="py-3 px-space-sm">Status</th>
              <th className="py-3 px-space-md rounded-r-lg text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-transparent font-body-sm text-body-sm">
            {pageRows.map((row) => {
              const meta = STATUS_META[row.status];
              return (
                <tr key={row.enrollmentId} className={`transition-colors group ${row.status === "OVERDUE" ? "hover:bg-error-container/20" : "hover:bg-surface-container-low/70"}`}>
                  <td className="py-3 px-space-md">
                    <div className="flex items-center gap-space-sm">
                      <div
                        className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs ${
                          row.status === "OVERDUE" ? "bg-error-container text-on-error-container" : "bg-primary-fixed text-on-primary-fixed"
                        }`}
                      >
                        {initials(row.userName)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface font-semibold">{row.userName}</span>
                        <span className="font-caption text-caption text-secondary">{row.userEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-space-sm font-label-sm text-label-sm text-on-surface-variant">{row.departmentName}</td>
                  <td className="py-3 px-space-sm">
                    <span className="font-medium text-on-surface">{row.courseTitle}</span>
                  </td>
                  <td className="py-3 px-space-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div className={`h-full rounded-full ${row.status === "OVERDUE" ? "bg-error" : row.status === "COMPLETED" ? "bg-tertiary" : "bg-primary"}`} style={{ width: `${row.progressPercent}%` }} />
                      </div>
                      <span className={`font-label-sm text-label-sm font-semibold ${row.status === "OVERDUE" ? "text-error" : row.status === "COMPLETED" ? "text-tertiary" : "text-primary"}`}>
                        {Math.round(row.progressPercent)}%
                      </span>
                    </div>
                  </td>
                  <td className={`py-3 px-space-sm ${row.status === "OVERDUE" ? "text-error font-medium" : "text-secondary"}`}>{relativeTime(row.lastActiveAt ? new Date(row.lastActiveAt) : null)}</td>
                  <td className="py-3 px-space-sm">
                    <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold inline-flex items-center gap-1 ${meta.className}`}>
                      <span className="material-symbols-outlined text-xs">{meta.icon}</span> {meta.label}
                    </span>
                  </td>
                  <td className="py-3 px-space-md text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {row.status === "OVERDUE" ? (
                        <NudgeButton enrollmentId={row.enrollmentId} remindedAt={row.remindedAt} />
                      ) : (
                        <button className="h-8 px-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm inline-flex items-center gap-1" type="button">
                          <span className="material-symbols-outlined text-sm">visibility</span> Transcript
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-secondary">
                  No matching learners.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between pt-space-xs text-secondary font-caption text-caption">
        <span>
          Showing {pageRows.length === 0 ? 0 : clampedPage * PAGE_SIZE + 1}-{clampedPage * PAGE_SIZE + pageRows.length} of {filtered.length} team members
        </span>
        <div className="flex items-center gap-1">
          <button
            className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface disabled:opacity-40"
            disabled={clampedPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            type="button"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <span className="px-2 font-label-sm text-label-sm">
            {clampedPage + 1} / {pageCount}
          </span>
          <button
            className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface disabled:opacity-40"
            disabled={clampedPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            type="button"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
