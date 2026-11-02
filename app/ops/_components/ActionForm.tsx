"use client";

// app/ops/_components/ActionForm.tsx
//
// <form> bound to an /ops server action via useActionState. Shows pending,
// the error (announced), the success message, and a one-time secret (a new
// password) when the action returns one.

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionResult } from "@/lib/ops/form";
import { button } from "./ui";

type Action = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;

export default function ActionForm({
  action,
  children,
  submit = "Save",
  className = "",
  submitClassName = button,
  reset = false,
  inline = false,
}: {
  action: Action;
  children?: ReactNode;
  submit?: ReactNode;
  className?: string;
  submitClassName?: string;
  /** Clear the form after a successful submit. */
  reset?: boolean;
  /** Put the button beside the fields instead of below them. */
  inline?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && reset) ref.current?.reset();
  }, [state, reset]);

  return (
    <form ref={ref} action={formAction} className={className}>
      <div className={inline ? "flex flex-wrap items-end gap-2" : "space-y-3"}>
        {children}
        <div className={inline ? "" : "flex items-center gap-3"}>
          <button type="submit" disabled={pending} className={submitClassName}>
            {pending ? "Saving…" : submit}
          </button>
        </div>
      </div>
      {state && !state.ok && (
        <p role="alert" className="mt-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state?.ok && (state.message || state.secret) && (
        <div role="status" className="mt-2 space-y-1 text-sm text-emerald-300">
          {state.message && <p>{state.message}</p>}
          {state.secret && (
            <code className="block select-all rounded border border-neutral-300 bg-neutral-100 px-2 py-1 font-mono text-neutral-900">{state.secret}</code>
          )}
        </div>
      )}
    </form>
  );
}
