import type { TermsAcceptance } from "@/lib/legal";

export type StudentPayload = Partial<TermsAcceptance> & {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  level?: string;
  school?: string;
  gradYear?: string;
  location?: string;
  interests?: string[];
  hours?: string;
  startWeeks?: string;
  setup?: string;
  priorities?: string[];
  built?: string;
  links?: string;
  resume?: string;
};

export type CompanyPayload = Partial<TermsAcceptance> & {
  company?: string;
  website?: string;
  name?: string;
  email?: string;
  stage?: string;
  team?: string;
  fn?: string;
  title?: string;
  outcome?: string;
  setup?: string;
  city?: string;
  commitment?: string;
  pay?: string;
  timeline?: string;
};

export type SubmissionKind = "student" | "company";

export type SubmissionAttachment = {
  name: string;
  data: string;
};

export type StudentSubmission = {
  kind: "student";
  payload: StudentPayload;
  attachment?: SubmissionAttachment | null;
};

export type CompanySubmission = {
  kind: "company";
  payload: CompanyPayload;
  attachment?: SubmissionAttachment | null;
};

export type Submission = StudentSubmission | CompanySubmission;
export type SubmissionPayload = StudentPayload | CompanyPayload;