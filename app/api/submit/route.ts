import { NextResponse } from "next/server";
import { parseSubmissionRequest } from "@/lib/submissions/parse";
import {
  saveSubmission,
  SubmissionConfigError,
} from "@/lib/submissions/persistence";
import { sendSubmissionEmails } from "@/lib/email/submission-emails";

export async function POST(req: Request) {
  const parsed = await parseSubmissionRequest(req);

  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: parsed.status },
    );
  }

  try {
    await saveSubmission(parsed.data);
  } catch (err) {
    console.error("submission save failed", err);

    const status = err instanceof SubmissionConfigError ? 500 : 502;

    return NextResponse.json(
      { error: status === 500 ? "Server misconfigured" : "Save failed" },
      { status },
    );
  }

  try {
    await sendSubmissionEmails(parsed.data);
  } catch (err) {
    // Email is best-effort. The submission is already saved.
    console.error("submission email failed", err);
  }

  return NextResponse.json({ ok: true });
}