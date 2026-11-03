"use client";

// app/ops/_components/ActionForm.tsx
//
// <form> bound to an /ops server action via useActionState. Shows pending,
// the error (announced), a confirmation that it saved (or the action's own
// message), and a one-time secret (a new password) when the action returns
// one. `confirm` asks before submitting, for changes that can't be undone.

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
  confirm,
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
  /** Question to confirm before submitting. */
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && reset) ref.current?.reset();
  }, [state, reset]);

  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
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
      {state?.ok && (
        <div role="status" className="mt-2 space-y-1 text-sm text-emerald-300">
          <p>{state.message ?? "Saved."}</p>
          {state.secret && (
            <code className="block select-all rounded-[12px] border border-dim bg-white px-3 py-2 font-mono text-ink">{state.secret}</code>
          )}
        </div>
      )}
    </form>
  );
}
