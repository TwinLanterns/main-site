"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Reorder, useDragControls } from "motion/react";
import { isValidEmail } from "@/lib/validation";
import Shape from "./Shapes";

export const ease = [0.22, 1, 0.36, 1] as const;

export function Field({
  label,
  hint,
  required = false,
  group = false,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  required?: boolean;
  /**
   * Set when the children are a set of buttons (Pills, ChoiceCards). A
   * <label> binds to its first labelable descendant, so wrapping a button
   * group in one makes clicking the caption select the first option.
   */
  group?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const captionId = useId();
  const caption = (
    <span id={captionId} className="mb-2 block text-[14px]">
      {label}
      {required && (
        <span aria-hidden className="ml-0.5 text-flame">
          *
        </span>
      )}
    </span>
  );
  const hintEl = hint ? (
    <span className="mt-2 block text-[13px] text-muted">{hint}</span>
  ) : null;

  if (group) {
    return (
      <div
        role="group"
        aria-labelledby={captionId}
        className={`block ${className}`}
      >
        {caption}
        {children}
        {hintEl}
      </div>
    );
  }

  return (
    <label className={`block ${className}`}>
      {caption}
      {children}
      {hintEl}
    </label>
  );
}

const base =
  "w-full rounded-[14px] border border-line bg-white px-4 py-3.5 text-[15px] text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-ink";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${base} ${props.className ?? ""}`} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      rows={4}
      {...props}
      className={`${base} resize-none leading-relaxed ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${base} appearance-none ${props.className ?? ""}`}
    />
  );
}

/* --------------------------- inline OTP email check -------------------------- */

export type VerificationPurpose =
  | "student"
  | "company"
  | "earn_applicant"
  | "earn_ambassador"
  | "earn_gopro"
  | "earn_speech";

const RESEND_COOLDOWN = 30; // seconds — mirrors lib/verification/store.ts

export function EmailVerify({
  email,
  purpose,
  verified,
  onVerified,
}: {
  email: string;
  purpose: VerificationPurpose;
  verified: boolean;
  onVerified: (verified: boolean) => void;
}) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const lastEmail = useRef(email);

  // A verified/sent code only proves ownership of the address it was sent
  // to — if the field changes underneath it, the proof no longer applies.
  useEffect(() => {
    if (email === lastEmail.current) return;
    lastEmail.current = email;
    setSent(false);
    setCode("");
    setError(null);
    if (verified) onVerified(false);
  }, [email, verified, onVerified]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const emailOk = isValidEmail(email);

  async function sendCode() {
    if (!emailOk || sending || cooldown > 0) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok)
        throw new Error(data.error || "Could not send a code");
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code");
    } finally {
      setSending(false);
    }
  }

  async function confirmCode() {
    if (code.trim().length !== 6 || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok)
        throw new Error(data.error || "That code doesn't match");
      onVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code doesn't match");
    } finally {
      setConfirming(false);
    }
  }

  if (verified) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink">
        <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 text-lime" fill="none">
          <path
            d="M2 6.2 4.6 8.8 10 3.4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Email verified
      </p>
    );
  }

  return (
    <div className="mt-2">
      {!sent ? (
        <button
          type="button"
          onClick={sendCode}
          disabled={!emailOk || sending}
          className="text-[13px] text-flame underline underline-offset-4 transition-opacity disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
        >
          {sending ? "Sending…" : "Send a verification code"}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-28 rounded-[12px] border border-line bg-white px-3 py-2.5 text-center text-[15px] tracking-[0.3em] text-ink outline-none transition-colors focus:border-ink"
          />
          <button
            type="button"
            onClick={confirmCode}
            disabled={code.trim().length !== 6 || confirming}
            className="rounded-full bg-ink px-4 py-2.5 text-[13px] text-white transition-colors enabled:hover:bg-flame disabled:opacity-35"
          >
            {confirming ? "Checking…" : "Verify"}
          </button>
          <button
            type="button"
            onClick={sendCode}
            disabled={cooldown > 0 || sending}
            className="text-[13px] text-muted underline underline-offset-4 disabled:cursor-not-allowed disabled:no-underline"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-[13px] text-flame">{error}</p>}
    </div>
  );
}

export function Pills({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: readonly string[];
  value: string | string[];
  onChange: (next: string | string[]) => void;
  multi?: boolean;
}) {
  const selected = (o: string) =>
    multi ? (value as string[]).includes(o) : value === o;

  const toggle = (o: string) => {
    if (!multi) return onChange(o);
    const arr = value as string[];
    onChange(arr.includes(o) ? arr.filter((v) => v !== o) : [...arr, o]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          onClick={() => toggle(o)}
          aria-pressed={selected(o)}
          className={`rounded-full border px-4 py-2.5 text-[14.5px] transition-colors ${
            selected(o)
              ? "border-ink bg-ink text-white"
              : "border-line text-muted hover:border-ink hover:text-ink"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/* ------------------------- big tappable choice cards ------------------------ */

type Choice = {
  label: string;
  kind: "clover" | "hex" | "scallop" | "arch" | "squircle" | "burst";
  color: string;
};

export function ChoiceCards({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: readonly Choice[];
  value: string | string[];
  onChange: (next: string | string[]) => void;
  multi?: boolean;
}) {
  const isOn = (o: string) =>
    multi ? (value as string[]).includes(o) : value === o;

  const toggle = (o: string) => {
    if (!multi) return onChange(o);
    const arr = value as string[];
    onChange(arr.includes(o) ? arr.filter((v) => v !== o) : [...arr, o]);
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((o) => {
        const on = isOn(o.label);
        return (
          <button
            type="button"
            key={o.label}
            onClick={() => toggle(o.label)}
            aria-pressed={on}
            className={`group flex flex-col items-start gap-6 rounded-[22px] border p-5 text-left transition-colors ${
              on
                ? "border-ink bg-ink text-white"
                : "border-line hover:border-ink"
            }`}
          >
            <Shape
              kind={o.kind}
              className={`h-9 w-9 transition-transform duration-500 group-hover:rotate-90 ${on ? "text-white" : o.color}`}
            />
            <span className="text-[15px] leading-snug">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------- slider --------------------------------- */

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
  ticks,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  ticks?: string[];
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <p className="display text-[clamp(2rem,4vw,2.8rem)]">{format(value)}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tl-range mt-5 w-full"
        style={{ backgroundSize: `${pct}% 100%` }}
      />
      {ticks && (
        <div className="mt-3 flex justify-between text-[12.5px] text-muted">
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ drag-to-rank list --------------------------- */

function RankItem({ item, index }: { item: string; index: number }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02 }}
      className="flex cursor-grab items-center gap-4 rounded-[18px] border border-line bg-white px-4 py-4 active:cursor-grabbing"
      onPointerDown={(e) => controls.start(e)}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[12px] text-white">
        {index + 1}
      </span>
      <span className="text-[15.5px]">{item}</span>
      <span className="ml-auto flex flex-col gap-[3px] pr-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-[2px] w-4 rounded-full bg-line" />
        ))}
      </span>
    </Reorder.Item>
  );
}

export function RankList({
  items,
  onChange,
}: {
  items: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={onChange}
      className="space-y-2.5 select-none"
    >
      {items.map((item, i) => (
        <RankItem key={item} item={item} index={i} />
      ))}
    </Reorder.Group>
  );
}

/* --------------------------- drag & drop file zone -------------------------- */

export type Upload = { name: string; size: number; data: string } | null;

// Files are sent base64-encoded in the JSON body (+33%), and Vercel rejects
// request bodies over 4.5 MB — 3 MB leaves room for the rest of the payload.
// Keep in sync with MAX_ATTACHMENT_BYTES in lib/submissions/parse.ts.
const MAX_UPLOAD_BYTES = 3_000_000;

export function DropZone({
  file,
  onFile,
}: {
  file: Upload;
  onFile: (f: Upload) => void;
}) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const take = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) {
      setError("That file is over 3 MB — send it to us by email instead.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      setError(null);
      onFile({ name: f.name, size: f.size, data: result.split(",")[1] ?? "" });
    };
    reader.readAsDataURL(f);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files?.[0]);
        }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed px-6 py-12 text-center transition-colors ${
          over ? "border-ink bg-shell" : "border-line hover:border-ink"
        }`}
      >
        <Shape
          kind={file ? "clover" : "arch"}
          className={`h-10 w-10 ${file ? "text-flame" : "text-line"}`}
        />
        <p className="mt-5 text-[15.5px]">
          {file ? file.name : "Add your résumé"}
        </p>
        <p className="mt-1.5 text-[13.5px] text-muted">
          {file
            ? `${(file.size / 1024).toFixed(0)} KB`
            : "PDF, DOC or an image, up to 3 MB. Optional."}
        </p>
        <input
          ref={input}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
          className="hidden"
          onChange={(e) => take(e.target.files?.[0])}
        />
      </div>
      {error && <p className="mt-3 text-[13.5px] text-flame">{error}</p>}
      {file && (
        <button
          type="button"
          onClick={() => onFile(null)}
          className="mt-3 text-[13.5px] text-muted underline underline-offset-4 hover:text-ink"
        >
          Remove file
        </button>
      )}
    </div>
  );
}

export function StepHeader({
  index,
  total,
  title,
  blurb,
  required = false,
}: {
  index: number;
  total: number;
  title: string;
  blurb: string;
  required?: boolean;
}) {
  return (
    <div>
      <p className="label">
        Step {index + 1} of {total}
      </p>
      <h2 className="display mt-3 text-[clamp(1.8rem,3.4vw,2.5rem)]">
        {title}
        {required && (
          <span aria-hidden className="ml-1 text-flame">
            *
          </span>
        )}
      </h2>
      <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-muted">
        {blurb}
      </p>
    </div>
  );
}

export function StepRail({
  steps,
  current,
  onJump,
}: {
  steps: readonly string[];
  current: number;
  onJump: (i: number) => void;
}) {
  return (
    <ol className="space-y-0.5">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s}>
            <button
              type="button"
              onClick={() => (i <= current ? onJump(i) : undefined)}
              disabled={i > current}
              className={`flex w-full items-center gap-3 py-2 text-left text-[14.5px] transition-colors ${
                active
                  ? "text-ink"
                  : done
                    ? "text-muted hover:text-ink"
                    : "text-muted/50"
              }`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] transition-colors ${
                  done
                    ? "border-ink bg-ink text-white"
                    : active
                      ? "border-ink text-ink"
                      : "border-line"
                }`}
              >
                {done ? (
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                    <path
                      d="M2 6.2 4.6 8.8 10 3.4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              {s}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-0.5 w-full bg-line">
      <div
        className="h-full bg-ink transition-[width] duration-500 ease-out"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

export function NavButtons({
  onBack,
  backDisabled,
  nextLabel,
  nextDisabled,
  loading,
}: {
  onBack: () => void;
  backDisabled: boolean;
  nextLabel: string;
  nextDisabled: boolean;
  loading?: boolean;
}) {
  return (
    <div className="mt-10 flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={backDisabled}
        className="rounded-full border border-line px-5 py-3 text-[14.5px] text-muted transition-colors enabled:hover:border-ink enabled:hover:text-ink disabled:opacity-40"
      >
        Back
      </button>
      <button
        type="submit"
        disabled={nextDisabled || loading}
        className="rounded-full bg-ink px-6 py-3 text-[14.5px] text-white transition-colors enabled:hover:bg-flame disabled:opacity-35"
      >
        {loading ? "Sending…" : nextLabel}
      </button>
    </div>
  );
}

/* ------------------------------ terms acceptance ----------------------------- */

export function TermsAgreement({
  checked,
  onChange,
  className = "",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-ink"
      />
      <span className="text-muted">
        I agree to the{" "}
        <Link
          href="/terms"
          target="_blank"
          className="text-ink underline underline-offset-4"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          target="_blank"
          className="text-ink underline underline-offset-4"
        >
          Privacy Policy
        </Link>
        . I&apos;m 18 or older, or a parent or guardian has given me
        permission.
        <span aria-hidden className="ml-0.5 text-flame">
          *
        </span>
      </span>
    </label>
  );
}
