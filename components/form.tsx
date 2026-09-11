"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import Shape from "./Shapes";

export const ease = [0.22, 1, 0.36, 1] as const;

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[14px]">{label}</span>
      {children}
      {hint ? (
        <span className="mt-2 block text-[13px] text-muted">{hint}</span>
      ) : null}
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
    if (f.size > 4_000_000) {
      setError("That file is over 4 MB — send it to us by email instead.");
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
            : "PDF, DOC or an image. Optional."}
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
}: {
  index: number;
  total: number;
  title: string;
  blurb: string;
}) {
  return (
    <div>
      <p className="label">
        Step {index + 1} of {total}
      </p>
      <h2 className="display mt-3 text-[clamp(1.8rem,3.4vw,2.5rem)]">
        {title}
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
