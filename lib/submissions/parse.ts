import { parseJsonBody } from "@/lib/http";
import { isValidEmail } from "@/lib/validation";
import { TERMS_REQUIRED_MESSAGE, termsAcceptance } from "@/lib/legal";
import type {
  CompanyPayload,
  StudentPayload,
  Submission,
  SubmissionAttachment,
} from "./types";

export type ParseSubmissionResult =
  | { ok: true; data: Submission }
  | { ok: false; status: 400; error: string };

const SHORT_MAX = 200;
const LONG_MAX = 5000;
const LIST_MAX = 20;

/** Decoded résumé size cap. Mirrors the client cap in components/form.tsx. */
export const MAX_ATTACHMENT_BYTES = 3_000_000;
export const ATTACHMENT_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "png",
  "jpg",
  "jpeg",
  "txt",
] as const;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

class FieldError extends Error {}

// Narrow unknown → trimmed string, enforcing presence/length. Never returns
// non-strings, so arbitrary JSON can't reach the database columns.
function text(
  p: Record<string, unknown>,
  key: string,
  opts: { required?: boolean; min?: number; max?: number } = {},
): string | undefined {
  const { required = false, min = 1, max = SHORT_MAX } = opts;
  const raw = p[key];
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) {
    if (required) throw new FieldError(`Missing ${key}`);
    return undefined;
  }
  if (value.length < min) throw new FieldError(`${key} is too short`);
  if (value.length > max) throw new FieldError(`${key} is too long`);
  return value;
}

function list(p: Record<string, unknown>, key: string): string[] {
  const raw = p[key];
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > LIST_MAX) {
    throw new FieldError(`Invalid ${key}`);
  }
  return raw.map((v) => {
    if (typeof v !== "string" || v.length > SHORT_MAX) {
      throw new FieldError(`Invalid ${key}`);
    }
    return v.trim();
  });
}

function email(p: Record<string, unknown>): string {
  const value = text(p, "email", { required: true });
  if (!value || !isValidEmail(value)) {
    throw new FieldError("Missing or invalid email");
  }
  return value;
}

function parseStudent(p: Record<string, unknown>): StudentPayload {
  const interests = list(p, "interests");
  if (interests.length === 0) throw new FieldError("Missing interests");
  return {
    firstName: text(p, "firstName", { required: true, min: 2 }),
    lastName: text(p, "lastName"),
    email: email(p),
    phone: text(p, "phone", { max: 40 }),
    level: text(p, "level", { required: true }),
    school: text(p, "school", { required: true, min: 2 }),
    gradYear: text(p, "gradYear", { max: 10 }),
    location: text(p, "location"),
    interests,
    hours: text(p, "hours", { max: 40 }),
    startWeeks: text(p, "startWeeks", { max: 40 }),
    setup: text(p, "setup", { required: true }),
    priorities: list(p, "priorities"),
    built: text(p, "built", { required: true, min: 20, max: LONG_MAX }),
    links: text(p, "links", { max: 1000 }),
  };
}

function parseCompany(p: Record<string, unknown>): CompanyPayload {
  return {
    company: text(p, "company", { required: true, min: 2 }),
    website: text(p, "website", { max: 500 }),
    name: text(p, "name", { required: true, min: 2 }),
    email: email(p),
    stage: text(p, "stage", { required: true }),
    team: text(p, "team"),
    fn: text(p, "fn", { required: true }),
    title: text(p, "title", { required: true, min: 2 }),
    outcome: text(p, "outcome", { required: true, min: 20, max: LONG_MAX }),
    setup: text(p, "setup", { required: true }),
    city: text(p, "city"),
    commitment: text(p, "commitment", { required: true }),
    pay: text(p, "pay"),
    timeline: text(p, "timeline", { required: true }),
  };
}

function parseAttachment(value: unknown): SubmissionAttachment | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") throw new FieldError("Invalid attachment");

  const { name, data } = value as { name?: unknown; data?: unknown };
  if (typeof name !== "string" || typeof data !== "string") {
    throw new FieldError("Invalid attachment");
  }

  // Keep only the basename and strip control characters.
  const cleanName = name
    .split(/[\\/]/)
    .pop()!
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, SHORT_MAX);
  const ext = cleanName.split(".").pop()?.toLowerCase() ?? "";
  if (
    !cleanName ||
    !(ATTACHMENT_EXTENSIONS as readonly string[]).includes(ext)
  ) {
    throw new FieldError("Résumé must be a PDF, DOC, DOCX, PNG, JPG or TXT file");
  }

  if (!data || !BASE64_RE.test(data)) {
    throw new FieldError("Invalid attachment");
  }
  const decodedBytes = Math.floor((data.length * 3) / 4);
  if (decodedBytes > MAX_ATTACHMENT_BYTES) {
    throw new FieldError("Résumé is over 3 MB");
  }

  return { name: cleanName, data };
}

export async function parseSubmissionRequest(
  req: Request,
): Promise<ParseSubmissionResult> {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
  const body = parsed.body;

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

  const p = payload as Record<string, unknown>;

  if (p.acceptedTerms !== true) {
    return { ok: false, status: 400, error: TERMS_REQUIRED_MESSAGE };
  }

  try {
    if (kind === "student") {
      const normalizedAttachment = parseAttachment(attachment);
      return {
        ok: true,
        data: {
          kind: "student",
          // Only whitelisted fields are stored; terms stamp is server-side so
          // the timestamp/version can't be forged.
          payload: {
            ...parseStudent(p),
            resume: normalizedAttachment?.name,
            ...termsAcceptance(),
          },
          attachment: normalizedAttachment,
        },
      };
    }

    if (attachment !== undefined && attachment !== null) {
      throw new FieldError("Attachments are only accepted on applications");
    }
    return {
      ok: true,
      data: {
        kind: "company",
        payload: { ...parseCompany(p), ...termsAcceptance() },
        attachment: null,
      },
    };
  } catch (err) {
    if (err instanceof FieldError) {
      return { ok: false, status: 400, error: err.message };
    }
    throw err;
  }
}
