// scripts/test-ops.ts
//
// Pure logic smoke test for lib/ops — no Supabase, no server. Run with:
//   npx tsx scripts/test-ops.ts
//
// The workbook fixture below is SYNTHETIC (made-up IDs and values) shaped
// like the W42/W43 layout described in the Nov 2 brief. It is not company data.

import { parseDuration, formatHours } from "../lib/ops/duration";
import { parseCsv, isFormulaLike, csvCell } from "../lib/ops/csv";
import { parseProductionTab, parseSheetDate } from "../lib/ops/workbook";
import { validateFilePath } from "../lib/ops/naming";
import { forecastOperator, forecastScenario, type ForecastInput } from "../lib/ops/forecast";
import { onboardingProgress, HOUSEHOLD_GUIDE_TEMPLATE } from "../lib/ops/onboarding";
import { uploadAlerts, overviewCards } from "../lib/ops/metrics";
import { normalizePhone } from "../lib/ops/phone";

let failures = 0;
let total = 0;
function check(name: string, actual: unknown, expected: unknown) {
  total++;
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures++;
  console.log(`${pass ? "✅" : "❌"} ${name}${pass ? "" : ` — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
}

/* ------------------------------- durations ------------------------------- */

check("h:mm:ss → seconds", parseDuration("2:33:02"), { ok: true, seconds: 9182 });
check("blank → null (unknown, not zero)", parseDuration("  "), { ok: true, seconds: null });
check("bare number rejected by default", parseDuration("0.106273148").ok, false);
// 0.106273148 of a day = 9182 s = 2.55 h — NOT 0.106 hours.
check("fraction of day → seconds", parseDuration("0.106273148", "fraction_of_day"), { ok: true, seconds: 9182 });
check("formatHours rounds only for display", formatHours(9182), "2.6 h");

/* ---------------------------------- csv ---------------------------------- */

check("quoted fields with commas/newlines", parseCsv('a,"b,c","d\n""e"""\r\n1,2,3'), [["a", "b,c", 'd\n"e"'], ["1", "2", "3"]]);
check("formula-like detection", [isFormulaLike("=SUM(A1)"), isFormulaLike("@x"), isFormulaLike("-5"), isFormulaLike("Kitchen")], [true, true, false, false]);
check("export cell defused", csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");

/* ------------------------------- dates ----------------------------------- */

check("sheet date M/D/YYYY", parseSheetDate("10/26/2026"), "2026-10-26");
check("sheet date with weekday", parseSheetDate("Monday, October 26, 2026"), "2026-10-26");
check("sheet date without year needs default", [parseSheetDate("Oct 27"), parseSheetDate("Oct 27", 2026)], [null, "2026-10-27"]);

/* ------------------------------- workbook -------------------------------- */

const fixture = [
  ",,,,,,,,,,,,,,",
  "Total Commit,9,,Total Submit,0:00:00,,,,,,,,,,",
  ",,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,,",
  ",,,,,,,,,,,,,,",
  ",,,,,,10/26/2026,,,10/27/2026,,,,,",
  "Device ID,State,Operator ID,Operator Name,Operational Status,Equipment Status,Commit,Submitted,Accepted,Commit,Submitted,Accepted,,,",
  "CAM-01,ST,SYN-001,Synthetic One,Active (Uploading),Has camera,3,1:30:00,,2,0:45:00,0:40:00,,,",
  " CAM-02,ST,SYN-002,Synthetic Two,Active (Uploading),Has camera,4,2:00:00,,,,,,,",
  "CAM-01,ST,SYN-003,Household_a6,Inactive,,,,,,0.5,,,,",
  ",,,,,,1,,,,,,,,",
  "CAM-03,ST,SYN-004,Synthetic Four,Active,,,,,,,,,X,",
  "Daily total,,,,,,7,3:30:00,,2,0:00:00,,,,",
].join("\n");

const tab = parseProductionTab(parseCsv(fixture));
if ("error" in tab) {
  check("workbook parses", tab.error, "parsed");
} else {
  check("layout detected (State column → W42/W43)", tab.layout, "w42");
  check("header row found by text", tab.headerRow, 8);
  check("two dated day groups", tab.groups.map((g) => [g.columns, g.date]), [["G–I", "2026-10-26"], ["J–L", "2026-10-27"]]);
  check("operator-day cells kept (blank cells skipped)", tab.cells.map((c) => `${c.operatorId}@${c.date}`), ["SYN-001@2026-10-26", "SYN-001@2026-10-27", "SYN-002@2026-10-26"]);
  check("blank Accepted stays null", tab.cells[0].acceptedSeconds, null);
  check("Accepted recorded when present", tab.cells[1].acceptedSeconds, 2400);
  check("device whitespace trimmed, original kept", [tab.cells[2].deviceId, tab.cells[2].deviceIdOriginal], ["CAM-02", " CAM-02"]);
  check(
    "rejections: bare-number duration, values without operator ID, value outside dated headers",
    tab.rejected.map((r) => r.reason.split(":")[0].split(" — ")[0]),
    ["Submitted", "values without an operator ID", "value outside the dated column headers"],
  );
  check("placeholder name flagged", tab.operators.find((o) => o.operatorId === "SYN-003")?.placeholder, true);
  check("shared device flagged, not rejected", tab.warnings.some((w) => w.includes("CAM-01 is listed for 2 operators")), true);
  check("recomputed submitted = 1:30 + 0:45 + 2:00", tab.recomputed.submittedSeconds, 15300);
  check(
    "printed totals kept and flagged as discrepancies",
    tab.discrepancies.map((d) => d.scope),
    ["Total Submit", "Daily total row 14, 2026-10-27 submitted"],
  );
  check("commit summed as plain numbers (unit unconfirmed)", tab.recomputed.commit, 9);
}

/* -------------------------------- naming --------------------------------- */

const known = new Set(["OP-001"]);
const good = validateFilePath("OP-001/10-23-2026/kitchen/laundry-to-basket-Static-01.mp4", { knownOperators: known });
check("valid path passes", [good.status, good.parsed.task, good.parsed.mode, good.parsed.take], ["valid", "laundry-to-basket", "Static", 1]);
check("cross-room folder", validateFilePath("OP-001/10-23-2026/kitchen+dining_area/clear-table-Movement-03.mp4", { knownOperators: known }).status, "valid");
const fixable = validateFilePath("OP-001\\10-23-2026\\Living Room\\Fold_Towels-static-3.MP4", { knownOperators: known });
check("fixable path → invalid with suggestion", [fixable.status, fixable.suggestion], ["invalid", "OP-001/10-23-2026/living_room/fold-towels-Static-03.mp4"]);
check("unknown operator folder", validateFilePath("OP-999/10-23-2026/kitchen/a-Static-01.mp4", { knownOperators: known }).status, "invalid");
check("bad date folder", validateFilePath("OP-001/2026-10-23/kitchen/a-Static-01.mp4", { knownOperators: known }).issues[0].message.includes("MM-DD-YYYY"), true);
check("filename only → warning, not pass", validateFilePath("wipe-counter-Movement-02.mp4").status, "warning");
check(
  "duplicate path is a possible conflict",
  validateFilePath("OP-001/10-23-2026/kitchen/laundry-to-basket-Static-01.mp4", { knownOperators: known, existingPaths: new Set(["OP-001/10-23-2026/kitchen/laundry-to-basket-Static-01.mp4"]) }).status,
  "warning",
);

/* ------------------------------- forecast -------------------------------- */

const base: ForecastInput = {
  enrollmentId: "e1",
  code: "OP-001",
  collectionStage: "recording",
  activated: true,
  recordedToDateSeconds: 8 * 3600,
  targetSeconds: 10 * 3600,
  dailySeconds: 1.5 * 3600,
  remainingDays: 4,
  acceptanceRate: null,
  assumptionSource: "test",
  horizon: null,
};
// Hand check: capacity 1.5 h × 4 = 6 h; remaining target 10 − 8 = 2 h → forecast 2 h.
const f1 = forecastOperator(base, { includePipeline: false, includePaused: false });
check("forecast capped by remaining target", [f1.capacitySeconds, f1.remainingTargetSeconds, f1.forecastRecordedSeconds], [21600, 7200, 7200]);
check("no acceptance rate → no approved estimate", f1.forecastApprovedSeconds, null);
const f2 = forecastOperator({ ...base, targetSeconds: null, acceptanceRate: 0.5 }, { includePipeline: false, includePaused: false });
check("no target → capacity; rate applied only when supplied", [f2.forecastRecordedSeconds, f2.forecastApprovedSeconds], [21600, 10800]);
check("target already met → 0", forecastOperator({ ...base, recordedToDateSeconds: 12 * 3600 }, { includePipeline: false, includePaused: false }).forecastRecordedSeconds, 0);
check("withdrawn excluded", forecastOperator({ ...base, collectionStage: "withdrawn" }, { includePipeline: true, includePaused: true }).included, false);
check("pipeline only in pipeline scenario", [
  forecastOperator({ ...base, activated: false }, { includePipeline: false, includePaused: false }).included,
  forecastOperator({ ...base, activated: false }, { includePipeline: true, includePaused: false }).included,
], [false, true]);
const sc = forecastScenario([base, { ...base, enrollmentId: "e2", activated: false }], { includePipeline: true, includePaused: false });
check("scenario label discloses unconfirmed operators", sc.label, "Scenario incl. unconfirmed operators");

/* ------------------------------ onboarding ------------------------------- */

const steps = HOUSEHOLD_GUIDE_TEMPLATE.steps;
const onboardingKeys = steps.filter((s) => s.scope === "onboarding").map((s) => s.key);
const allDone = onboardingKeys.map((k) => ({ step_key: k, status: "completed" as const }));
check("all onboarding steps done (session steps excluded)", onboardingProgress(steps, allDone).allRequiredDone, true);
const oneNA = allDone.map((r, i) => (i === 0 ? { ...r, status: "not_applicable" as const, reason: "n/a" } : r));
check("not_applicable shrinks the denominator", onboardingProgress(steps, oneNA).applicable, onboardingKeys.length - 1);
const oneBlocked = allDone.map((r, i) => (i === 1 ? { ...r, status: "blocked" as const, reason: "camera delayed" } : r));
check("blocked step prevents readiness", [onboardingProgress(steps, oneBlocked).allRequiredDone, onboardingProgress(steps, oneBlocked).blocked.length], [false, 1]);
check("no records → not ready", onboardingProgress(steps, []).allRequiredDone, false);

/* -------------------------------- metrics -------------------------------- */

const prod = [
  { source_operator_id: "A", calendar_date: "2026-10-26", commit_quantity: 1, submitted_seconds: 3600, accepted_seconds: null },
  { source_operator_id: "B", calendar_date: "2026-11-01", commit_quantity: 1, submitted_seconds: 1800, accepted_seconds: null },
];
check(
  "upload alerts as of Nov 2 (3/7-day legend)",
  uploadAlerts(prod, ["A", "B", "C"], "2026-11-02").map((a) => a.level),
  ["no_recent_upload", "ok", "never"],
);
const cards = overviewCards({ enrollments: [], production: prod, sessions: [], openIssues: 0, openTasksOverdue: 0, forecastRemainingSeconds: null, forecastIncluded: 0, period: "all dates" });
check("accepted card unknown when no decisions", cards.find((c) => c.key === "accepted")?.value, "Not yet available");
check("submitted card sums workbook cells", cards.find((c) => c.key === "submitted")?.value, "1.5 h");

/* --------------------------------- phone --------------------------------- */

check("US 10-digit normalized", normalizePhone("(555) 010-0000"), "+15550100000");
check("too short stays un-normalized", normalizePhone("12345"), null);

console.log(`\n${total - failures}/${total} passed`);
if (failures > 0) process.exit(1);
