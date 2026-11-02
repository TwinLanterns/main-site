"use client";

import { useActionState } from "react";
import { login } from "../actions";
import { button, input, label } from "../_components/ui";

export default function LoginForm({ from }: { from: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="from" value={from} />
      <label className="block space-y-1">
        <span className={label}>Email</span>
        <input name="email" type="email" autoComplete="username" required className={input} />
      </label>
      <label className="block space-y-1">
        <span className={label}>Password</span>
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${button} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
