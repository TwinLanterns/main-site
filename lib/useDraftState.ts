"use client";

import { useEffect, useState } from "react";
import { readDraft, writeDraft } from "@/lib/draft-storage";

// Shared by app/apply/ApplyFlow.tsx and app/companies/HireFlow.tsx: both
// wizards persist their draft to localStorage on every change and restore
// it on mount, keyed by a per-flow string so drafts never collide.
export function useDraftState<T extends object>(key: string, empty: T) {
  const [data, setData] = useState<T>(empty);
  // Flips true once the mount effect below has attempted a restore. Without
  // it, the save effect fires on the same initial pass — before the restore
  // effect's setData has committed — and writes the still-default `empty`
  // state over whatever draft was already in storage, wiping it. Gating the
  // save on real state (not a ref) means the two are always batched
  // together: `data` can never be observed as stale while `hydrated` is
  // true. Also survives React StrictMode's double-invoked mount effects in
  // dev, since both passes read a still-`false` `hydrated` closure and skip
  // the write until the batched update actually commits.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readDraft<T>(key);
    // localStorage is only readable after mount (SSR hydration safety).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setData({ ...empty, ...saved });
    setHydrated(true);
    // Restore once on mount only — `empty` and `key` are constants per flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeDraft(key, data);
  }, [key, data, hydrated]);

  const set = <K extends keyof T>(field: K, value: T[K]) =>
    setData((d) => ({ ...d, [field]: value }));

  return [data, setData, set] as const;
}
