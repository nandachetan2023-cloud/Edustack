"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { initials } from "@/lib/format";
import { downloadCsv, toCsv } from "@/lib/csv";
import { createUser, updateUserRole, toggleUserActive, bulkImportUsers, type BulkImportRow } from "@/app/(dashboard)/user-management/actions";
import type { Role } from "@prisma/client";

export type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string | null;
  departmentName: string | null;
  isActive: boolean;
  createdAt: string;
};

const ROLE_LABEL: Record<Role, string> = {
  LEARNER: "Learner",
  ADMIN: "Tenant Admin",
  SUPER_ADMIN: "Super Admin",
};

const ROLE_BADGE: Record<Role, string> = {
  LEARNER: "bg-surface-container-high text-secondary",
  ADMIN: "bg-primary-fixed text-on-primary-fixed",
  SUPER_ADMIN: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
};

const PAGE_SIZE = 8;

type Tab = "ALL" | "LEARNER" | "STAFF" | "INACTIVE";

export function UserDirectory({ users, departments }: { users: DirectoryUser[]; departments: { id: string; name: string }[] }) {
  const [rows, setRows] = useState(users);
  const [tab, setTab] = useState<Tab>("ALL");
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter((u) => {
      const matchesTab =
        tab === "ALL" ||
        (tab === "LEARNER" && u.role === "LEARNER") ||
        (tab === "STAFF" && u.role !== "LEARNER") ||
        (tab === "INACTIVE" && !u.isActive);
      const matchesQuery = !query || `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase());
      const matchesDept = deptFilter === "ALL" || u.departmentName === deptFilter;
      return matchesTab && matchesQuery && matchesDept;
    });
  }, [rows, tab, query, deptFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  const counts = {
    ALL: rows.length,
    LEARNER: rows.filter((u) => u.role === "LEARNER").length,
    STAFF: rows.filter((u) => u.role !== "LEARNER").length,
    INACTIVE: rows.filter((u) => !u.isActive).length,
  };

  function exportCsv() {
    const csv = toCsv(
      filtered.map((u) => ({
        name: u.name,
        email: u.email,
        role: ROLE_LABEL[u.role],
        department: u.departmentName ?? "",
        status: u.isActive ? "Active" : "Deactivated",
        joined: new Date(u.createdAt).toLocaleDateString("en-US"),
      })),
      [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role" },
        { key: "department", label: "Department" },
        { key: "status", label: "Status" },
        { key: "joined", label: "Joined" },
      ],
    );
    downloadCsv(`org-directory-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md sm:p-space-lg flex flex-col gap-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-surface-container-low rounded-lg">
            {(
              [
                ["ALL", "All Users"],
                ["LEARNER", "Learners"],
                ["STAFF", "Instructors & Admins"],
                ["INACTIVE", "Deactivated"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                className={`px-3 py-1.5 rounded-md font-label-sm text-label-sm whitespace-nowrap transition-all ${
                  tab === id ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm" : "text-secondary hover:text-on-surface"
                }`}
                onClick={() => {
                  setTab(id);
                  setPage(0);
                }}
                type="button"
              >
                {label} ({counts[id]})
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-secondary text-base">search</span>
              <input
                className="h-9 pl-8 pr-3 bg-surface-container-low rounded-lg font-body-sm text-body-sm text-on-surface placeholder:text-secondary focus:outline-none focus:bg-surface-container w-52"
                placeholder="Filter by name or email..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </div>
            <select
              className="h-9 px-space-sm bg-surface-container-low rounded-lg font-label-sm text-label-sm text-on-surface border-none focus:outline-none"
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              className="h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold flex items-center gap-1.5 transition-colors"
              onClick={exportCsv}
              type="button"
            >
              <span className="material-symbols-outlined text-sm">file_download</span>
              Export CSV
            </button>
            <button
              className="h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold flex items-center gap-1.5 transition-colors"
              onClick={() => setImportOpen(true)}
              type="button"
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
              Bulk CSV Import
            </button>
            <button
              className="h-9 px-3 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-sm text-label-sm font-semibold flex items-center gap-1.5 transition-colors"
              onClick={() => setAddOpen(true)}
              type="button"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              Add User
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-surface-container-low text-secondary font-label-sm text-label-sm">
                <th className="py-3 px-space-md rounded-l-lg">User &amp; Identity</th>
                <th className="py-3 px-space-sm">Role</th>
                <th className="py-3 px-space-sm">Department</th>
                <th className="py-3 px-space-sm">Status</th>
                <th className="py-3 px-space-sm">Joined</th>
                <th className="py-3 px-space-md rounded-r-lg text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-transparent font-body-sm text-body-sm">
              {pageRows.map((u) => (
                <UserRowItem
                  key={u.id}
                  user={u}
                  onRoleChange={(role) =>
                    setRows((prev) => prev.map((r) => (r.id === u.id ? { ...r, role } : r)))
                  }
                  onActiveToggle={(isActive) =>
                    setRows((prev) => prev.map((r) => (r.id === u.id ? { ...r, isActive } : r)))
                  }
                />
              ))}
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-secondary">
                    No users match this view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-space-xs text-secondary font-caption text-caption">
          <span>
            Showing {pageRows.length === 0 ? 0 : clampedPage * PAGE_SIZE + 1}-{clampedPage * PAGE_SIZE + pageRows.length} of {filtered.length} users
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

      {addOpen ? (
        <AddUserModal
          departments={departments}
          onClose={() => setAddOpen(false)}
          onCreated={(user) => setRows((prev) => [user, ...prev])}
        />
      ) : null}
      {importOpen ? <BulkImportModal onClose={() => setImportOpen(false)} onImported={() => window.location.reload()} /> : null}
    </div>
  );
}

function UserRowItem({
  user,
  onRoleChange,
  onActiveToggle,
}: {
  user: DirectoryUser;
  onRoleChange: (role: Role) => void;
  onActiveToggle: (isActive: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className={`transition-colors group ${user.isActive ? "hover:bg-surface-container-low/70" : "opacity-60"}`}>
      <td className="py-3 px-space-md">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs bg-primary-fixed text-on-primary-fixed shrink-0">
            {initials(user.name)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-label-md text-label-md text-on-surface font-semibold truncate">{user.name}</span>
            <span className="font-caption text-caption text-secondary truncate">{user.email}</span>
          </div>
        </div>
      </td>
      <td className="py-3 px-space-sm">
        <select
          className={`px-2 py-1 rounded font-label-sm text-label-sm font-semibold border-none focus:outline-none ${ROLE_BADGE[user.role]}`}
          value={user.role}
          disabled={isPending}
          onChange={(e) => {
            const role = e.target.value as Role;
            onRoleChange(role);
            startTransition(async () => {
              await updateUserRole(user.id, role);
            });
          }}
        >
          {Object.entries(ROLE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-3 px-space-sm font-label-sm text-label-sm text-on-surface-variant">{user.departmentName ?? "—"}</td>
      <td className="py-3 px-space-sm">
        <span className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold inline-flex items-center gap-1 ${user.isActive ? "bg-tertiary-fixed/40 text-on-tertiary-fixed-variant" : "bg-surface-container-high text-secondary"}`}>
          <span className="material-symbols-outlined text-xs">{user.isActive ? "check_circle" : "block"}</span>
          {user.isActive ? "Active" : "Deactivated"}
        </span>
      </td>
      <td className="py-3 px-space-sm text-secondary">{new Date(user.createdAt).toLocaleDateString("en-US")}</td>
      <td className="py-3 px-space-md text-right">
        <button
          className="h-8 px-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm inline-flex items-center gap-1 transition-colors disabled:opacity-50"
          disabled={isPending}
          onClick={() => {
            const next = !user.isActive;
            onActiveToggle(next);
            startTransition(async () => {
              await toggleUserActive(user.id);
            });
          }}
          type="button"
        >
          <span className="material-symbols-outlined text-sm">{user.isActive ? "person_off" : "person_check"}</span>
          {user.isActive ? "Deactivate" : "Reactivate"}
        </button>
      </td>
    </tr>
  );
}

function AddUserModal({
  departments,
  onClose,
  onCreated,
}: {
  departments: { id: string; name: string }[];
  onClose: () => void;
  onCreated: (user: DirectoryUser) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("LEARNER");
  const [departmentId, setDepartmentId] = useState<string>(departments[0]?.id ?? "");
  const [jobTitle, setJobTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createUser({ name, email, role, departmentId: departmentId || null, jobTitle });
      if (!result.ok || !result.id) {
        setError(result.error ?? "Could not create user.");
        return;
      }
      onCreated({
        id: result.id,
        name,
        email: email.toLowerCase(),
        role,
        jobTitle: jobTitle || null,
        departmentName: departments.find((d) => d.id === departmentId)?.name ?? null,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-xl p-space-lg flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Add User</h3>
          <button className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-center" onClick={onClose} type="button">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
        {error ? <p className="font-caption text-caption text-error">{error}</p> : null}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface font-semibold">Full Name</label>
            <input className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface font-semibold">Email</label>
            <input className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-label-sm text-on-surface font-semibold">Job Title</label>
            <input className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface font-semibold">Role</label>
              <select className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {Object.entries(ROLE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface font-semibold">Department</label>
              <select className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
          <button className="h-9 px-4 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="h-9 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md disabled:opacity-60"
            onClick={submit}
            disabled={isPending || !name || !email}
            type="button"
          >
            {isPending ? "Creating…" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BulkImportRow[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [isPending, startTransition] = useTransition();

  function parseCsv(text: string): BulkImportRow[] {
    const lines = text.trim().split(/\r?\n/);
    const [header, ...body] = lines;
    const cols = header.split(",").map((c) => c.trim().toLowerCase());
    return body
      .filter((l) => l.trim())
      .map((line) => {
        const cells = line.split(",").map((c) => c.trim());
        const get = (key: string) => cells[cols.indexOf(key)] ?? "";
        const roleRaw = get("role").toUpperCase();
        const role: Role = roleRaw === "ADMIN" || roleRaw === "SUPER_ADMIN" ? (roleRaw as Role) : "LEARNER";
        return { name: get("name"), email: get("email"), role, department: get("department"), jobTitle: get("jobtitle") };
      });
  }

  function handleFile(file: File) {
    file.text().then((text) => setPreview(parseCsv(text)));
  }

  function runImport() {
    startTransition(async () => {
      const res = await bulkImportUsers(preview);
      setResult(res);
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest w-full max-w-lg rounded-xl shadow-xl p-space-lg flex flex-col gap-4 max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Bulk CSV Import</h3>
          <button className="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-center" onClick={onClose} type="button">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
        <p className="font-body-sm text-body-sm text-secondary">
          CSV with columns: <code className="bg-surface-container-high px-1 rounded font-mono">name,email,role,department,jobTitle</code>
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="text-body-sm text-on-surface"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {preview.length > 0 && !result ? (
          <div className="flex flex-col gap-2 overflow-y-auto max-h-64 border border-surface-container-low rounded-lg p-2">
            <span className="font-caption text-caption text-secondary">{preview.length} rows parsed — preview:</span>
            {preview.slice(0, 10).map((r, i) => (
              <div key={i} className="font-caption text-caption text-on-surface">
                {r.name} · {r.email} · {r.role} · {r.department}
              </div>
            ))}
          </div>
        ) : null}
        {result ? (
          <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-1">
            <span className="font-label-md text-label-md text-tertiary font-semibold">Created {result.created}, skipped {result.skipped}</span>
            {result.errors.slice(0, 5).map((e, i) => (
              <span key={i} className="font-caption text-caption text-secondary">
                {e}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
          <button className="h-9 px-4 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md" onClick={onClose} type="button">
            {result ? "Close" : "Cancel"}
          </button>
          {!result ? (
            <button
              className="h-9 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md disabled:opacity-60"
              onClick={runImport}
              disabled={isPending || preview.length === 0}
              type="button"
            >
              {isPending ? "Importing…" : `Import ${preview.length} Users`}
            </button>
          ) : (
            <button className="h-9 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md" onClick={onImported} type="button">
              Refresh Directory
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
