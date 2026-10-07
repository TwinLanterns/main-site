// lib/submissions/partner-types.ts

import type { DeviceOs } from "./partner-eligibility";

export interface PartnerApplicantPayload {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  location?: string;
  referredBy?: string;        // NEW
  referrerCollege?: string;   // NEW
  deviceOs: DeviceOs | "";
  deviceModel: string;
  taskInterests: string[];
  filmingAck: boolean;
  consent: boolean;
  referredByCode: string | null;
}
export interface PartnerGoproPayload {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  location?: string;
  referredBy?: string;
  referrerCollege?: string;
  isAdult: boolean;
  hasCoreAreas: boolean;
  canKeepOthersOut: boolean;
  weeklyHoursOk: boolean;
  consent: boolean;
  referredByCode: string | null;
}
export interface PartnerSpeechPayload {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  referredBy?: string;
  referrerCollege?: string;
  age: number | null;
  sex: string;
  raceEthnicity: string;
  accent: string;
  region?: string;
  firstLanguageEnglish: boolean;
  guardianConsent: boolean;
  availabilityOk: boolean;
  consent: boolean;
  referredByCode: string | null;
}
export interface PartnerAmbassadorPayload {
  name: string;
  email: string;
}

export type PartnerSubmission =
  | { kind: "partner_applicant"; payload: PartnerApplicantPayload }
  | { kind: "partner_gopro"; payload: PartnerGoproPayload }
  | { kind: "partner_speech"; payload: PartnerSpeechPayload }
  | { kind: "partner_ambassador"; payload: PartnerAmbassadorPayload };