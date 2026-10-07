import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // These files shuttle untyped JSON (LLM output, Supabase raw_payload
    // blobs, legacy-DB rows) whose shape isn't statically known.
    files: [
      "scripts/**",
      "app/admin/AdminDashboard.tsx",
      "app/api/admin/vibe-search/route.ts",
    ],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
]);

export default eslintConfig;
