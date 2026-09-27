"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth-actions";

const DEMO_ACCOUNTS = [
  { label: "Learner", email: "alex.rivera@acme.corp" },
  { label: "Tenant Admin", email: "eleanor.vance@acme.corp" },
];

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await login(email, password);
      if (!result.ok) {
        setError(result.error ?? "Could not sign in.");
        return;
      }
      router.push(result.redirectTo ?? "/my-learning");
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-space-lg">
      <div className="flex flex-col items-center gap-2">
        <div className="h-12 w-12 rounded-lg bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm font-bold">E</div>
        <span className="font-headline-sm text-headline-sm text-on-surface font-bold">EduStack</span>
        <span className="font-body-sm text-body-sm text-secondary">Sign in to Acme Academy</span>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-md">
        {error ? <p className="font-caption text-caption text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p> : null}
        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-label-sm text-on-surface font-semibold">Email</label>
          <input
            className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-label-sm text-label-sm text-on-surface font-semibold">Password</label>
          <input
            className="h-10 px-3 rounded-lg bg-surface-container-low text-on-surface text-body-sm focus:outline-none"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <button
          className="h-10 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md flex items-center justify-center gap-2 disabled:opacity-60"
          onClick={submit}
          disabled={isPending || !email || !password}
          type="button"
        >
          {isPending ? "Signing in…" : "Sign In"}
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-2">
        <span className="font-label-sm text-label-sm text-on-surface font-semibold">Demo accounts (password: demo1234)</span>
        {DEMO_ACCOUNTS.map((acct) => (
          <button
            key={acct.email}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-left transition-colors"
            onClick={() => {
              setEmail(acct.email);
              setPassword("demo1234");
            }}
            type="button"
          >
            <span className="font-caption text-caption text-on-surface">{acct.label}</span>
            <span className="font-mono font-caption text-caption text-secondary">{acct.email}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
