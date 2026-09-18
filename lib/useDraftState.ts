"use client";

import { useEffect, useState } from "react";

// Shared by app/apply/ApplyFlow.tsx and app/companies/HireFlow.tsx: both
// wizards persist their draft to localStorage on every change and restore
// it on mount, keyed by a per-flow string so drafts never collide.
export function useDraftState<T extends object>(key: string, empty: T) {
  const [data, setData] = useState<T>(empty);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setData({ ...empty, ...JSON.parse(raw) });
    } catch {}
    // Restore once on mount only — `empty` and `key` are constants per flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  }, [key, data]);

  const set = <K extends keyof T>(field: K, value: T[K]) =>
    setData((d) => ({ ...d, [field]: value }));

  return [data, setData, set] as const;
}
