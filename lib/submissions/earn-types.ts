// lib/submissions/earn-types.ts

import type { DeviceOs } from "./earn-eligibility";

export interface EarnApplicantPayload {
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
export interface EarnGoproPayload {
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
export interface EarnSpeechPayload {
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
export interface EarnAmbassadorPayload {
  name: string;
  email: string;
}

export type EarnSubmission =
  | { kind: "earn_applicant"; payload: EarnApplicantPayload }
  | { kind: "earn_gopro"; payload: EarnGoproPayload }
  | { kind: "earn_speech"; payload: EarnSpeechPayload }
  | { kind: "earn_ambassador"; payload: EarnAmbassadorPayload };