// scripts/test-partner-eligibility.ts
//
// Pure logic smoke test — no Supabase, no server. Run with:
//   npx tsx scripts/test-partner-eligibility.ts

import { evaluatePartnerEligibility } from "../lib/submissions/partner-eligibility";

type Case = {
  name: string;
  input: Parameters<typeof evaluatePartnerEligibility>[0];
  expectQualified: boolean;
};

const cases: Case[] = [
  {
    name: "iPhone 15 Pro, ack'd, consented → qualifies",
    input: { deviceOs: "ios", deviceModel: "iPhone 15 Pro", filmingAck: true, consent: true },
    expectQualified: true,
  },
  {
    name: "iPhone 16e is explicitly excluded even though it prefix-matches 'iPhone 16'",
    input: { deviceOs: "ios", deviceModel: "iPhone 16e", filmingAck: true, consent: true },
    expectQualified: false,
  },
  {
    name: "Pixel 9 Pro, ack'd, consented → qualifies",
    input: { deviceOs: "android", deviceModel: "Pixel 9 Pro", filmingAck: true, consent: true },
    expectQualified: true,
  },
  {
    name: "Unsupported model (e.g. iPhone 11) → fails",
    input: { deviceOs: "ios", deviceModel: "iPhone 11", filmingAck: true, consent: true },
    expectQualified: false,
  },
  {
    name: "Qualifying device but no filming ack → fails",
    input: { deviceOs: "ios", deviceModel: "iPhone 15 Pro", filmingAck: false, consent: true },
    expectQualified: false,
  },
  {
    name: "Qualifying device but no consent → fails",
    input: { deviceOs: "ios", deviceModel: "iPhone 15 Pro", filmingAck: true, consent: false },
    expectQualified: false,
  },
  {
    name: "No device selected at all → fails",
    input: { deviceOs: "", deviceModel: "", filmingAck: true, consent: true },
    expectQualified: false,
  },
];

let failures = 0;

for (const c of cases) {
  const result = evaluatePartnerEligibility(c.input);
  const pass = result.qualified === c.expectQualified;
  if (!pass) failures++;
  console.log(
    `${pass ? "✅" : "❌"} ${c.name}` +
      (pass ? "" : ` — expected qualified=${c.expectQualified}, got ${result.qualified} (reasons: ${result.reasons.join(", ")})`),
  );
}

console.log(`\n${cases.length - failures}/${cases.length} passed`);
if (failures > 0) process.exit(1);