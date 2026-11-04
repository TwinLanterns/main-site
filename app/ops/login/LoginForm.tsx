"use client";

import { useActionState } from "react";
import { login } from "../actions";
import { button, ghostButton, input, label } from "../_components/ui";

export default function LoginForm({ from, google, notice }: { from: string; google: boolean; notice?: string }) {
  const [state, action, pending] = useActionState(login, null);
  const googleHref = `/api/ops/auth/google/start${from ? `?from=${encodeURIComponent(from)}` : ""}`;
  return (
    <form action={action} className="space-y-5">
      {notice && !state && (
        <p role="alert" className="text-sm text-red-300">
          {notice}
        </p>
      )}
      {google && (
        <>
          <a href={googleHref} className={`${ghostButton} block w-full py-3 text-center`}>
            Sign in with Google
          </a>
          <p className="text-center text-xs text-muted">or use your password</p>
        </>
      )}
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
      <button type="submit" disabled={pending} className={`${button} w-full py-3`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
