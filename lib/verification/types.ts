// lib/verification/types.ts

export type VerificationPurpose =
  | "student"
  | "company"
  | "earn_applicant"
  | "earn_ambassador"
  | "earn_gopro"
  | "earn_speech";

export const VERIFICATION_PURPOSES: readonly VerificationPurpose[] = [
  "student",
  "company",
  "earn_applicant",
  "earn_ambassador",
  "earn_gopro",
  "earn_speech",
];
