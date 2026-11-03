"use client";

// app/ops/_components/ProjectSelect.tsx
//
// Sidebar project switcher. Submits on change so there's no extra "Go"
// click; the button stays for keyboard and no-JS use.

import { useRef } from "react";
import { selectProject } from "../actions";
import { ghostButton, input } from "./ui";

export default function ProjectSelect({ projects, current }: { projects: { id: string; code: string; name: string }[]; current?: string }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={selectProject} className="mt-4 flex gap-2">
      <label className="sr-only" htmlFor="ops-project">
        Project
      </label>
      <select id="ops-project" name="project_id" defaultValue={current} onChange={() => form.current?.requestSubmit()} className={input}>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code} · {p.name}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className={ghostButton}>
          Go
        </button>
      </noscript>
    </form>
  );
}
