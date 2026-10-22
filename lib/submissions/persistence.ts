import { getSupabaseOrThrow } from "@/lib/supabase-or-throw";
import type { Submission } from "./types";

export class SubmissionConfigError extends Error {
  constructor(message = "Supabase misconfigured") {
    super(message);
    this.name = "SubmissionConfigError";
  }
}

export class SubmissionSaveError extends Error {
  constructor(message = "Save failed") {
    super(message);
    this.name = "SubmissionSaveError";
  }
}

// Thrown when the unique lower(email) index rejects the insert — i.e. a
// concurrent submission with the same email won the race past
// findDuplicateEmail (supabase/unique_emails.sql).
export class SubmissionDuplicateError extends Error {
  constructor(message = "Duplicate submission") {
    super(message);
    this.name = "SubmissionDuplicateError";
  }
}

function toSaveError(error: { code?: string }): Error {
  return error.code === "23505"
    ? new SubmissionDuplicateError()
    : new SubmissionSaveError();
}

export async function saveSubmission(submission: Submission): Promise<void> {
  const supabase = getSupabaseOrThrow(() => new SubmissionConfigError());

  if (submission.kind === "student") {
    const p = submission.payload;

    const { error } = await supabase.from("student_applications").insert({
      first_name: p.firstName ?? "",
      last_name: p.lastName ?? null,
      email: p.email ?? "",
      phone: p.phone ?? null,
      level: p.level ?? null,
      school: p.school ?? null,
      grad_year: p.gradYear ?? null,
      location: p.location ?? null,
      interests: p.interests ?? [],
      hours_per_week: p.hours ?? null,
      start_timing: p.startWeeks ?? null,
      work_setup: p.setup ?? null,
      priorities: p.priorities ?? [],
      built: p.built ?? null,
      links: p.links ?? null,
      resume_name: submission.attachment?.name ?? null,
      resume_data: submission.attachment?.data ?? null,
      raw_payload: submission.payload,
    });

    if (error) {
      console.error("supabase insert error (student_applications)", error);
      throw toSaveError(error);
    }

    return;
  }

  const p = submission.payload;

  const { error } = await supabase.from("company_briefs").insert({
    company: p.company ?? "",
    website: p.website ?? null,
    contact_name: p.name ?? "",
    contact_email: p.email ?? "",
    stage: p.stage ?? null,
    team_size: p.team ?? null,
    function: p.fn ?? null,
    title: p.title ?? null,
    outcome: p.outcome ?? null,
    work_setup: p.setup ?? null,
    city: p.city ?? null,
    commitment: p.commitment ?? null,
    pay: p.pay ?? null,
    timeline: p.timeline ?? null,
    raw_payload: submission.payload,
  });

  if (error) {
    console.error("supabase insert error (company_briefs)", error);
    throw toSaveError(error);
  }
}