"use client";

import { useState, useTransition } from "react";
import { initials } from "@/lib/format";
import { createInstructor, updateInstructor, deleteInstructor } from "@/app/(dashboard)/organization-settings/actions";

export type InstructorRow = { id: string; name: string; title: string | null; courseCount: number };

export function InstructorsManager({ initial }: { initial: InstructorRow[] }) {
  const [rows, setRows] = useState(initial);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createInstructor({ name, title });
      if (!result.ok || !result.instructor) {
        setError(result.error ?? "Could not create instructor.");
        return;
      }
      setRows((prev) => [...prev, result.instructor!]);
      setName("");
      setTitle("");
    });
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
      <div>
        <span className="font-title-md text-title-md text-on-surface font-bold">Instructors &amp; Authors</span>
        <p className="font-caption text-caption text-secondary">Available for assignment in Course Studio.</p>
      </div>
      {error ? <p className="font-caption text-caption text-error">{error}</p> : null}
      <div className="flex flex-col divide-y divide-surface-container-low">
        {rows.map((i) => (
          <InstructorRowItem
            key={i.id}
            instructor={i}
            onUpdated={(name, title) => setRows((prev) => prev.map((r) => (r.id === i.id ? { ...r, name, title } : r)))}
            onDeleted={() => setRows((prev) => prev.filter((r) => r.id !== i.id))}
          />
        ))}
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-surface-container">
        <input className="flex-1 h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" placeholder="Name..." value={name} onChange={(e) => setName(e.target.value)} />
        <input className="flex-1 h-9 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none" placeholder="Title (optional)..." value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="h-9 px-3 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-sm text-label-sm flex items-center justify-center gap-1 disabled:opacity-60 shrink-0" onClick={add} disabled={isPending || !name.trim()} type="button">
          <span className="material-symbols-outlined text-base">add</span>
          Add
        </button>
      </div>
    </div>
  );
}

function InstructorRowItem({
  instructor,
  onUpdated,
  onDeleted,
}: {
  instructor: InstructorRow;
  onUpdated: (name: string, title: string | null) => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(instructor.name);
  const [title, setTitle] = useState(instructor.title ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    if (name === instructor.name && title === (instructor.title ?? "")) return;
    startTransition(async () => {
      const result = await updateInstructor(instructor.id, { name, title });
      if (result.ok) onUpdated(name, title || null);
      else setError(result.error ?? null);
    });
  }

  return (
    <div className="py-2.5 flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-caption text-caption font-bold shrink-0">{initials(instructor.name)}</div>
      <input className="flex-1 h-8 px-2 rounded bg-transparent hover:bg-surface-container-low focus:bg-surface-container-low text-on-surface font-label-md text-label-md focus:outline-none" value={name} onChange={(e) => setName(e.target.value)} onBlur={save} />
      <input className="flex-1 h-8 px-2 rounded bg-transparent hover:bg-surface-container-low focus:bg-surface-container-low text-secondary font-caption text-caption focus:outline-none" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={save} />
      <span className="font-caption text-caption text-secondary shrink-0">{instructor.courseCount} courses</span>
      <button
        className="w-7 h-7 rounded text-secondary hover:bg-error-container hover:text-on-error-container flex items-center justify-center shrink-0 disabled:opacity-40"
        disabled={isPending || instructor.courseCount > 0}
        title={instructor.courseCount > 0 ? "Unassign courses before deleting" : "Delete instructor"}
        onClick={() => {
          startTransition(async () => {
            const result = await deleteInstructor(instructor.id);
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
