// lib/verification/types.ts

export type VerificationPurpose =
  | "student"
  | "company"
  | "partner_applicant"
  | "partner_ambassador"
  | "partner_gopro"
  | "partner_speech";

export const VERIFICATION_PURPOSES: readonly VerificationPurpose[] = [
  "student",
  "company",
  "partner_applicant",
  "partner_ambassador",
  "partner_gopro",
  "partner_speech",
];
