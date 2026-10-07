/**
 * Single source of truth for the details that appear in the Privacy Policy
 * and Terms of Service. Update these (and have counsel review the policy
 * text) before relying on them.
 */
export const LEGAL = {
  /** Replace with the registered legal entity name (e.g. "Twin Lanterns, Inc."). */
  entity: "Twin Lanterns",
  brand: "Twin Lanterns",
  email: "hello@twinlanterns.co",
  location: "Los Angeles, California",
  site: "https://twinlanterns.co",
  effectiveDate: "October 7, 2026",
  /** Bumped whenever the text changes in a way users must re-accept. */
  version: "2026-10-07",
} as const;
