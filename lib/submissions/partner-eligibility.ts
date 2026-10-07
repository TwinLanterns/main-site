// lib/submissions/partner-eligibility.ts
//
// Single source of truth for "does this device/answer set qualify."
// Sourced from 1_Requirements_and_Guidelines_Minute_App.pdf — update this
// file (and only this file) when the qualifying device list changes.

export const PARTNER_DEVICES = {
  ios: [
    "iPhone 12",
    "iPhone 12 Mini",
    "iPhone 12 Pro",
    "iPhone 12 Pro Max",
    "iPhone 13",
    "iPhone 13 Mini",
    "iPhone 13 Pro",
    "iPhone 13 Pro Max",
    "iPhone 14",
    "iPhone 14 Plus",
    "iPhone 14 Pro",
    "iPhone 14 Pro Max",
    "iPhone 15",
    "iPhone 15 Plus",
    "iPhone 15 Pro",
    "iPhone 15 Pro Max",
    "iPhone 16",
    "iPhone 16 Plus",
    "iPhone 16 Pro",
    "iPhone 16 Pro Max",
    "iPhone 17",
    "iPhone 17 Plus",
    "iPhone 17 Pro",
    "iPhone 17 Pro Max",
  ],
  android: [
    "Galaxy S21",
    "Galaxy S21+",
    "Galaxy S21 Ultra",
    "Galaxy S22",
    "Galaxy S22+",
    "Galaxy S22 Ultra",
    "Galaxy S23",
    "Galaxy S23+",
    "Galaxy S23 Ultra",
    "Galaxy S24",
    "Galaxy S24+",
    "Galaxy S24 Ultra",
    "Pixel 6",
    "Pixel 6 Pro",
    "Pixel 7",
    "Pixel 7 Pro",
    "Pixel 8",
    "Pixel 8 Pro",
    "Pixel 9",
    "Pixel 9 Pro",
  ],
} as const;

// Explicitly excluded even though they'd otherwise match a prefix
// (e.g. "iPhone 16e" contains "iPhone 16") — Requirements PDF calls these
// out by name as NOT qualifying.
export const PARTNER_EXCLUDED_MODELS = ["iPhone 16e", "iPhone 17e"];

export type DeviceOs = "ios" | "android";

export function isQualifyingDevice(os: DeviceOs, model: string): boolean {
  if (PARTNER_EXCLUDED_MODELS.includes(model)) return false;
  const list = os === "ios" ? PARTNER_DEVICES.ios : PARTNER_DEVICES.android;
  return (list as readonly string[]).includes(model);
}

// Broad task categories shown as ChoiceCards on the apply step, condensed
// from 2_DoDont... / 4_Commercial_Tasks... into groups rather than the full
// 100+ item list.
export const PARTNER_TASK_CATEGORIES = [
  "Agriculture, farm work & landscaping",
  "Auto service, tire shop & car wash",
  "Active construction site",
  "Commercial cleaning & janitorial",
  "Food & beverage manufacturing",
  "Restaurant & commercial kitchen",
  "Hotel, lodging & event hosting",
  "Carpentry & furniture workshop",
  "Home maintenance & outdoor projects",
  "Trade service calls (plumbing / HVAC / electrical)",
  "Warehouse, distribution & logistics",
  "Manufacturing & fabrication",
  "Retail — back of house",
  "Personal care, grooming & textiles",
  "Organization & storage",
] as const;

export interface PartnerEligibilityInput {
  deviceOs: DeviceOs | "";
  deviceModel: string;
  filmingAck: boolean;
  consent: boolean;
}

export interface PartnerEligibilityResult {
  qualified: boolean;
  reasons: string[]; // empty when qualified
}

const REASONS = {
  NO_DEVICE: "no_device_selected",
  UNSUPPORTED_DEVICE: "unsupported_device",
  NO_FILMING_ACK: "no_filming_ack",
  NO_CONSENT: "no_consent",
} as const;

// GoPro home-collection program — criteria from app/partner/gopro/page.tsx.
export interface PartnerGoproEligibilityInput {
  isAdult: boolean;
  hasCoreAreas: boolean;
  canKeepOthersOut: boolean;
  weeklyHoursOk: boolean;
  consent: boolean;
}

export function evaluatePartnerGoproEligibility(
  input: PartnerGoproEligibilityInput,
): PartnerEligibilityResult {
  const reasons: string[] = [];
  if (!input.isAdult) reasons.push("under_18");
  if (!input.hasCoreAreas) reasons.push("missing_core_areas");
  if (!input.canKeepOthersOut) reasons.push("cannot_keep_others_out_of_frame");
  if (!input.weeklyHoursOk) reasons.push("weekly_hours_not_met");
  if (!input.consent) reasons.push("no_consent");
  return { qualified: reasons.length === 0, reasons };
}

// Speech-conversation program — criteria from app/partner/speech/page.tsx.
export const PARTNER_SPEECH_SEX = ["Male", "Female"] as const;
export const PARTNER_SPEECH_RACE = [
  "African American",
  "Caucasian",
  "Hispanic/Latino",
  "Asian",
] as const;
export const PARTNER_SPEECH_ACCENTS = [
  "Western",
  "Southern",
  "Midland",
  "New England",
  "North Central",
] as const;
export const PARTNER_SPEECH_MIN_AGE = 16;

export interface PartnerSpeechEligibilityInput {
  age: number | null;
  guardianConsent: boolean;
  availabilityOk: boolean;
  consent: boolean;
}

export function evaluatePartnerSpeechEligibility(
  input: PartnerSpeechEligibilityInput,
): PartnerEligibilityResult {
  const reasons: string[] = [];
  if (input.age === null) reasons.push("no_age");
  else if (input.age < PARTNER_SPEECH_MIN_AGE) reasons.push("under_16");
  else if (input.age < 18 && !input.guardianConsent)
    reasons.push("no_guardian_consent");
  if (!input.availabilityOk) reasons.push("availability_not_met");
  if (!input.consent) reasons.push("no_consent");
  return { qualified: reasons.length === 0, reasons };
}

export function evaluatePartnerEligibility(
  input: PartnerEligibilityInput,
): PartnerEligibilityResult {
  const reasons: string[] = [];

  if (!input.deviceOs || !input.deviceModel) {
    reasons.push(REASONS.NO_DEVICE);
  } else if (!isQualifyingDevice(input.deviceOs, input.deviceModel)) {
    reasons.push(REASONS.UNSUPPORTED_DEVICE);
  }

  if (!input.filmingAck) reasons.push(REASONS.NO_FILMING_ACK);
  if (!input.consent) reasons.push(REASONS.NO_CONSENT);

  return { qualified: reasons.length === 0, reasons };
}