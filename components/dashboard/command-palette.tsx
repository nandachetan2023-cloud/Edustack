"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { globalSearch, type SearchResult } from "@/lib/search";

type PaletteContextValue = { open: () => void };
const PaletteContext = createContext<PaletteContextValue | null>(null);

export function useCommandPalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  return ctx;
}

const TYPE_ICON: Record<SearchResult["type"], string> = {
  course: "auto_stories",
  learner: "person",
  instructor: "school",
};

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
  }, []);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [close]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      globalSearch(query)
        .then(setResults)
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  function go(result: SearchResult) {
    router.push(result.href);
    close();
  }

  return (
    <PaletteContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      {isOpen ? (
        <div className="fixed inset-0 z-[60] bg-inverse-surface/40 backdrop-blur-sm flex items-start justify-center pt-24 p-4" onClick={close}>
          <div
            className="bg-surface-container-lowest w-full max-w-xl rounded-xl shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-surface-container-low shrink-0">
              <span className="material-symbols-outlined text-secondary text-xl">search</span>
              <input
                ref={inputRef}
                className="flex-1 h-full bg-transparent focus:outline-none font-body-md text-body-md text-on-surface placeholder:text-secondary"
                placeholder="Search courses, learners, or instructors..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd className="px-1.5 py-0.5 rounded bg-surface-container-low text-secondary font-caption text-caption">Esc</kbd>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center font-body-sm text-body-sm text-secondary">Searching…</div>
              ) : query.trim().length < 2 ? (
                <div className="p-6 text-center font-body-sm text-body-sm text-secondary">Type at least 2 characters to search the live database.</div>
              ) : results.length === 0 ? (
                <div className="p-6 text-center font-body-sm text-body-sm text-secondary">No matches for &quot;{query}&quot;.</div>
              ) : (
                <div className="flex flex-col py-2">
                  {results.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low text-left transition-colors"
                      onClick={() => go(r)}
                      type="button"
                    >
                      <span className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-lg">{TYPE_ICON[r.type]}</span>
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="font-label-md text-label-md text-on-surface truncate">{r.title}</span>
                        <span className="font-caption text-caption text-secondary truncate">{r.subtitle}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </PaletteContext.Provider>
  );
}
