import { NextResponse } from "next/server";
import { parseSubmissionRequest } from "@/lib/submissions/parse";
import {
  saveSubmission,
  SubmissionConfigError,
} from "@/lib/submissions/persistence";
import { sendSubmissionEmails } from "@/lib/email/submission-emails";
import { findDuplicateEmail } from "@/lib/verification/duplicate";
import {
  assertEmailVerified,
  consumeVerification,
  VerificationConfigError,
  VerificationRequiredError,
} from "@/lib/verification/store";

const DUPLICATE_MESSAGE: Record<"student" | "company", string> = {
  student: "You've already applied with this email.",
  company: "You've already sent a brief with this email.",
};

export async function POST(req: Request) {
  const parsed = await parseSubmissionRequest(req);

  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: parsed.status },
    );
  }

  const kind = parsed.data.kind;
  const email = (parsed.data.payload as { email?: string }).email?.trim() ?? "";

  if (email) {
    try {
      if (await findDuplicateEmail(kind, email)) {
        return NextResponse.json(
          { error: DUPLICATE_MESSAGE[kind] },
          { status: 409 },
        );
      }
      await assertEmailVerified(email, kind);
    } catch (err) {
      if (err instanceof VerificationConfigError) {
        return NextResponse.json(
          { error: "Server misconfigured" },
          { status: 500 },
        );
      }
      if (err instanceof VerificationRequiredError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      console.error("verification check failed", err);
      return NextResponse.json({ error: "Save failed" }, { status: 502 });
    }
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

  if (email) {
    try {
      await consumeVerification(email, kind);
    } catch (err) {
      console.error("verification cleanup failed", err);
    }
  }

  try {
    await sendSubmissionEmails(parsed.data);
  } catch (err) {
    // Email is best-effort. The submission is already saved.
    console.error("submission email failed", err);
  }

  return NextResponse.json({ ok: true });
}