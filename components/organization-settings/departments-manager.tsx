"use client";

import { useState, useTransition } from "react";
import { createDepartment, renameDepartment, deleteDepartment } from "@/app/(dashboard)/organization-settings/actions";

export type DepartmentRow = { id: string; name: string; userCount: number };

export function DepartmentsManager({ initial }: { initial: DepartmentRow[] }) {
  const [rows, setRows] = useState(initial);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createDepartment(newName);
      if (!result.ok || !result.department) {
        setError(result.error ?? "Could not create department.");
        return;
      }
      setRows((prev) => [...prev, result.department!]);
      setNewName("");
    });
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
      <div>
        <span className="font-title-md text-title-md text-on-surface font-bold">Departments</span>
        <p className="font-caption text-caption text-secondary">Feeds the department filters on Analytics and the org directory.</p>
      </div>
      {error ? <p className="font-caption text-caption text-error">{error}</p> : null}
      <div className="flex flex-col divide-y divide-surface-container-low">
        {rows.map((d) => (
          <DepartmentRowItem key={d.id} dept={d} onRenamed={(name) => setRows((prev) => prev.map((r) => (r.id === d.id ? { ...r, name } : r)))} onDeleted={() => setRows((prev) => prev.filter((r) => r.id !== d.id))} />
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-surface-container">
        <input
          className="flex-1 h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none"
          placeholder="New department name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="h-9 px-3 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-sm text-label-sm flex items-center gap-1 disabled:opacity-60" onClick={add} disabled={isPending || !newName.trim()} type="button">
          <span className="material-symbols-outlined text-base">add</span>
          Add
        </button>
      </div>
    </div>
  );
}

function DepartmentRowItem({ dept, onRenamed, onDeleted }: { dept: DepartmentRow; onRenamed: (name: string) => void; onDeleted: () => void }) {
  const [name, setName] = useState(dept.name);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="py-2.5 flex items-center gap-2">
      <input
        className="flex-1 h-8 px-2 rounded bg-transparent hover:bg-surface-container-low focus:bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name !== dept.name && name.trim()) {
            startTransition(async () => {
              const result = await renameDepartment(dept.id, name);
              if (result.ok) onRenamed(name);
              else setError(result.error ?? null);
            });
          }
        }}
      />
      <span className="font-caption text-caption text-secondary shrink-0">{dept.userCount} users</span>
      <button
        className="w-7 h-7 rounded text-secondary hover:bg-error-container hover:text-on-error-container flex items-center justify-center shrink-0 disabled:opacity-40"
        disabled={isPending || dept.userCount > 0}
        title={dept.userCount > 0 ? "Reassign users before deleting" : "Delete department"}
        onClick={() => {
          startTransition(async () => {
            const result = await deleteDepartment(dept.id);
            if (result.ok) onDeleted();
            else setError(result.error ?? null);
          });
        }}
        type="button"
      >
        <span className="material-symbols-outlined text-sm">delete</span>
      </button>
      {error ? <span className="font-caption text-caption text-error">{error}</span> : null}
    </div>
  );
}
