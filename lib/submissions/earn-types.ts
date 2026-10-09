// lib/submissions/earn-types.ts

import type { TermsAcceptance } from "@/lib/legal";

// All three program sign-ups collect the same contact-only payload.
export interface EarnSignupPayload extends TermsAcceptance {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  referredByCode: string | null;
}
export type EarnApplicantPayload = EarnSignupPayload;
export type EarnGoproPayload = EarnSignupPayload;
export type EarnSpeechPayload = EarnSignupPayload;
export interface EarnAmbassadorPayload extends TermsAcceptance {
  name: string;
  email: string;
}

export type EarnSubmission =
  | { kind: "earn_applicant"; payload: EarnApplicantPayload }
  | { kind: "earn_gopro"; payload: EarnGoproPayload }
  | { kind: "earn_speech"; payload: EarnSpeechPayload }
  | { kind: "earn_ambassador"; payload: EarnAmbassadorPayload };