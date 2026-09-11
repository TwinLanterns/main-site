import type {
  CompanyPayload,
  StudentPayload,
  Submission,
  SubmissionAttachment,
} from "./types";

export type ParseSubmissionResult =
  | { ok: true; data: Submission }
  | { ok: false; status: 400; error: string };

function normalizeAttachment(value: unknown): SubmissionAttachment | null {
  if (!value || typeof value !== "object") return null;

  const { name, data } = value as { name?: unknown; data?: unknown };
  if (typeof name !== "string" || typeof data !== "string") return null;

  return { name, data };
}

export async function parseSubmissionRequest(
  req: Request,
): Promise<ParseSubmissionResult> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }

  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "Missing fields" };
  }

  const { kind, payload, attachment } = body as {
    kind?: unknown;
    payload?: unknown;
    attachment?: unknown;
  };

  if (!kind || !payload || typeof payload !== "object") {
    return { ok: false, status: 400, error: "Missing fields" };
  }

  if (kind !== "student" && kind !== "company") {
    return { ok: false, status: 400, error: "Invalid kind" };
  }

  const normalizedAttachment = normalizeAttachment(attachment);

  if (kind === "student") {
    return {
      ok: true,
      data: {
        kind: "student",
        payload: payload as StudentPayload,
        attachment: normalizedAttachment,
      },
    };
  }

  return {
    ok: true,
    data: {
      kind: "company",
      payload: payload as CompanyPayload,
      attachment: normalizedAttachment,
    },
  };
}