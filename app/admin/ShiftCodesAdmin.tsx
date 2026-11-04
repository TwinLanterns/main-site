"use client";

// app/admin/ShiftCodesAdmin.tsx
//
// Access codes for the shift board, inside the Shifts tab: give filmers a
// random code each, email it, see every code, resend or revoke one.

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatShiftCode } from "@/lib/shift-code";

type Row = Record<string, unknown>;

type AddResult = {
  created: number;
  existing: number;
  sent: number;
  failed: { email: string; error: string }[];
  invalid: string[];
};

const input =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";

function when(v: unknown) {
  if (!v) return null;
  return new Date(String(v)).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function summary(r: AddResult, sending: boolean) {
  const parts = [`${r.created} new`];
  if (r.existing) parts.push(`${r.existing} already had a code`);
  if (sending) parts.push(`${r.sent} emailed`);
  return parts.join(" · ");
}

export default function ShiftCodesAdmin({ codes, api = "/api/admin/shifts" }: { codes: Row[]; api?: string }) {
  const router = useRouter();
  const [people, setPeople] = useState("");
  const [sendEmails, setSendEmails] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ text: string; problems: string[] } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function send(method: "POST" | "PATCH" | "DELETE", body: object) {
    const res = await fetch(`${api}/codes`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong");
    return data;
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const r: AddResult = await send("POST", { people, send: sendEmails });
      setResult({
        text: summary(r, sendEmails),
        problems: [
          ...r.failed.map((f) => `Email to ${f.email} failed: ${f.error}`),
          ...r.invalid.map((l) => `Skipped "${l}" — use "Name, email"`),
        ],
      });
      // Leave unreadable lines to fix; failed emails retry from the table.
      setPeople(r.invalid.join("\n"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function act(id: string, method: "PATCH" | "DELETE", confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(id);
    setError(null);
    setResult(null);
    try {
      await send(method, { id });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
    } catch {
      // Clipboard blocked; the code is visible in the table anyway.
    }
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleAdd}
        className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <div>
          <p className="text-sm font-medium text-neutral-900">Access codes</p>
          <p className="text-xs text-neutral-500">
            Filmers need a code to open /shifts. Each person gets their own
            random code; revoking it locks them out straight away.
          </p>
        </div>
        <label className="block text-xs text-neutral-500">
          People — one per line, &ldquo;Name, email&rdquo;
          <textarea
            required
            rows={3}
            value={people}
            onChange={(e) => setPeople(e.target.value)}
            placeholder={"Jane Doe, jane@example.com\nSam Lee, sam@example.com"}
            className={`${input} font-mono`}
          />
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={saving || !people.trim()}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {saving ? "Working…" : sendEmails ? "Create & email codes" : "Create codes"}
          </button>
          <label className="flex items-center gap-2 text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={sendEmails}
              onChange={(e) => setSendEmails(e.target.checked)}
            />
            Email each person their code
          </label>
        </div>
        {result && (
          <div role="status" className="space-y-1 text-xs">
            <p className="text-emerald-700">{result.text}</p>
            {result.problems.map((p) => (
              <p key={p} className="text-red-700">
                {p}
              </p>
            ))}
          </div>
        )}
      </form>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Filmer</th>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Emailed</th>
              <th className="px-3 py-2 font-medium">Last used</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-neutral-500">
                  No codes yet. Add filmers above.
                </td>
              </tr>
            )}
            {codes.map((r) => {
              const id = String(r.id);
              const name = String(r.name ?? "");
              const email = String(r.email ?? "");
              const code = formatShiftCode(String(r.code ?? ""));
              const busy = busyId === id;
              const emailed = when(r.emailed_at);
              return (
                <tr key={id} className="border-b border-neutral-100 align-top last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium text-neutral-900">{name}</p>
                    <a href={`mailto:${email}`} className="text-xs text-neutral-500 hover:underline">
                      {email}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span className="font-mono tracking-wider text-neutral-900">{code}</span>
                    <button
                      onClick={() => copy(id, code)}
                      className="ml-2 text-xs text-neutral-500 hover:text-neutral-900"
                    >
                      {copiedId === id ? "Copied" : "Copy"}
                      <span className="sr-only"> code for {name}</span>
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-600">
                    {emailed ?? <span className="text-amber-700">Not sent</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-600">
                    {when(r.last_used_at) ?? "Never"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button
                      disabled={busy}
                      onClick={() => act(id, "PATCH")}
                      className="mr-3 text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
                    >
                      {busy ? "…" : emailed ? "Resend" : "Send"}
                      <span className="sr-only"> code to {name}</span>
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(id, "DELETE", `Revoke ${name}'s code? They'll lose access to /shifts.`)
                      }
                      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Revoke
                      <span className="sr-only"> {name}&apos;s code</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
