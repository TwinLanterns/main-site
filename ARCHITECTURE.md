# Twin Lanterns — Architecture

> **Student talent, matched by hand.**
>
> Twin Lanterns is a two-sided marketplace that connects high school and college
> students with startups and small companies looking for part-time or intern
> talent. Students apply once, companies submit a role brief, and the two founders
> personally screen and match. The same app also hosts **Partner**, a second,
> parallel product where people film everyday physical tasks for pay to
> produce robotics-AI training data, with its own applicant and ambassador
> (referral) funnels. This repo is the marketing site, all three application
> funnels, and an admin dashboard for reading submissions and running
> AI-assisted candidate search.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [Request Flow](#4-request-flow)
5. [Authentication](#5-authentication)
6. [External Services](#6-external-services)
7. [Environment Variables](#7-environment-variables)
8. [Admin Dashboard](#8-admin-dashboard)
9. [Frontend Design System](#9-frontend-design-system)
10. [Scripts](#10-scripts)
11. [Deployment & SEO](#11-deployment--seo)
12. [Cross-Cutting Conventions](#12-cross-cutting-conventions)

---

## 1. System Overview

```
                        ┌──────────────────────┐
                        │   Vercel (Edge/Node) │
                        └──────────┬───────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
┌──────────────────┐   ┌─────────────────────┐   ┌────────────────────┐
│  Marketing +     │   │    API Routes       │   │  Admin Dashboard   │
│  Apply / Hire /  │   │    (/api/)          │   │    (/admin/)       │
│  Partner           │   │    Node runtime     │   │    React client    │
│  (React client)  │   │                      │   │                    │
└────────┬─────────┘   └──────────┬──────────┘   └─────────┬──────────┘
         │                        │                        │
         └────────────┬───────────┴────────────┬───────────┘
                      ▼                        ▼
             ┌──────────────────┐    ┌──────────────────┐
             │     Supabase     │    │  DeepSeek Proxy  │
             │    (Postgres)    │    │   (Playwright)   │
             │   service-role   │    └──────────────────┘
             └────────┬─────────┘              ▲
                      │                        │
                      │            ┌───────────┴────────────┐
                      │            │  DeepSeek (tagging)    │
                      │            │  Resend (email)        │
                      │            │  Vercel Analytics      │
                      │            └────────────────────────┘
                      ▼
        student_applications          partner_applicants_qualified
        company_briefs                partner_applicants_unqualified
        candidate_ai_tags             partner_ambassadors
```

Three user-facing funnels feed Supabase: the original student/company pair
(`student_applications`, `company_briefs`) and a second, parallel product —
Partner, a robotics data-collection vertical layered onto the same app — which
writes to three of its own tables via a separate persistence module (never the
original one; see §4.6–4.7 and §12). An admin surface reads from all of them,
runs AI semantic search over tagged candidates, and can stream resumes back to
the browser.

`proxy.ts` (Next.js 16's renamed `middleware.ts`) sits in front of `/admin/*` and
the two protected admin API routes, verifying the HMAC session cookie before any
of them run. The two Partner API routes (`/api/partner/submit`, `/api/partner/refer`)
are public, like `/api/submit` — `proxy.ts` does not match them.

---

## 2. Tech Stack

| Layer | Choice |
| --- | --- |
| **Framework** | Next.js 16 (App Router, React 19) |
| **Language** | TypeScript (strict) |
| **Styling** | Tailwind CSS v4 + custom CSS vars (`ink`, `line`, `flame`, `sky`, `lemon`, `lilac`, `lime`, `blush`, `shell`, `muted`) |
| **Fonts** | DM Sans via `next/font/google` → CSS var `--font-dm` |
| **Animations** | Motion `^13.2.0` (`motion/react`) |
| **Database** | Supabase (Postgres, service-role client) |
| **AI (tagging)** | DeepSeek via the same self-hosted Playwright reverse proxy used by vibe-search — model `deepseek-chat`, `prompt_version` `"v5"` |
| **AI (search)** | DeepSeek via a self-hosted Playwright reverse proxy |
| **Parsing** | `pdfjs-dist`, `mammoth` (docx), `jsonrepair` for LLM JSON recovery, raw `txt` passthrough |
| **Email** | Resend (optional — non-blocking) |
| **Analytics** | Vercel Analytics |
| **Deployment** | Vercel |
| **Scripts runner** | `tsx` |
| **Formatting** | Prettier `3.9.6` (pinned, `--save-exact`) |
| **Legacy DB bridge** | `pg` (Lovable backup restore) |
| **Groq** | Not used anywhere in the repo |

**Unused / unverified dependencies.** `package.json` currently declares four
dependencies that no file in the tree imports:

- `@google/generative-ai ^0.24.1`
- `groq-sdk ^1.6.0`
- `lenis ^1.3.26`
- `openai ^7.13.0`

Additionally, `pdf-parse ^2.4.5` and `@types/pdf-parse` are installed but I
have not seen `pdf-parse` imported — only `pdfjs-dist` and `mammoth` are used
by the tagger. Confirm before removing; if any of these are truly unused,
they should be uninstalled to keep the tree honest.

---

## 3. Directory Structure

```
.
├── app/
│   ├── layout.tsx                  Root layout: DM Sans, Nav, Footer,
│   │                               Analytics, skip-to-content link,
│   │                               metadata/OG/icon config, canonical tag,
│   │                               Bing verification, Organization/WebSite
│   │                               JSON-LD (see §11.1)
│   ├── page.tsx                    "/" → <Landing />
│   ├── globals.css                 Tailwind v4 entry + CSS vars
│   ├── robots.ts                   Generates /robots.txt (see §11.1)
│   ├── sitemap.ts                  Generates /sitemap.xml (see §11.1)
│   │
│   ├── apply/
│   │   ├── page.tsx                "/apply" wrapper
│   │   └── ApplyFlow.tsx           5-step student wizard (client)
│   │
│   ├── companies/
│   │   ├── page.tsx                "/companies" wrapper
│   │   └── HireFlow.tsx            4-step company wizard (client)
│   │
│   ├── partner/
│   │   ├── apply/
│   │   │   ├── page.tsx            "/partner/apply" wrapper
│   │   │   └── PartnerApplyFlow.tsx  4-step applicant wizard (client)
│   │   ├── refer/
│   │   │   ├── page.tsx            "/partner/refer" wrapper
│   │   │   └── AmbassadorFlow.tsx  1-step ambassador signup (client)
│   │   └── info/
│   │       └── page.tsx            "/partner/info" marketing page (server
│   │                               component; Hero/Pay/Devices/DoDont/
│   │                               Steps/Tasks/Cta)
│   │
│   ├── admin/
│   │   ├── page.tsx                Server component, force-dynamic; 5
│   │   │                           parallel queries (students, briefs,
│   │   │                           partner qualified/unqualified/ambassadors);
│   │   │                           robots: noindex,nofollow on the subtree
│   │   ├── AdminDashboard.tsx      Client dashboard: applications / briefs /
│   │   │                           Partner / Search tabs
│   │   └── login/
│   │       └── page.tsx            Client login (Suspense-wrapped form;
│   │                               honors ?from= with /admin allowlist;
│   │                               defaults to /admin)
│   │
│   └── api/
│       ├── submit/route.ts         POST — thin orchestrator:
│       │                           parse → duplicate/verify check → save →
│       │                           consume verification → notify (§4.8)
│       ├── partner/
│       │   ├── submit/route.ts     POST — applicant intake; inline
│       │   │                       validation (no shared parse module)
│       │   └── refer/route.ts      POST — ambassador signup; generates a
│       │                           referral code
│       ├── verify/
│       │   ├── send/route.ts       POST — duplicate check + issues a 6-digit
│       │   │                       OTP by email (§4.8)
│       │   └── confirm/route.ts    POST — checks the OTP, marks the
│       │                           (email, purpose) row verified (§4.8)
│       └── admin/
│           ├── login/route.ts      POST — verify creds, set cookie
│           ├── logout/route.ts     POST — clear cookie
│           ├── resume/[id]/route.ts GET — download resume (auth)
│           └── vibe-search/route.ts POST — SSE semantic candidate search
│
├── components/
│   ├── form.tsx                    Design system: Field, Input, Pills,
│   │                               ChoiceCards, Slider, RankList, DropZone,
│   │                               StepHeader, StepRail, Progress, NavButtons,
│   │                               EmailVerify (§4.8), ease
│   ├── Landing.tsx                 Homepage composed of internal sections
│   │                               (includes the Partner promo section)
│   ├── Nav.tsx                     Floating nav pill with scroll-collapse;
│   │                               "Earn Now" (→ /partner/info) is now the
│   │                               primary filled CTA
│   ├── Footer.tsx                  Server component with brand wordmark
│   ├── Mark.tsx                    Twin Lanterns logo (two panels + spark)
│   ├── Reveal.tsx                  Single whileInView fade-up primitive
│   └── Shapes.tsx                  6 SVG shapes (2 procedurally generated
│                                   via ring(); 4 hardcoded paths) +
│                                   shapePaths export
│
├── lib/
│   ├── supabase-server.ts          Service-role Supabase client factory
│   ├── admin-auth.ts               HMAC-signed cookie sessions (Web Crypto)
│   │                               + ADMIN_COOKIE_NAME / ADMIN_SESSION_MAX_AGE
│   ├── deepseek.ts                 Streaming DeepSeek proxy client (SSE)
│   ├── submissions/
│   │   ├── types.ts                StudentPayload / CompanyPayload /
│   │   │                           Submission discriminated union
│   │   ├── parse.ts                Request JSON → ParseSubmissionResult
│   │   │                           { ok: true; data } | { ok: false; status: 400; error }
│   │   ├── persistence.ts          Supabase inserts; throws
│   │   │                           SubmissionConfigError (500) /
│   │   │                           SubmissionSaveError (502)
│   │   ├── partner-types.ts          PartnerApplicantPayload / PartnerAmbassadorPayload
│   │   ├── partner-eligibility.ts    Device/task eligibility rules (see §4.6)
│   │   └── partner-persistence.ts    Supabase inserts into the 3 partner_* tables;
│   │                               throws PartnerConfigError (500) /
│   │                               PartnerSaveError (502) — a separate class
│   │                               hierarchy from Submission*Error (see §12)
│   ├── verification/               Email OTP + duplicate prevention (§4.8),
│   │   │                           shared by all three submission routes
│   │   ├── types.ts                VerificationPurpose + VERIFICATION_PURPOSES
│   │   ├── store.ts                email_verifications CRUD; throws
│   │   │                           VerificationConfigError (500) /
│   │   │                           VerificationRequestError (400/429) /
│   │   │                           VerificationRequiredError (400)
│   │   └── duplicate.ts            findDuplicateEmail — case-insensitive
│   │                               lookup per purpose, no DB constraint
│   └── email/
│       ├── resend.ts               Transport: sendResendEmail,
│       │                           getEmailConfig, ResendAttachment
│       ├── templates.ts            HTML renderers + escapeHtml +
│       │                           renderVerificationCode (§4.8)
│       ├── submission-emails.ts    Internal notify + submitter confirmation
│       ├── partner-templates.ts      Partner HTML renderers (reuses templates.ts
│       │                           helpers)
│       ├── partner-emails.ts         Partner internal notify + confirmation
│       │                           (applicant + ambassador)
│       └── verification-emails.ts  Sends the OTP code (§4.8) — the one email
│                                   send in the app that's allowed to throw
│
├── scripts/
│   ├── migrate-lovable.ts          Lovable students → student_applications
│   ├── migrate-resumes.ts          Backfill resume_data from local files
│   ├── tag-resumes.ts              DeepSeek tagging (deepseek-chat,
│   │                               prompt_version v5) → candidate_ai_tags
│   ├── test-deepseek-api.ts        Interactive CLI chat against the proxy
│   │                               (stale header comment says chat.ts)
│   └── test-partner-eligibility.ts   Pure-logic smoke test for
│                                   evaluatePartnerEligibility (no Supabase)
│
├── public/
│   ├── favicon.ico, favicon.svg,   icon.png also serves as the email logo
│   │   icon.png
│   ├── mark.svg                    Logo source (used by components/Mark.tsx)
│   ├── BingSiteAuth.xml            Bing Webmaster site-verification file
│   ├── file.svg, globe.svg,        Next.js boilerplate — dead
│   │   next.svg, vercel.svg,
│   │   window.svg
│   └── team/{carlos,cameron}.png   Orphaned — Founders section removed
│
├── supabase/
│   └── email_verifications.sql     Schema for the OTP table (§4.8) — apply
│                                   by hand in the Supabase SQL editor
│
├── proxy.ts                        Next.js 16 middleware — gates /admin/*
│                                   and the two protected admin API routes
│                                   (the two Partner API routes are public)
├── next.config.ts                  Empty (defaults)
├── tsconfig.json                   strict, @/* → ./*
├── eslint.config.mjs               Flat config (next core-web-vitals + TS)
├── postcss.config.mjs              @tailwindcss/postcss
├── .prettierrc                     {}
├── .prettierignore                 Only "build" and "coverage"
├── .env.local                      Dev secrets (gitignored)
├── next-env.d.ts                   Generated by Next
├── package.json
├── package-lock.json
├── tsconfig.tsbuildinfo            TS incremental build cache (gitignored)
├── ARCHITECTURE.md                 This document
└── DEEPSEEK-PROXY.md               Reverse-proxy runbook
```

---

## 4. Request Flow

### 4.1 Student Application — `POST /api/submit` with `kind: "student"`

```
ApplyFlow.tsx
│  (localStorage draft: tl-student-draft-v2)
│  5 steps: Interests → Availability → Priorities → About you → Finish
▼
POST /api/submit
│  body: { kind, payload, attachment?: { name, data } }
│  attachment.data is base64, produced client-side by DropZone
│  payload additionally carries a `resume` field (uploaded filename, or
│  "—" when none) — it lands in raw_payload but not in resume_name/
│  resume_data; those come from attachment
▼
lib/submissions/parse.ts
│  parseSubmissionRequest(req)
│  → { ok: true; data: Submission }
│    | { ok: false; status: 400; error: string }
│
│  normalizeAttachment:
│    - returns null unless the value is a non-null object
│    - returns null unless name AND data are both strings
│    - no base64 validation, no size check here
│
│  payload is accepted by raw type assertion (payload as StudentPayload) —
│  no per-field validation; the DB insert decides what's null.
▼
lib/submissions/persistence.ts
│  saveSubmission(submission)
│  - Supabase: student_applications
│    · named columns for every field
│    · interests[], priorities[] as arrays
│    · resume_name / resume_data — attachment.name / .data verbatim
│      (persistence does NOT encode; the client already sent base64)
│    · raw_payload (jsonb) — the parsed payload object, verbatim
│  - throws SubmissionConfigError | SubmissionSaveError
▼
lib/email/submission-emails.ts (non-blocking)
│  sendSubmissionEmails(submission)
│  ├── lib/email/templates.ts → HTML + escapeHtml
│  ├── lib/email/resend.ts    → POST api.resend.com
│  ├── Resend → internal notification to founders (with attachment)
│  └── Resend → confirmation to the student (mark only)
│      · skipped if the payload has no email
▼
{ ok: true }
```

**Failure modes**

| Condition | Response |
| --- | --- |
| Invalid JSON body | `400 Invalid JSON` |
| Body not an object, or missing `kind` / `payload`, or `payload` not an object | `400 Missing fields` |
| `kind` is neither `"student"` nor `"company"` | `400 Invalid kind` |
| Supabase env missing (`getSupabaseServerClient` throws → `SubmissionConfigError`) | `500 Server misconfigured` |
| `SubmissionSaveError` (insert returned an error) | `502 Save failed` |
| Any other error thrown by `saveSubmission` | `502 Save failed` |
| Email failure (any layer) | logged, never fails |

Notes:

- The `400` branches are the only paths that use `parsed.status`; every other
  status is chosen inside the route from the thrown error.
- The route distinguishes `500` from `502` with a single
  `err instanceof SubmissionConfigError` check. Any error that is neither a
  `SubmissionConfigError` nor a `SubmissionSaveError` also lands on `502`.

### 4.2 Company Brief — `POST /api/submit` with `kind: "company"`

Same endpoint. `parseSubmissionRequest` yields a `Submission` with
`kind: "company"`; `saveSubmission` writes to `company_briefs`.

- Attachment normalization runs identically for both kinds, but the company
  branch of `persistence.ts` does **not** persist `resume_name` /
  `resume_data`. A submitted attachment on a company brief is silently
  dropped at the DB layer (it survives in `parse.ts`'s output but never
  reaches a column).
- Company-specific column mapping lives in the same file:
  - `contact_name` ← payload `name`
  - `contact_email` ← payload `email`
  - `team_size` ← payload `team`
  - `function` ← payload `fn`
- `raw_payload` receives the parsed `CompanyPayload` verbatim, same as the
  student branch.

HireFlow never sends an attachment — the company wizard has no file
upload. The attachment normalization in parse.ts still runs (it's shared
with the student path), but no company payload ever populates it, so the
"silently dropped at the DB layer" caveat above is theoretical only.

Draft persistence uses a distinct localStorage key from the student
wizard: `tl-company-draft` (vs. `tl-student-draft-v2`).

### 4.3 Admin Login

```
/admin/login → POST /api/admin/login { username, password }
│
├── 500 if ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_SESSION_SECRET missing
├── 401 if username/password wrong (constant-time compare)
└── 200 → sets ADMIN_COOKIE_NAME cookie
          payload   = "admin.<expiresAtMs>"
          signature = HMAC-SHA256(payload, SECRET)
          httpOnly, sameSite=lax, secure in prod, ADMIN_SESSION_MAX_AGE
```

### 4.4 Vibe Search — `POST /api/admin/vibe-search`

Streamed via SSE. Auth check runs before the stream opens; the query is
required to be at least 3 characters after trimming.

**Pre-stream guards**

| Condition | Response |
| --- | --- |
| Invalid/missing session cookie | `401 { error: "Unauthorized" }` (also enforced by `proxy.ts`) |
| Body isn't JSON, or `query` missing / `query.trim().length < 3` | `400 { error: "Query too short" }` |
| Any other pre-stream error | `500 { error }` |

Errors **after** the stream opens are emitted as SSE events
(`{ type: "error", error }`), never as HTTP statuses.

**Three stages, four SSE stage names**

The route emits these `stage` events in order. `filtering`, `analyzing`, and
`ranking` each fire twice (start + done); `initializing` fires once. Small
artificial delays (three × 500ms, one × 300ms) space the stages out.

```
initializing  →  filtering (start)  →  filtering (done, with shortlist)
              →  analyzing (start)  →  analyzing (done)
              →  ranking   (start)  →  ranking   (done)
              →  result
```

---

**Stage 1 — Fetch & filter**

- Fetch all students from `student_applications` (joined with
  `candidate_ai_tags`, ordered `created_at desc`) — **no `.limit()`**; the full
  table is pulled and filtered in memory.
- Client-side filter keeps rows where:
  - `candidate_ai_tags` exists, and `vibe_tags.length > 0`, and
  - `isTestAccount(candidate) === false`
- `isTestAccount` matches on these heuristics:
  - name includes `"test"`
  - name is exactly `"a a"`, `"a b"`, or `"c xx"`
  - email includes `"test"`, `"example.com"`, or `"ssrf"`
  - email is exactly `"a@gmail.com"` or `"pwn2@gmail.com"`
- `classifyQueryWithAI(query)` via DeepSeek proxy
  (`callDeepSeekProxy(systemPrompt, prompt, 1000, 0.2)`) →
  `{ keywords, tag_matches{ vibe_tags, soft_skills, hard_skills }, search_phrase }`
- On proxy error or invalid JSON, `classifyQueryWithAI` falls back to naive
  whitespace tokenization of the query (words with length > 2), with empty
  `tag_matches`. Search still runs; only tag-overlap scoring goes dark.
- `matchCandidatesWithTags(...)`
  - **Tag overlap: +8** per candidate tag that overlaps at least one target
    tag (inner loop breaks on first hit, so one candidate tag scores at most
    once)
  - **Summary hit: +2** per expanded term that hits
  - **`raw_payload` hit: +3** per expanded term, breaking on the first
    matching field
  - A single term can score on both summary (+2) and raw_payload (+3).
  - Token pipeline: lowercase → unicode dashes (`\u2010-\u2015\u2212`) to
    ASCII `-` → strip non-alnum → tokenize (len > 1) → light stem
    (`ing`/`ers` → strip, `ies` → `y`, `es` → strip, trailing `s` → strip if
    len > 3 and not `ss`)
  - Prefix match when both tokens are length ≥ 4
  - **Relax-if-too-few:** if `topMatches.length < min(5, limit)`, rebuild as
    `[...score > 0 sorted desc, ...score === 0 in input order].slice(0, limit)`
    — a "keep the scorers, then pad" fill, not a global re-sort.
- If the shortlist is empty, the route emits
  `{ type: "result", results: [], shortlist: [] }` and closes. **Stages 2 and
  3 do not run.**

**Stage 2 — `stage2BatchAnalysis`**

- DeepSeek, per shortlist, `max_tokens 2000`, `temperature 0.3`
- `buildFullCandidateProfile()` sends the model a **fresh, full re-read of
  each candidate**, not the stage-1 preview: untruncated `vibe_tags` /
  `soft_skills` / `hard_skills`, the full `ai_summary`, and the entire
  `raw_payload` as submitted (every key survives except ones matching
  `/resume_data|base64|_blob$/i`, which are dropped as file blobs, not
  applicant-authored text). Stage 1's `score` / `matchedKeywords` are
  deliberately **not** included in this payload — the prompt instructs the
  model to evaluate each candidate against the query from scratch and not
  assume relevance just because they made the shortlist, since
  `matchCandidatesWithTags`'s relax-if-too-few path can backfill the
  shortlist with `score === 0` candidates.
- Still **one batched DeepSeek call for the whole shortlist** (not one call
  per candidate) — the proxy serializes all requests through a single
  Playwright browser (§9 of `DEEPSEEK-PROXY.md`), so up to 20 sequential
  per-candidate calls at a 180s hard timeout each would be far too slow and
  would block every other proxy consumer. The tradeoff of sending full
  profiles instead of truncated ones is a larger prompt; if the shortlist
  `limit` (currently 20, set in `matchCandidatesWithTags`) is raised, watch
  for the 180s proxy timeout rather than re-introducing per-field truncation.
- Two fallback strings:
  - per-candidate `"Analysis unavailable."` — call succeeded, index missing
  - whole-call `"Analysis unavailable (API limits)."` — call threw, returned
    empty analyses, or JSON parse failed

**Stage 3 — `stage3Rank`**

- DeepSeek, `max_tokens 4000`, `temperature 0.1`
- Returns `{ ranked_candidates: [{ index, rank, match_score, reason }] }`
- Fallback on parse failure: unranked with `match_score = 50`,
  `rank = index + 1`, reason `"Ranking unavailable — showing shortlisted
  order."`

> **Security:** All three stages wrap untrusted content in XML-style tags
> (`<search_query>`, `<candidate_data>`, `<candidate_analyses>`) and instruct
> the model to treat it as data (prompt-injection hardening). `<think>` blocks
> are stripped inside `callDeepSeekProxy` and again inside `parseAIResponse`.

**SSE events**

```ts
{ type: "stage",  stage: "initializing" | "filtering" | "analyzing" | "ranking",
  message: string, shortlist?: Candidate[] }

{ type: "result", results: RankedCandidate[], shortlist: Candidate[] }

{ type: "error",  error: string }
```

The route never emits `stage: "complete"`. The stepper's "complete" state in
`AdminDashboard.tsx` is derived from receiving `{ type: "result" }`.
`initializing` fires once; `filtering`, `analyzing`, and `ranking` each fire
twice (start + done). The `shortlist` field appears on the second `filtering`
event and on the final `result`.

**Response headers**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

### 4.5 Resume Download — `GET /api/admin/resume/[id]`

```
proxy.ts returns 401 JSON for invalid/missing session (before handler)
│
▼
handler re-checks isAdmin() as defense-in-depth
│  cookies() → ADMIN_COOKIE_NAME → verifySessionToken
├── 401 { error: "Unauthorized" } if invalid
▼
Supabase: select resume_name, resume_data where id = ?
│
├── 404 { error: "Not found" }                if row missing / query error
├── 404 { error: "No resume on file for this application" }
│                                              if resume_name or resume_data null
▼
decode base64:
  raw    = data.resume_data
  base64 = raw.includes(",") ? raw.split(",").pop()! : raw   // tolerate data-URI form
  buffer = Buffer.from(base64, "base64")
│
├── 500 { error: "Could not decode stored resume data" } if decode throws
▼
filename = String(data.resume_name).replace(/"/g, "")   // strip quotes for header safety
▼
NextResponse(new Uint8Array(buffer)) with headers:
  Content-Type:        guessed from extension
                       (pdf / doc / docx / png / jpg / jpeg / txt / rtf;
                        default application/octet-stream)
  Content-Disposition: attachment; filename="..."
  Content-Length:      buffer.length
  Cache-Control:       private, no-store
```

### 4.6 Partner Applicant — `POST /api/partner/submit`

Partner is a second, parallel product on the same app: people film everyday
physical tasks (cleaning, repair, warehouse, etc.) with a head-mounted phone to
produce training data for robotics AI. `/partner/apply` is the applicant
(filmer) funnel; `/partner/refer` (§4.7) is the ambassador/referral funnel.

```
PartnerApplyFlow.tsx
│  (localStorage draft: tl-partner-draft-v1)
│  4 steps: About you → Eligibility → Tasks → Finish (see §9.4 for the
│  per-step validity rules)
│  On mount: reads ?ref= from the URL, stores it to localStorage
│  tl-partner-ref-code, and displays "Referred by {code}"; falls back to any
│  previously-stored code if the URL has none
▼
POST /api/partner/submit
│  body: { payload: { firstName, lastName?, email, phone?, location?,
│    referredBy?, referrerCollege?, deviceOs, deviceModel, taskInterests[],
│    filmingAck, consent, referredByCode } }
│
│  Validation is inline in the route handler — there is no partner-parse.ts;
│  unlike /api/submit (§4.1, §12), Partner does not delegate to a shared parse
│  module.
│    - 400 "Invalid JSON" on unparseable body
│    - 400 "Missing fields" if body/payload isn't an object
│    - 400 "Missing or invalid name/email" if firstName is empty or email
│      fails /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
│    - deviceOs is enum-validated: anything other than the literal "ios" /
│      "android" silently becomes ""
│    - filmingAck / consent use a strict bool() helper — only the literal
│      true passes ("false", 1, etc. all become false)
▼
lib/submissions/partner-persistence.ts → savePartnerApplicant(payload)
│  - Re-runs evaluatePartnerEligibility(payload) server-side — never trusts a
│    client-supplied qualified flag
│  - Inserts into one of two tables depending on the result:
│    · partner_applicants_qualified   (qualified)
│    · partner_applicants_unqualified (unqualified — same columns plus
│      disqualified_reasons: text[])
│  - Returns { id, table, qualified, reasons }
│  - Throws PartnerConfigError | PartnerSaveError — a separate class hierarchy
│    from SubmissionConfigError/SubmissionSaveError (see §12)
▼
lib/email/partner-emails.ts → sendPartnerApplicantEmails (best-effort, logged
│  not thrown — same non-blocking pattern as §6.4)
│  ├── internal notification to TL_NOTIFY_EMAIL: "New Partner applicant
│  │   (qualified|unqualified) — {fullName}", includes qualified + reasons
│  └── confirmation to the applicant: "You're in — Partner" (qualified) or
│      "We've got your application — Partner" (unqualified)
▼
{ ok: true, qualified: boolean }
```

**Eligibility rules** (`lib/submissions/partner-eligibility.ts`, sourced from an
external requirements doc):

- `PARTNER_DEVICES.ios` — 24 explicit iPhone models (iPhone 12 through 17, all
  variants); `PARTNER_DEVICES.android` — 20 explicit models (Galaxy S21–S24 +
  variants, Pixel 6–9 + Pro)
- `PARTNER_EXCLUDED_MODELS = ["iPhone 16e", "iPhone 17e"]` — explicitly excluded
  despite prefix-matching a qualifying name
- `isQualifyingDevice(os, model)` checks the excluded list first, then exact
  membership in the OS's list — no fuzzy/prefix matching
- `PARTNER_TASK_CATEGORIES` — 15 fixed category strings (agriculture, auto
  service, construction, cleaning, food/kitchen, hospitality, carpentry, home
  maintenance, trades, warehouse, manufacturing, retail back-of-house,
  personal care, organization/storage)
- `evaluatePartnerEligibility(input)` → `{ qualified, reasons }`, reason codes:
  `no_device_selected` (missing os or model), `unsupported_device`,
  `no_filming_ack`, `no_consent`. Choosing "Neither" for phone OS always
  yields `deviceOs: ""` downstream → always produces `no_device_selected`, so
  a "Neither" applicant can still complete and submit the wizard but is
  always unqualified.
- Tested by `scripts/test-partner-eligibility.ts` (§10.5) — pure logic, no
  Supabase.

**Failure modes**

| Condition | Response |
| --- | --- |
| Invalid JSON body | `400 "Invalid JSON"` |
| Body/payload not an object | `400 "Missing fields"` |
| `firstName` empty or `email` fails the regex | `400 "Missing or invalid name/email"` |
| `PartnerConfigError` (Supabase env missing) | `500`, message is `err.message` in dev / `"Server Misconfigured"` in prod |
| `PartnerSaveError` or any other error | `502`, message is `err.message` in dev / `"Save failed"` in prod |
| Email failure (any layer) | logged, never fails |

> The dev-vs-prod error-message branching on `500`/`502` here is unique to
> the Partner routes — `/api/submit` (§4.1) always returns the same generic
> string regardless of environment. `"Server Misconfigured"` is also
> capitalized inconsistently with the rest of the app's lowercase error
> strings (e.g. `"Server misconfigured"` in §4.1/§4.4). Worth normalizing if
> Partner's error handling is ever consolidated with the original submission
> path.

### 4.7 Partner Ambassador Referral — `POST /api/partner/refer`

```
AmbassadorFlow.tsx
│  1 step: name + email (valid = name.trim().length > 1 && email matches
│  the same regex as above)
▼
POST /api/partner/refer
│  body: { name, email }   — flat, not wrapped in `payload`
│  - 400 "Invalid JSON" / 400 "Missing or invalid name/email"
▼
lib/submissions/partner-persistence.ts → savePartnerAmbassador(name, email)
│  - Inserts into partner_ambassadors: name, email, code, raw_payload
│  - code: 6 chars from alphabet ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no
│    0/O/1/I — avoids visual ambiguity)
│  - Retries up to 5× on Postgres 23505 unique_violation:
│    · violated constraint is partner_ambassadors_email_key → throws
│      PartnerSaveError("You're already an ambassador") immediately, no retry
│    · any other unique violation → retries with a fresh random code
│      (handles a `code` collision)
│    · any non-23505 error bails immediately
▼
referralUrl = getOrigin(req) + "/partner/apply?ref={code}"
│  getOrigin: NEXT_PUBLIC_SITE_URL env if set, else x-forwarded-proto /
│  x-forwarded-host / host headers, else new URL(req.url).origin
▼
lib/email/partner-emails.ts → sendPartnerAmbassadorEmails (best-effort)
│  ├── internal notification: "New Partner ambassador — {name}"
│  └── confirmation to the ambassador: "You're a Partner ambassador — here's
│      your link" (includes code + referralUrl)
▼
{ ok: true, code }
```

The applicant wizard reads back `code` via the `?ref=` query param it was sent
with (§4.6), so a referral is attributed by `referred_by_code` on the
applicant row — there's no server-side join table, just a shared `code`
string between `partner_ambassadors` and the two applicant tables.

**Failure modes**

| Condition | Response |
| --- | --- |
| Invalid JSON body | `400 "Invalid JSON"` |
| Body not an object, or `name`/`email` empty/invalid | `400 "Missing or invalid name/email"` |
| `PartnerConfigError` | `500 { error: "Server misconfigured" }` |
| `PartnerSaveError` or any other error | `502 { error: "Save failed" }` |
| Email failure (any layer) | logged, never fails |

---

### 4.8 Email Verification & Duplicate Prevention

All four public funnels (`/api/submit` with `kind: "student"` or
`"company"`, `/api/partner/submit`, `/api/partner/refer`) require the submitter's
email to be verified via an inline 6-digit OTP, and reject a submission
outright if that email already has a row in the relevant table(s). This
lives outside the `submissions`/`partner-*` persistence modules, in
`lib/verification/`, so it applies uniformly across both class hierarchies
(`Submission*Error` and `Partner*Error`) without touching either.

```
components/form.tsx → <EmailVerify purpose="student|company|partner_applicant|partner_ambassador">
│  Renders inline under the email Field in each wizard's contact step.
│  Owns its own fetch calls — no prop drilling through the wizard beyond
│  `email` in / `verified` boolean out (same "self-contained widget" pattern
│  as DropZone).
▼
POST /api/verify/send { email, purpose }
│  1. findDuplicateEmail(purpose, email) — 409 if already present
│  2. issueVerificationCode — upserts lib/verification/store.ts's
│     email_verifications row (see below), emails the code
▼
POST /api/verify/confirm { email, purpose, code }
│  confirmVerificationCode — matches code, sets verified = true
▼
User continues the wizard and submits. The step's "Continue"/"Submit" button
stays disabled until `verified` is true, same mechanism as every other
per-step validity check in §9.4.
▼
POST /api/submit | /api/partner/submit | /api/partner/refer
│  Before calling saveSubmission / savePartnerApplicant / savePartnerAmbassador:
│  1. findDuplicateEmail again (closes the race between "send code" and
│     "submit" — someone else may have taken that email in between)
│  2. assertEmailVerified — re-reads the row; throws
│     VerificationRequiredError if verified is not true
│  On success: consumeVerification deletes the row (best-effort, not
│  awaited-to-fail — a cleanup miss just leaves a stale row that a later
│  resend overwrites)
```

**`email_verifications` table** (`supabase/email_verifications.sql` — apply
by hand in the Supabase SQL editor; there's no migration runner in this
repo, same as every other table)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `email` | text | lowercased + trimmed before every read/write in `store.ts` — the table itself has no `citext` |
| `purpose` | text | one of `student` / `company` / `partner_applicant` / `partner_ambassador` |
| `code` | text | 6 ASCII digits |
| `attempts` | int | incremented on each wrong guess; 5 exhausts the code |
| `verified` | boolean | |
| `expires_at` | timestamptz | 10 minutes from issue; only gates the *code*, not the `verified` flag once set (see note below) |
| `created_at` | timestamptz | also doubles as the resend-cooldown clock (30s) |

> **Unique constraint:** `(email, purpose)` — `issueVerificationCode` upserts
> on this pair, so requesting a new code overwrites the old one rather than
> creating a second row.

**Why duplicate checks live outside the DB schema.** `student_applications`,
`company_briefs`, etc. have no unique constraint on their email columns —
adding one retroactively risks failing on pre-existing duplicate rows from
the Lovable migration (§10.1) or legitimate re-applications made before this
feature existed. Instead, `findDuplicateEmail` does an app-level
case-insensitive lookup (`ilike`, with `%`/`_` escaped so a literal one in
an address can't broaden the match) before insert. This is a check-then-act
race in theory; in practice, submission volume here is low enough that it's
not worth the schema risk of a hard constraint. Partner applicants are the one
purpose that checks two tables (`partner_applicants_qualified` and
`_unqualified`) since eligibility decides which one a given applicant lands
in — someone rejected once shouldn't be able to re-apply under the same
email and land in the other table.

**Verified-flag lifetime.** Once `confirmVerificationCode` sets
`verified = true`, `assertEmailVerified` does not re-check `expires_at` —
only `confirmVerificationCode` itself does, at the moment the code is
checked. So a stale `expires_at` never invalidates an already-verified row;
only `consumeVerification` (on successful submit) or a fresh
`issueVerificationCode` (which overwrites the row) clears it. This is a
deliberate simplification for a marketing-site signup flow, not a session
token — don't reuse this table for anything higher-stakes without adding
that check back.

**Email delivery.** `lib/email/verification-emails.ts` reuses the same
Resend transport and `templates.ts` helpers as `submission-emails.ts` /
`partner-emails.ts`, but unlike those, a failed send is **not** swallowed —
`issueVerificationCode` lets it throw, because the code is the applicant's
only way to complete the OTP step (contrast with the internal/confirmation
notification emails in §6.4, which are always best-effort). When
`RESEND_API_KEY` isn't set (e.g. local dev), it logs the code to the server
console instead of sending, so the flow stays testable without email
configured.

**Failure modes** (both `/api/verify/send` and `/api/verify/confirm`)

| Condition | Response |
| --- | --- |
| Invalid JSON body | `400 { ok: false, error: "Invalid JSON" }` |
| Missing/invalid `email`, `purpose`, or (confirm only) non-6-digit `code` | `400` |
| Duplicate email (`send` only) | `409` with a purpose-specific message |
| Resend cooldown not elapsed (`send` only) | `429` |
| Code expired / wrong / attempts exhausted (`confirm` only) | `400` |
| Supabase env missing (`VerificationConfigError`) | `500 { ok: false, error: "Server misconfigured" }` |
| Any other error | `502` |

The three submission routes surface the same `VerificationRequiredError` /
duplicate check as a `400` / `409` on their own response shape (`{ error }`
for `/api/submit`, `{ ok: false, error }` for the two Partner routes) rather
than re-exporting these types — see each route's own failure-mode table
above.

---

## 5. Authentication

**Model:** stateless, HMAC-signed cookie. No user table, no bcrypt, no session
table. The only credential store is the `ADMIN_USERNAME` / `ADMIN_PASSWORD` env
vars.

**Token format**

```
admin.<expiresAtMs>.<hmac_sha256_hex>
```

- The `admin` prefix comes from `TOKEN_PREFIX` in `lib/admin-auth.ts`;
  `verifySessionToken` rejects unrelated cookies on the prefix before doing any
  crypto.
- `MAX_TOKEN_LENGTH = 512` is a defensive upper bound — tokens longer than this
  are rejected without parsing.

**Code:** `lib/admin-auth.ts`

| Export | Purpose |
| --- | --- |
| `ADMIN_COOKIE_NAME` | `"admin_session"` — single source of truth for the cookie name |
| `ADMIN_SESSION_MAX_AGE` | `60 * 60 * 24 * 7` — shared cookie lifetime (7 days) |
| `createSessionToken(secret, maxAgeSeconds)` | Signs `<prefix>.<expiry>` with HMAC-SHA256; throws on non-positive or non-finite `maxAgeSeconds` |
| `verifySessionToken(token, secret)` | Rejects on: missing token, length > 512, no `.`, malformed payload (`parts.length !== 2` or prefix mismatch), non-finite/expired timestamp, or signature mismatch. Signature compare is `timingSafeEqualHex` (hex-char XOR loop, length-gated). Accepts `string \| undefined \| null`. |

Uses **Web Crypto** (`crypto.subtle`) so the same code runs in both the Edge
runtime (`proxy.ts`) and Node runtime (API routes).

**Cookie: `ADMIN_COOKIE_NAME`**

Set by `login/route.ts`:

| Attribute | Value |
| --- | --- |
| `httpOnly` | yes |
| `sameSite` | `lax` |
| `secure` | `NODE_ENV === "production"` |
| `path` | `/` |
| `maxAge` | `ADMIN_SESSION_MAX_AGE` (7 days) |

Cleared by `logout/route.ts` with only `{ path: "/", maxAge: 0 }` and an empty
value. The clearing call intentionally does **not** restate `httpOnly` /
`secure` / `sameSite` — deletion is driven by the `(name, path, maxAge=0)`
tuple, and the browser discards the rest. Don't assume logout mirrors login's
attribute set.

**Login comparison** (`app/api/admin/login/route.ts`): Node
`crypto.timingSafeEqual`, wrapped in `safeCompare`. On a length mismatch it runs
`timingSafeEqual(bufA, bufA)` — a self-comparison to normalize timing — then
returns `false`. Do **not** "simplify" this to `timingSafeEqual(bufA, bufB)`;
that throws on unequal lengths. Both `username` and `password` must be
non-empty and match.

**Middleware — `proxy.ts`**

Next.js 16 renamed `middleware.ts` to `proxy.ts`; the export is `proxy()`. It
matches exactly three surfaces:

```
/admin/:path*
/api/admin/resume/:path*
/api/admin/vibe-search/:path*
```

`/api/admin/login` and `/api/admin/logout` are deliberately **not** matched —
login issues the cookie, logout clears it, neither needs a valid session first.
`/api/submit` and both `/api/partner/*` routes are also unmatched — they're
public intake endpoints, not admin surfaces.

Behavior:

| Condition | `/admin/*` pages | `/api/admin/*` routes |
| --- | --- | --- |
| `ADMIN_SESSION_SECRET` missing | `302 → /admin/login` (fail closed) | `500 { error: "Server misconfigured" }` |
| Cookie missing or invalid | `302 → /admin/login?from=<path>` | `401 { error: "Unauthorized" }` |
| Cookie valid, visiting `/admin/login` | `302 → /admin` | n/a |
| Cookie valid, any other match | pass through | pass through |

Note the ordering: the login-page check runs **before** the invalid-cookie
check. A valid session on `/admin/login` short-circuits to `/admin`; an invalid
one passes through so the form can render.

API routes return **JSON 401** (not a redirect) so SSE clients and `fetch()`
callers don't get an HTML redirect they can't parse.

**`?from=` round trip**

`proxy.ts` sets `?from=<pathname>` when redirecting to the login page. The login
form (`app/admin/login/page.tsx`) reads it, validates `startsWith("/admin")`
(allowlist — blocks open-redirect payloads like `?from=//evil.com`), and pushes
that path after a successful login.

**Where auth is enforced**

| Surface | Enforcement |
| --- | --- |
| `/admin` and `/admin/*` pages | `proxy.ts` verifies the HMAC cookie before the page renders |
| `/api/admin/resume/[id]` | `proxy.ts` returns `401 JSON` before the handler runs; handler also calls `isAdmin()` as defense-in-depth |
| `/api/admin/vibe-search` | `proxy.ts` returns `401 JSON` before the handler runs; handler also calls `verifySessionToken` before opening the SSE stream |
| `/api/admin/login` | Issues the cookie; 401 on bad creds |
| `/api/admin/logout` | Clears the cookie (no auth check needed — idempotent) |

---

## 6. External Services

### 6.1 Supabase (Postgres)

- **Client:** `getSupabaseServerClient()` in `lib/supabase-server.ts`
- Service-role key, RLS bypass, `auth.persistSession: false`

> ⚠️ Never import from a `"use client"` component.
> Never expose `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix.

| Env | Value |
| --- | --- |
| URL | `SUPABASE_URL` (falls back to `NEXT_PUBLIC_SUPABASE_URL`) |
| Key | `SUPABASE_SERVICE_ROLE_KEY` |

#### Tables

**`student_applications`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `first_name` | text | |
| `last_name` | text | nullable |
| `email` | text | |
| `phone` | text | nullable |
| `level` | text | High school / Undergraduate / Graduate / Gap year |
| `school` | text | |
| `grad_year` | text | |
| `location` | text | |
| `interests` | text[] | |
| `hours_per_week` | text | e.g. `"10 hrs / week"` or `"Full time"` |
| `start_timing` | text | e.g. `"In about 2 weeks"` |
| `work_setup` | text | Remote / Hybrid / In person / No preference |
| `priorities` | text[] | rank-prefixed (`"1. ..."`) |
| `built` | text | free-form "something you built" |
| `links` | text | newline-joined URLs |
| `resume_name` | text | nullable |
| `resume_data` | text | base64 (nullable) |
| `raw_payload` | jsonb | verbatim original submission |
| `created_at` | timestamptz | |

**`company_briefs`**

| Column | Type |
| --- | --- |
| `id` | uuid PK |
| `company` | text |
| `website` | text nullable |
| `contact_name` | text |
| `contact_email` | text |
| `stage` | text |
| `team_size` | text |
| `function` | text |
| `title` | text |
| `outcome` | text |
| `work_setup` | text |
| `city` | text |
| `commitment` | text |
| `pay` | text |
| `timeline` | text |
| `raw_payload` | jsonb |
| `created_at` | timestamptz |

**`candidate_ai_tags`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `student_id` | uuid | FK → `student_applications.id` |
| `vibe_tags` | text[] | |
| `soft_skills` | text[] | |
| `hard_skills` | text[] | |
| `ai_summary` | text | one-line summary |
| `model_used` | text | currently `"deepseek-chat"`; recorded by the tagger |
| `prompt_version` | text | currently `"v5"` — bump in tag-resumes.ts to force a re-tag |
| `source_file_name` | text | |
| `ai_processed_at` | timestamptz | |
| `raw_ai_response` | jsonb | |

> **Unique constraint:** `(student_id, prompt_version)` — the tagging script
> upserts on this pair.

**`partner_applicants_qualified`** / **`partner_applicants_unqualified`**

Written by `savePartnerApplicant` (§4.6) — same columns in both; the
unqualified table adds one extra column.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `first_name` | text | |
| `last_name` | text | nullable |
| `email` | text | |
| `phone` | text | nullable |
| `location` | text | nullable |
| `device_os` | text | `"ios"` / `"android"` / `""` |
| `device_model` | text | |
| `referred_by` | text | nullable — free-text "who referred you" |
| `referrer_college` | text | nullable — free-text "their college" |
| `task_interests` | text[] | |
| `filming_ack` | boolean | |
| `consent` | boolean | |
| `referred_by_code` | text | nullable — ambassador code from `?ref=`, joins loosely to `partner_ambassadors.code` |
| `disqualified_reasons` | text[] | **`partner_applicants_unqualified` only** — reason codes from `evaluatePartnerEligibility` |
| `raw_payload` | jsonb | verbatim parsed payload |
| `created_at` | timestamptz | |

**`partner_ambassadors`**

Written by `savePartnerAmbassador` (§4.7).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `name` | text | |
| `email` | text | unique (`partner_ambassadors_email_key`) |
| `code` | text | unique, 6 chars, alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` |
| `raw_payload` | jsonb | |
| `created_at` | timestamptz | |

### 6.2 DeepSeek Reverse Proxy

Self-hosted Playwright proxy that drives the DeepSeek web UI and returns either
a streamed SSE response (`stream: true`) or a single JSON object
(`stream: false`) shaped like OpenAI's `/v1/chat/completions`.

| Item | Value |
| --- | --- |
| Env | `DEEPSEEK_PROXY_URL`, `DEEPSEEK_API_KEY_REVERSE_PROXY` |
| Model requested | `deepseek-chat` |

**Three client paths**

| Path | Behaviour |
| --- | --- |
| `lib/deepseek.ts` (`streamDeepSeekWeb`) | streaming (`stream: true`), yields `"append"` / `"replace"` events. `"replace"` exists because DeepSeek's DOM can re-render mid-response (e.g. table separators becoming real content), which append-only streaming can't represent. **Does not strip `<think>` blocks** — raw content is yielded; the consumer is expected to strip. |
| `app/api/admin/vibe-search/route.ts` (`callDeepSeekProxy`) | non-streaming (`stream: false`) with per-call timeouts. **Strips `<think>` blocks** inside the helper, and again inside `parseAIResponse`. |
| `scripts/tag-resumes.ts` (`callDeepSeek`) | non-streaming (`stream: false`), `temperature: 0.1`, `max_tokens: 2500`. Normalizes the base URL via `buildChatCompletionsUrl` (accepts a bare host, a `/v1` suffix, or a full `/chat/completions` URL). Strips `<think>` blocks inside `extractJson` before running `jsonrepair`. |

- **Timeout:** 200s (`200_000ms`) client-side via `AbortController`, in **all
  three** paths. The vibe-search route's comment claims a 180s server-side
  hard cap, but nothing in the route, `lib/deepseek.ts`, or `tag-resumes.ts`
  enforces it — treat 200s as the only enforced bound and confirm the proxy's
  own timeout before relying on 180s.
- **Reasoning tokens:** the vibe-search route strips `<think>...</think>`
  twice (`callDeepSeekProxy` and `parseAIResponse`); `tag-resumes.ts` strips
  once inside `extractJson`; `lib/deepseek.ts` does **not** strip.
- **Empty content:** `callDeepSeekProxy` throws `"Empty content from proxy"`;
  `callDeepSeek` throws `"DeepSeek proxy returned no content"`.
- **JSON recovery:**
  - vibe-search's `parseAIResponse`: strip thinking → extract fenced ```json
    block → slice from first `{` to last `}` → `JSON.parse` → regex
    `/\{[\s\S]*\}/` fallback.
  - tag-resumes' `extractJson`: strip thinking → strip markdown fence →
    slice to outermost `{...}` → **`jsonrepair()`** (handles unquoted keys,
    trailing commas, raw newlines inside strings, malformed nesting).
    
### 6.3 Groq

Not used anywhere in the repo. Earlier revisions of this document claimed the
tagger ran on Groq (`openai/gpt-oss-120b`); that was never true for the
current codebase. The tagger is DeepSeek-only — see §6.2.

### 6.4 Resend (Email)

Used by the original submission flow and by Partner (§6.4.1), and entirely
non-blocking in both. The `/api/submit` route handler delegates to
`lib/email/submission-emails.ts`; the transport (`resend.ts`) and base
templating (`templates.ts`) are separate modules so the route stays an
orchestrator, and Partner's own email module reuses that same transport and
templating layer rather than introducing new infrastructure.

| File | Responsibility |
| --- | --- |
| `lib/email/resend.ts` | `getEmailConfig()` reads env; `sendResendEmail()` POSTs to Resend, returns early if `RESEND_API_KEY` is missing, and logs non-2xx responses without throwing |
| `lib/email/templates.ts` | `renderInternalNotification()` / `renderConfirmation()`; `escapeHtml()` applied to every interpolated payload value |
| `lib/email/submission-emails.ts` | Orchestrates the two sends; attaches `icon.png` as `cid:mark`; adds the resume to the founder email only |

| Env | Notes |
| --- | --- |
| `RESEND_API_KEY` | |
| `TL_NOTIFY_EMAIL` | |
| `TL_FROM_EMAIL` | defaults to `"Twin Lanterns <onboarding@resend.dev>"` |

**Sends up to two emails per submission:**

1. Internal notification to founders — always attempted if `RESEND_API_KEY`
   and `TL_NOTIFY_EMAIL` are both set. Includes the resume attachment when
   `attachment.data` is truthy.
2. Confirmation to the submitter — only when the payload's `email` field is a
   non-empty string. If it's missing, the function returns after the internal
   send; no confirmation is attempted.

Both emails embed the Twin Lanterns mark inline as `cid:mark`, backed by the
`MARK_ATTACHMENT` constant:

```ts
{
  filename: "icon.png",
  path: "https://twinlanterns.co/icon.png",
  content_id: "mark",
  content_type: "image/png",
}
```

The mark attachment is unconditional on both emails. The student's resume is
added only to the founder notification when they included one.

**Failure handling — three tolerated layers:**

| Layer | Behavior |
| --- | --- |
| `sendResendEmail` returns early | no API key → silent no-op |
| `sendResendEmail` gets non-2xx | logs `resend error <to> <body>`, does not throw |
| `sendSubmissionEmails` wraps each send | try/catch around internal and confirmation independently; logs and continues |

If `RESEND_API_KEY` or `TL_NOTIFY_EMAIL` is missing, the flow logs
`[twin-lanterns] <kind> submission saved to Supabase (no email configured)`
and returns before any network call.

> Any failure is logged, never returned to the client. The DB write is never
> rolled back and the request never fails on email.

**Escaping.** `escapeHtml()` in `templates.ts` is applied to every
interpolated payload value. It also converts `null` / `undefined` / empty
string to an em-dash (`—`), so an empty field renders as a dash rather than
blank.

#### 6.4.1 Partner Emails

`lib/email/partner-emails.ts` mirrors `submission-emails.ts`'s shape exactly
(swallow errors, log, never block the response) and reuses `resend.ts`
(`getEmailConfig`, `sendResendEmail`) and `templates.ts`'s shared helpers
(`COLOR`, `shell`, `brandHeader`, `title`, `escapeHtml`) — no new transport.
Templates live in `lib/email/partner-templates.ts`: `renderPartnerApplicantInternal`,
`renderPartnerApplicantConfirmation`, `renderPartnerAmbassadorInternal`,
`renderPartnerAmbassadorConfirmation`.

| Function | Sends |
| --- | --- |
| `sendPartnerApplicantEmails` | (1) internal notification to `TL_NOTIFY_EMAIL` — `"New Partner applicant (qualified\|unqualified) — {fullName}"`, includes qualified + reasons; always attempted. (2) confirmation to the applicant — `"You're in — Partner"` (qualified) or `"We've got your application — Partner"` (unqualified). |
| `sendPartnerAmbassadorEmails` | (1) internal notification — `"New Partner ambassador — {name}"`. (2) confirmation to the ambassador — `"You're a Partner ambassador — here's your link"`, includes `code` and `referralUrl`. |

Both include the same `MARK_ATTACHMENT` (`icon.png` as `cid:mark`) pattern as
`submission-emails.ts`. If `RESEND_API_KEY` / `TL_NOTIFY_EMAIL` are missing,
Partner logs `[partner] applicant saved (qualified|unqualified) — no email
configured` and returns, same fallback pattern as §6.4's main flow.

### 6.5 Vercel Analytics

`<Analytics />` in `app/layout.tsx`, from `@vercel/analytics/next`.

---

## 7. Environment Variables

**Server-only**, with two deliberate exceptions:

`NEXT_PUBLIC_SUPABASE_URL` is a public fallback URL, and `NEXT_PUBLIC_SITE_URL`
is just the site's own domain — both are intentionally client-visible and
carry no secret. Everything else in this table must never carry a
`NEXT_PUBLIC_` prefix.

| Variable | Used by |
| --- | --- |
| `SUPABASE_URL` | `lib/supabase-server` |
| `NEXT_PUBLIC_SUPABASE_URL` | fallback URL |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS-bypassing key |
| `ADMIN_USERNAME` | `api/admin/login` |
| `ADMIN_PASSWORD` | `api/admin/login` |
| `ADMIN_SESSION_SECRET` | `lib/admin-auth`, `proxy.ts`, `api/admin/*` |
| `DEEPSEEK_PROXY_URL` | `lib/deepseek`, `vibe-search`, `scripts/tag-resumes` |
| `DEEPSEEK_API_KEY_REVERSE_PROXY` | `lib/deepseek`, `vibe-search`, `scripts/tag-resumes` |
| `RESEND_API_KEY` | `lib/email/resend` (optional) |
| `TL_NOTIFY_EMAIL` | `lib/email/resend` |
| `TL_FROM_EMAIL` | `lib/email/resend` (optional) |
| `NEXT_PUBLIC_SITE_URL` | `api/partner/refer` — origin used to build the referral URL; falls back to request headers when unset (optional) |
| `OLD_DATABASE_URL` | `scripts/migrate-lovable` |
| `RESUME_DIR` | `scripts/migrate-resumes` |
| `DEBUG` | `lib/deepseek`, `scripts/tag-resumes`, `scripts/test-deepseek-api` |
| `SYSTEM_PROMPT` | `scripts/test-deepseek-api` (optional override) |

---

## 8. Admin Dashboard

`app/admin/page.tsx` is a **server component** (`dynamic = "force-dynamic"`)
that runs **five queries in parallel** (`Promise.all`):

- all `student_applications` ordered `created_at desc`, with explicit columns
  (notably **excluding `resume_data`** — it's fetched on demand by
  `/api/admin/resume/[id]` so the dashboard stays light even with many resumes
  attached) and nested `candidate_ai_tags`
- all `company_briefs` via `select("*")`, also ordered `created_at desc`
- all `partner_ambassadors`, `partner_applicants_qualified`, and
  `partner_applicants_unqualified`, each via `select("*")`, also ordered
  `created_at desc`

If any query errors, it renders a red error banner naming the failing
query's message (aggregated across all five). On success it hands the rows to
`AdminDashboard.tsx` (client). The page also sets `export const metadata` with
`robots: { index: false, follow: false, googleBot: { index: false, follow: false } }`
on the whole `/admin` subtree — see §11.1.

**Four tabs**

| Tab | Contents |
| --- | --- |
| **Student applications** | Table with `APPLICATION_COLUMNS` (`first_name`, `last_name`, `email`, `school`, `grad_year`, `location`, `hours_per_week`, `start_timing`, `created_at`) + 4 AI columns (`vibe_tags`, `soft_skills`, `hard_skills`, `ai_summary`) + resume download link |
| **Company briefs** | Table with `BRIEF_COLUMNS` (`company`, `contact_name`, `contact_email`, `title`, `stage`, `city`, `timeline`, `created_at`) |
| **Partner** (`{qualified.length + unqualified.length}`) | `<PartnerSection />` — three sub-tabs, see below |
| **Search** | `<VibeSearch />` |

Tab buttons display live counts for applications, briefs, and Partner.
`AdminDashboard.tsx`'s tab state type is
`"applications" | "briefs" | "partner" | "vibe"`.

**Partner tab** (`PartnerSection` component)

Three sub-tabs — Qualified, Unqualified, Ambassadors
(`PartnerSubTab = "qualified" | "unqualified" | "ambassadors"`) — plus a
"Referred by" dropdown filter (populated from all ambassadors, applies to the
Qualified/Unqualified sub-tabs only) with a "Showing referrals from X · N
qualified · M unqualified" banner and a "Clear filter" button when active.

- `buildAmbassadorMap(ambassadors)` — `code → ambassador row` Map
- `withReferrerDisplay(rows, map)` — adds `referred_by_display`:
  `"{ambassador.name} ({code})"`, or the bare code if no match, or `"—"` if
  the row has no `referred_by_code`
- `withReferralCounts(ambassadors, qualified, unqualified)` — adds
  `qualified_referrals` / `unqualified_referrals` counts (client-side
  `.filter().length` per ambassador code), functioning as an implicit
  leaderboard
- Column sets: `PARTNER_APPLICANT_COLUMNS` (`first_name`, `last_name`, `email`,
  `phone`, `location`, `device_os`, `device_model`, `task_interests`,
  `referred_by_display`, `created_at`); `PARTNER_UNQUALIFIED_COLUMNS` — same,
  plus `disqualified_reasons`; `PARTNER_AMBASSADOR_COLUMNS` (`name`, `email`,
  `code`, `qualified_referrals`, `unqualified_referrals`, `created_at`)
- All three sub-tabs render through the **same shared `Table` component**
  documented below (`showResumeColumn` / `showAIColumns` both default
  `false`) — free-text search, the "Show short answers" raw-payload
  expansion, and the legacy/new schema badge all apply to Partner rows for
  free; no new table code was needed.

**Table features** (internal to `AdminDashboard.tsx`'s `Table` component)

- Client-side free-text search: case-insensitive substring across
  `JSON.stringify(row).toLowerCase()`
- **"Show short answers"** toggle: dynamically derives extra columns from each
  row's `raw_payload`, filtering out system/meta fields and fields already in
  fixed columns via `SHORT_ANSWER_EXCLUDE` (covers both new and legacy
  naming: `first_name`/`firstName`, `grad_year`/`gradYear`/`graduation_year`,
  `hours_per_week`/`hours_available`/`hours`, `start_timing`/`startWeeks`/
  `start_date`, plus `resume*`, `phone`, `email`, `school`/`university`,
  `location`, `candidate_ai_tags`, `raw_payload`, and meta keys `id`,
  `created_at`, `updated_at`, `verification_token`, `consent_given`,
  `email_verified`, `application_status`, `source`, `migrated_from`,
  `original`)
- **Dual schema support:** `raw_payload` may be flat (current) or wrapped as
  `{ original: {...}, migrated_from: "lovable_students" }` (legacy). A
  `SchemaBadge` marks each derived column as `new` (emerald) / `legacy`
  (amber) / `both` (neutral)
- **Expandable row** via a "View raw" / "Hide" button — pretty-printed
  payload where URLs become links, ISO timestamps get localized +
  monospaced-ISO annotation, booleans render as Yes/No pills, arrays as
  chips or nested item cards, or a raw-JSON toggle
- **Row count footer** — "X of Y rows"
- `formatCell` renders `null`/`undefined` as "—", ISO timestamps via
  `toLocaleString()`, arrays joined by comma, and objects as truncated JSON

**VibeSearch UI**

- Text input + "Semantic Search" button; Enter in the input also submits
- 4 example prompts for quick fill:
  `"Scrappy self-starter who's shipped side projects"`,
  `"Data-driven analyst with Python and SQL"`,
  `"Designer with a strong visual portfolio"`,
  `"Backend engineer who's worked in fintech"`
- Manual SSE parsing, **with a JSON fallback path**: the client checks
  `Content-Type` on the response; `text/event-stream` → SSE parse; anything
  else → `response.json()`. If the SSE stream closes without ever emitting a
  `result` event, the client throws
  `"Search stream ended without a result."`
- Stepper shows progress across
  `initializing → filtering → analyzing → ranking → complete`
- A gradient progress bar is driven by a `progressPct` lookup:
  initializing 10, filtering 35, analyzing 65, ranking 90, complete 100
- Two views: **Shortlist** (stage 1) and **Final rankings** (stage 3), with a
  400ms opacity + translate-y cross-fade triggered by `handleViewTransition`
- Empty state: "No matching candidates" card
- Error state: red banner with a "Retry" button that re-invokes the search
- When the shortlist is empty but the user has searched, the client shows the
  empty state. When shortlist is null, the view falls back to `results`
  (`viewMode === "shortlist" ? shortlist || results || [] : results || []`).

**CandidateCard shows**

- Rank badge (amber gradient / neutral gradient / orange gradient for top 3 in
  final mode; plain ink otherwise)
- "Shortlisted" pill when rendering in final mode without a `match_score`
- Contact line: email · school · location
- Vibe tag chips (`VibeTags`, cycles through 8 background/ring color pairs)
- `HighlightedSnippet` — matched keywords wrapped in `<mark>` using a
  case-insensitive regex built from the keyword list
- `MatchedKeywords` — chips per keyword with a source dot row
  (`tags` purple / `summary` sky / `profile` amber), plus up to 3 tag excerpts
  and 3 raw-payload excerpts below
- "Why this match" panel (`match_reason`, stripped)
- Deep analysis (`deep_analysis`, stripped)
- `ScoreRing` (SVG donut; green ≥ 80, lime ≥ 60, amber ≥ 40, red below)
- "Resume ↗" link to `/api/admin/resume/{id}`

**Logout:** `POST /api/admin/logout` then `router.push("/admin/login")` +
`router.refresh()`.

---

## 9. Frontend Design System

### 9.1 Form Primitives (`components/form.tsx`)

All exported from one file. Used by `ApplyFlow.tsx` and `HireFlow.tsx`, and
by the Partner wizards (`PartnerApplyFlow.tsx` uses `Pills` and `ChoiceCards`;
`AmbassadorFlow.tsx` uses `Field`/`Input` only, being a single name+email
step).

| Export | Description |
| --- | --- |
| `ease` | `[0.22, 1, 0.36, 1]` — site-wide cubic bezier |
| `Field` | Label + hint wrapper around any control |
| `Input`, `Textarea`, `Select` | Styled HTML controls sharing a base class |
| `Pills` | Single- or multi-select pill group; `aria-pressed` set |
| `ChoiceCards` | Grid of tappable cards with a Shape icon that rotates 90° on group-hover |
| `Slider` | Range input with `format(value)` display + optional ticks; fills via `backgroundSize` |
| `RankList` / `RankItem` | Drag-to-reorder list (Motion `Reorder` + `useDragControls`) |
| `DropZone` / `Upload` | File drop zone; 4 MB cap; accepts `.pdf,.doc,.docx,.png,.jpg,.jpeg,.txt`; reads via FileReader, stores only the base64 tail after splitting at the data-URI comma |
| `StepHeader` | "Step X of Y", title, blurb |
| `StepRail` | Vertical step navigation; steps up to and **including** the current one are clickable, future steps are `disabled` |
| `Progress` | 2px top bar (`h-0.5`); `width = Math.round(value * 100)%` |
| `NavButtons` | Back (button) + Next (submit); loading label is `"Sending…"` (ellipsis char, not three dots) |

### 9.2 Visual System

| Module | Notes |
| --- | --- |
| **Shapes** (`components/Shapes.tsx`) | Six shapes total, but only two are procedural. `clover`, `hex`, `arch`, `squircle` are hardcoded path strings; `scallop` (14-point smooth ring) and `burst` (12-point sharp star) are generated by `ring(points, rOuter, rInner, sharp)`. The exported `shapePaths` record is consumed by `Landing.tsx` for morphing SVG decorations (`<path d={shapePaths[kind]} className="blob-morph" />`) and by the `Shape` component itself. `Shape` accepts `rotate`, `float`, and `delay` props. |
| **Mark** (`components/Mark.tsx`) | The Twin Lanterns logo: two angled panels (opacity 0.92) plus a flickering spark filled with `--color-flame` (overridable via the `spark` prop). |
| **Reveal** (`components/Reveal.tsx`) | Single motion primitive: fade up 12px, once, `amount: 0.25`, duration 0.5s. Accepts `as="div" \| "li" \| "section"`. Used by every Landing section **except Hero** (which uses inline `motion.div` for the typewriter and CSS transitions for the shapes). Both `ApplyFlow` and `HireFlow` use their own inline `motion.div` for their Success screens. Re-declares the ease value inline rather than importing `ease` from `form.tsx`. |
| **Nav** (`components/Nav.tsx`) | Fixed floating pill, centered. After 40px of scroll it collapses to `w-max`; the brand text collapses via `text-[0px]` + `max-w-0` + `opacity-0`; CTAs move to a top-right corner cluster. The mobile hamburger appears as a plain conditional render (`{open && <div>...}`) — no AnimatePresence, no slide animation. The `#team` link is commented out in the `links` array. **CTA order/state (as of `a89925a`):** "I'm hiring" (`/companies`, bordered pill) → "Apply" (`/apply`, bordered pill — demoted from its previous filled-pill slot) → **"Earn Now"** (`/partner/info`, filled `bg-ink → hover:bg-flame` pill — now the nav's visually-primary CTA, replacing "Apply" in that slot). Mobile menu has 4 rows: How it works, Roles, FAQ, then a highlighted (`bg-lime font-semibold`) "Earn Now" → `/partner/info` row, then "I'm hiring" → `/companies`. |
| **Footer** (`components/Footer.tsx`) | Server component (no `"use client"`). Three link columns (Students / Companies / Company) plus a giant "Twin Lanterns" wordmark at `text-[13.3vw]`. The `#team` link is commented out in the Company column. Copyright year is dynamic. |

- **Typography utilities:** `display`, `label`, `eyebrow`
- **Motion:** all animations import from `motion/react`. `AnimatePresence` is
  used in the two wizard flows to cross-fade between steps.

### 9.3 Homepage Sections (`components/Landing.tsx`)

Rendered in order:

```
Hero → Stats → Partner → Split → Process → Statement → Roles → Faq → Cta
```

**Hero**
Typewriter cycling between two phrases (both use an asterisk in `sh*tty`):

- "Stop hiring sh*tty interns."  — accent in `text-flame`
- "Stop working for sh*tty companies."  — accent in `text-sky`

Mechanism:

- Types at 52ms/char
- Holds the completed line for 2400ms
- Erases at 22ms/char
- Pauses 280ms, then swaps to the other phrase
- Honors `prefers-reduced-motion` by returning early from the effect — the
  first phrase renders in full, statically
- `min-h-[2em]` on the `<h1>` prevents layout shift
- A blinking caret is rendered inline via the `caret` class

Six floating Shapes surround the hero on `lg+` (`clover`, `arch`, `hex`,
`scallop`, `burst`, `squircle`). Each shape rotates by `phase * ±25°` with a
900ms ease — the sign alternates by shape index (`i % 2 === 0 ? + : -`), so
adjacent shapes spin in opposite directions on each phase step. Below `lg`,
a horizontal row of 5 shapes (no `arch`) is shown instead.

**Other sections**

- **Stats** — 3 stat cards (`48 hrs`, `$0`, `100%`)
- **Partner** (`id="partner"`) — full-bleed `bg-ink` two-column promo for the
  Partner product (§4.6–4.7). Left: eyebrow ("Part Time Internship Program —
  Now Available"), H2 "Get paid to film how real work actually gets done.",
  copy, 3 links — "Start earning" (`/partner/apply`; copy was "Apply to film"
  before a later one-line fix in `59b05a7`), "Become an ambassador"
  (`/partner/refer`), "More info" (`/partner/info`, `bg-lime`) — plus a 3-stat
  `<dl>` (`partnerStats`: "Paid per clip", "Any modern phone", "No
  experience"). Right: a "How it works" card with 3 numbered `partnerSteps`
  (Apply → Get set up → Get paid) and a `partnerPoints` bullet list. Uses the
  same floating-Shape decoration pattern as Hero (`arch`/`burst`/`hex`/
  `clover`, `lg:` only).

  > **Copy inconsistency:** this section describes Partner's pay model as "Paid
  > per clip, not by the hour," while `/partner/info`'s hero stat says
  > **"$10/hr for approved filming time."** Two different descriptions of the
  > same pay model live on two pages of the same funnel — reconcile before
  > treating either as authoritative.
- **Split** — two panels (`id="two-sides"`): a flame-toned "For students"
  card and an ink-toned "For companies" card
- **Process** — 5 numbered steps (`id="how"`) with rotating Shape icons
- **Statement** — quote card on `bg-shell` with floating hex + clover
- **Roles** — 4 role groups (`id="roles"`) with colored Shape headers
- **Faq** — 6 collapsible Q&As (`id="faq"`), first one open by default
  (`useState<number | null>(0)`)
- **Cta** — "Two lanterns. One bridge." headline with floating squircle +
  burst decorations

**Dead code:** `Landing.tsx` still contains a `founders` array and a
`BlobPhoto` component. Neither is rendered; both are leftovers from a removed
Founders section.

### 9.4 Wizard Validation & Step Transitions

All four wizards — `ApplyFlow`, `HireFlow`, `PartnerApplyFlow`, `AmbassadorFlow`
— gate the "Continue" / "Submit" button on a per-step validity check. When a
step is invalid, `NavButtons.nextDisabled` is `true` and the button is inert.

**ApplyFlow validation**

| Step | Condition |
| --- | --- |
| 0 — Interests | `interests.length > 0` |
| 1 — Availability | `setup` is truthy |
| 2 — Priorities | always valid (the rank list is pre-seeded with defaults, so it can't be empty) |
| 3 — About you | `firstName.trim().length > 1` AND `email` matches `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` AND `level` set AND `school.trim().length > 1` |
| 4 — Finish | `built.trim().length > 19` |

**HireFlow validation**

| Step | Condition |
| --- | --- |
| 0 — Your company | `company.trim().length > 1` AND `name.trim().length > 1` AND `email` matches the same regex AND `stage` set |
| 1 — The role | `fn` set AND `title.trim().length > 1` AND `outcome.trim().length > 19` |
| 2 — Logistics | `setup` AND `commitment` AND `timeline` all set |
| 3 — Review | always valid |

**PartnerApplyFlow validation** (`STEPS = ["About you", "Eligibility", "Tasks", "Finish"]`)

| Step | Condition |
| --- | --- |
| 0 — About you | `firstName.trim().length > 1` AND `email` matches the same regex |
| 1 — Eligibility | `deviceReady && filmingAck !== "" && consent !== ""`, where `deviceReady = deviceOsLabel === "Neither" \|\| ((iOS \|\| Android) && Boolean(deviceModel))`. A live, non-blocking eligibility preview renders inline once all step-1 fields are filled but `evaluatePartnerEligibility` (§4.6) would return unqualified — the user can still submit. |
| 2 — Tasks | `taskInterests.length > 0` (`ChoiceCards` multi-select over `PARTNER_TASK_CATEGORIES`, 15 categories, cycling through 6 Shape kinds/colors) |
| 3 — Finish | always valid — review only |

**AmbassadorFlow validation** (single step)

| Step | Condition |
| --- | --- |
| 0 — only step | `name.trim().length > 1` AND `email` matches the same regex |

On success, `AmbassadorFlow` shows a referral link
(`${origin}/partner/apply?ref={code}`) with a copy-to-clipboard button
(`navigator.clipboard.writeText`, 1500ms "Copied" state) instead of advancing
to another step.

**Step transitions**

All four wizards:

- Scroll to top on step change: `window.scrollTo({ top: 0, behavior: "smooth" })`
- Cross-fade steps with `AnimatePresence mode="wait"` and a `motion.div` keyed on `step`
  - ApplyFlow: 0.35s, `y` 14 → 0 → -10
  - HireFlow: 0.4s, `y` 18 → 0 → -12
- Use the shared `ease` cubic bezier from `components/form.tsx`

**Draft persistence.** `PartnerApplyFlow` uses `localStorage` key
`tl-partner-draft-v1` (cleared on successful submit) — a third distinct key
alongside ApplyFlow's `tl-student-draft-v2` and HireFlow's `tl-company-draft`
(§4.2). It separately persists any captured referral code to
`tl-partner-ref-code` (§4.6). `AmbassadorFlow` has no draft persistence — it's a
single step.

### 9.5 Global CSS (`app/globals.css`)

Tailwind v4 entry (`@import "tailwindcss"`) plus a `@theme` block that defines
the site's palette and font stack as CSS custom properties:

| Var | Value |
| --- | --- |
| `--color-ink` | `#0d0d0d` |
| `--color-muted` | `#6f6f6f` |
| `--color-line` | `#e6e6e6` |
| `--color-shell` | `#f5f5f3` |
| `--color-flame` | `#ff5a18` |
| `--color-lemon` | `#f4e04d` |
| `--color-sky` | `#7ca7f5` |
| `--color-lilac` | `#c3a6f7` |
| `--color-lime` | `#b6e75c` |
| `--color-blush` | `#f7b6dd` |
| `--font-sans` | `var(--font-dm), "Google Sans", ui-sans-serif, system-ui, sans-serif` |

**Utilities:**

- `.display` — geometric tight display type (`-0.042em`, line-height 0.94)
- `.label` — 0.6875rem uppercase with `0.14em` tracking, muted color
- `.tl-range` — custom-styled range input used by `Slider`
- `.no-bar` — hidden scrollbar utility
- `.float` — 7s ease-in-out infinite vertical drift with a `--r` variable
  rotation baked in
- `.blob-morph` — 30s rotating/scaling loop used by the founder-photo blobs
- `.caret` — 1.05s step-animated typing caret
- `.marquee-track` — 42s linear infinite translate (not currently rendered
  by any component we saw)
- `.animate-progress` — 3s ease-in-out infinite width animation (0% → 70% →
  100%; not currently rendered)
- `.animate-slide-in` — 0.7s fade + 20px rise; used by
  `AdminDashboard.tsx`'s `CandidateCard`
- `.animate-reorder` — 0.7s scale pulse (not currently rendered)
- `.animate-fade-out` — 0.7s fade + 0.95 scale (not currently rendered)

**Global defaults:**

- `:root { color-scheme: light }`
- `html { -webkit-font-smoothing: antialiased; scroll-behavior: smooth }`
- `body { background: #ffffff; color: var(--color-ink); overflow-x: clip }`
- `::selection` — ink background, white text
- `:where(a, button, input, select, textarea, [tabindex]):focus-visible` —
  2px ink outline, 3px offset
- `@media (prefers-reduced-motion: reduce)` — caps animation and transition
  durations to `0.01ms` globally. This is why `Hero`'s early-return check is
  one of two safeguards, not the only one.

---

## 10. Scripts

All run through `tsx`. Scripts that write to Supabase honor a `--commit` flag;
running with no flag is a **dry run**.

### 10.1 `scripts/migrate-lovable.ts`

One-time migration from the old Lovable-generated `public.students` table to
`student_applications`. Requires a Postgres instance with the Lovable backup
data restored locally.

```bash
OLD_DATABASE_URL="postgres://..." npx tsx scripts/migrate-lovable.ts
OLD_DATABASE_URL="postgres://..." npx tsx scripts/migrate-lovable.ts --commit
```

**Field mapping**

| Old | New |
| --- | --- |
| `university` | `school` |
| `graduation_year` | `grad_year` |
| `hours_available` | `hours_per_week` |
| `start_date` | `start_timing` |
| `work_preference` | `work_setup` |
| `experience_summary` | `built` |
| `categories` | `interests` (with `?? []`) |
| `industry_interests`, `startup_stage_preference` | `priorities` (as `[a, b].filter(Boolean)`) |
| `phone` | `phone` |
| `linkedin_url`, `portfolio_url`, `website_url` | `links` (newline-joined, or `null`) |
| `resume_url` | `resume_name` — last URL segment, or `null` |
| `created_at` | `created_at` |
| `id` | `id` (preserved) |

`resume_data` is set to `null` — resumes are backfilled by 10.2.

Preserves `id` and upserts on conflict `id` — re-running after a partial
commit is idempotent.

Writes the legacy schema shape to `raw_payload`:

```json
{ "migrated_from": "lovable_students", "original": "<row>" }
```

This is what `AdminDashboard` detects to render the **"legacy"** badge.

> The header comment notes that only `students` had real data in the Lovable
> backup — `startups` and `roles` are skipped entirely.
>
> The import path is `../lib/supabase-server` (relative), not `@/` — the
> file header flags this.

### 10.2 `scripts/migrate-resumes.ts`

Backfills `resume_data` (base64) on rows already migrated, by matching local
files (renamed to UUIDs by Lovable) against `resume_name`.

```bash
npx tsx scripts/migrate-resumes.ts
npx tsx scripts/migrate-resumes.ts --commit
RESUME_DIR="C:\path\to\files" npx tsx scripts/migrate-resumes.ts
```

- Default folder: `./lovable-resumes`
- Only touches rows where `resume_data IS NULL` **and** `resume_name IS NOT
  NULL` — safe to re-run
- Filenames are normalized (lowercase, non-alnum stripped) before matching;
  both the file on disk and `resume_name` have their extension removed via
  `path.parse(...).name` first
- Writes base64 via `Buffer.from(...).toString("base64")`

### 10.3 `scripts/tag-resumes.ts`

Runs every student application through the DeepSeek Playwright proxy and
writes to `candidate_ai_tags`. Uses both resume text (via `pdfjs-dist` /
`mammoth` / raw txt) and `raw_payload`.

```bash
npx tsx --env-file=.env.local scripts/tag-resumes.ts
npx tsx --env-file=.env.local scripts/tag-resumes.ts --commit
```

- Requires `DEEPSEEK_PROXY_URL` and `DEEPSEEK_API_KEY_REVERSE_PROXY` (exits
  at import time if either is missing)
- Model: `deepseek-chat`, `temperature: 0.1`, `max_tokens: 2500`
- Idempotent per `(student_id, prompt_version)` — skips rows already tagged at
  the current `prompt_version`, which is **`"v5"`**. Bump this constant to
  force a re-tag.
- 200ms delay between calls
- **Dry-run mode does not call DeepSeek** — it prints a preview of the
  resume/payload and a "Would call DeepSeek and upsert..." line, then moves on
- Records: `model_used`, `prompt_version`, `source_file_name`,
  `ai_processed_at`, `raw_ai_response` (the full `AITags` object, including
  the `evidence` sub-object)

**System prompt summary** (see the file for the full text):

- "Evidence-based candidate data extractor"
- Never speculate, never infer personality, never use marketing language
  (explicit banned-word list: scrappy, grinder, rockstar, ninja, guru,
  passionate, dynamic, driven, go-getter, self-starter, visionary,
  world-class, 10x, A-player, hustler, thought leader, disruptor, unicorn)
- Specific over vague ("PostgreSQL" not "databases"; never upgrade "Python"
  to "Python expert")
- Empty categories allowed — never pad
- Length budget: 5–15 hard skills, 3–8 soft skills, 3–8 work-style tags
- `soft_skills` must be ≤ 6 words, verb-first, no metrics
- `vibe_tags` must come from a fixed vocabulary (Environment / Setup /
  Cadence / Scope / Function mix) — same vocabulary the vibe-search route
  uses for `tag_matches`

**Output schema:**

```json
{
  "hard_skills": ["..."],
  "soft_skills": ["..."],
  "vibe_tags": ["..."],
  "one_line_summary": "...",
  "evidence": {
    "hard_skills": { "<tag>": "<exact source phrase>" },
    "soft_skills": { "<tag>": "<exact source phrase>" },
    "vibe_tags":   { "<tag>": "<exact source phrase>" }
  }
}
```

**JSON recovery:** `extractJson` strips `<think>` blocks, strips markdown
fences, slices to the outermost `{...}`, then runs **`jsonrepair()`** — this
is why the script can absorb unquoted keys, trailing commas, and raw newlines
inside strings.

> **Vocabulary sync:** the `vibe_tags` vocabulary in this script's
> `buildUserPrompt()` **must stay in sync** with the vocabulary in
> `app/api/admin/vibe-search/route.ts`'s `classifyQueryWithAI()` prompt. If
> you edit one, edit the other and bump `PROMPT_VERSION` so existing rows
> get re-tagged.

### 10.4 `scripts/test-deepseek-api.ts`

Interactive CLI chat against the DeepSeek proxy, streaming tokens to stdout.
Handles `"replace"` events by clearing the current terminal line via ANSI
escape `\r\x1b[K` and reprinting the full content.

```bash
npx tsx --env-file=.env.local scripts/test-deepseek-api.ts
DEBUG=true npx tsx --env-file=.env.local scripts/test-deepseek-api.ts
SYSTEM_PROMPT="You are a pirate." npx tsx --env-file=.env.local scripts/test-deepseek-api.ts
```

- Type `exit`, `quit`, or `q` to end the session
- `SYSTEM_PROMPT` env var overrides the default system message
- `DEBUG=true` prints each event to stderr as it arrives
- On stream error, the user's message is popped from history to keep the
  conversation consistent
- On empty response, the user's message is also popped, with warnings
  suggesting DEBUG mode

> The file header comment says `// scripts/chat.ts` — stale; the file is
> `scripts/test-deepseek-api.ts`.

### 10.5 `scripts/test-partner-eligibility.ts`

Pure-logic smoke test for `evaluatePartnerEligibility` (§4.6) — no Supabase, no
network calls, no `--commit` flag.

```bash
npx tsx scripts/test-partner-eligibility.ts
```

Runs 7 hardcoded cases (qualifying device + ack + consent; unsupported
device; excluded model; missing filming ack; missing consent; "Neither" OS;
etc.) against `evaluatePartnerEligibility` and asserts the expected
`qualified`/`reasons` shape for each. Exits `1` on any failed case, so it can
be wired into CI as a cheap regression check whenever the device lists or
reason codes in `partner-eligibility.ts` change.

---

## 11. Deployment & SEO

### 11.1 SEO & Metadata

| File | Purpose |
| --- | --- |
| `app/robots.ts` | Generates `/robots.txt`: `userAgent: '*'`, `allow: '/'`, `disallow: '/admin/'`, `sitemap: 'https://twinlanterns.co/sitemap.xml'` |
| `app/sitemap.ts` | Generates `/sitemap.xml`. Enumerates exactly three static routes — `''` (priority 1.0), `/apply`, `/companies` (priority 0.8 each) — `changeFrequency: 'weekly'`, `lastModified: new Date()` (recomputed on every request, not cached). **Does not include any `/partner/*` route** — a gap, not an intentional exclusion; keep in mind if Partner pages need indexing. |
| `app/layout.tsx` | `alternates: { canonical: "/" }`; `verification.other["msvalidate.01"]` (Bing site-verification token, paired with `public/BingSiteAuth.xml`); `icons.icon` includes `/favicon.svg` alongside `.ico` and `icon.png`; a `jsonLd` constant — an Organization + WebSite `@graph` (name, legalName, alternateName, logo, description, `foundingDate: "2026"`, `sameAs` [LinkedIn, Instagram], `contactPoint` [hello@twinlanterns.co], LA address, `numberOfEmployees: 11`, and a WebSite entry with a `SearchAction` targeting `/search?q=...`) — injected via `<script type="application/ld+json">` at the end of `<body>`. |

> **No `/search` route exists.** The JSON-LD `SearchAction` `potentialAction` is
> speculative/unused — there's nothing at `/search` to receive that query
> string. Either build the route or drop the `SearchAction` before it's taken
> at face value by a crawler or a future contributor.

`app/admin/page.tsx` additionally sets `export const metadata` with
`robots: { index: false, follow: false, googleBot: { index: false, follow: false } }`
on the whole `/admin` subtree — belt-and-suspenders with `robots.ts`'s
`disallow: '/admin/'`.

### 11.2 Hosting & Runtime

| Item | Value |
| --- | --- |
| **Platform** | Vercel |
| **Production URL** | https://twinlanterns.co(`metadataBase` in `app/layout.tsx`) |

**Runtime**
`proxy.ts` runs on Vercel's Edge runtime. The SSE route
`/api/admin/vibe-search` sets `X-Accel-Buffering: no` to defeat proxy buffering
on Vercel.

**Cookie security**
`ADMIN_COOKIE_NAME` is only `secure` when `NODE_ENV === "production"`.

**Analytics**
Vercel Analytics is injected in the root layout.

**Env vars**
Must be set in Vercel project settings — the `lib/supabase-server.ts` error
message hints at `vercel env pull .env.local` for the Supabase–Vercel
integration.

---

## 12. Cross-Cutting Conventions

**Server-only modules**
`lib/supabase-server.ts` is tagged as server-only in its header comment. Its
service-role key bypasses RLS; it must never be imported by a client component.

**Prompt-injection hardening**
Applies to **vibe-search only**. All three stages wrap untrusted content in
XML-style tags (`<search_query>`, `<candidate_data>`,
`<candidate_analyses>`) and instruct the model to treat it as data.
`scripts/tag-resumes.ts` does **not** wrap its inputs in XML tags — it uses
markdown headers (`## RESUME` / `## APPLICATION DATA`) and relies on a
system prompt that forbids speculation, inference, and marketing language
instead of a "treat as data" instruction. Don't assume the tagger has the
same guardrails as vibe-search.

**Reasoning tags**
`<think>...</think>` blocks are stripped in the vibe-search route
(`callDeepSeekProxy` and `parseAIResponse`) and, per its own helper, on the
client side of the admin dashboard (`AdminDashboard.tsx` `stripThinking`).
`lib/deepseek.ts` does **not** strip — the streaming helper yields raw
content and the consumer is responsible for removing reasoning blocks.

**Idempotency**
Migration scripts preserve IDs and upsert on the natural key. The tagging script
skips already-tagged rows, upserting on `(student_id, prompt_version)`.

Vibe search *reads* `candidate_ai_tags`; it never writes or caches. The
`(student_id, prompt_version)` unique constraint belongs to the tagging
script's upsert, not to the search path.

**Two-schema awareness**
The admin dashboard treats `raw_payload` as either the current flat shape or the
Lovable legacy wrapper and renders a matching badge. New code should keep
producing the flat shape.

**Non-blocking side effects**
Email is best-effort. `lib/email/submission-emails.ts` and `lib/email/partner-emails.ts` both swallow all failures and never block the DB write or fail the request.

**Single source of truth for the session cookie**
`ADMIN_COOKIE_NAME` and `ADMIN_SESSION_MAX_AGE` live in `lib/admin-auth.ts`.
Every call site — `proxy.ts`, `login/route.ts`, `logout/route.ts`,
`resume/[id]/route.ts`, `vibe-search/route.ts` — imports them. Don't inline the
string or the literal `60 * 60 * 24 * 7` again.

**Formatting**
Prettier `3.9.6` is pinned exactly (no caret). There is **no `format`
script** in `package.json` — run `npx prettier --write .` manually, or add
a `"format": "prettier --write ."` script if you want the convenience.
`.prettierignore` currently contains only `build` and `coverage`;
`node_modules` and `.next` are ignored by Prettier's built-in defaults, but
`package-lock.json` and `public` are **not** ignored.

**Submit route is an orchestrator**
`app/api/submit/route.ts` does exactly four things: parse, persist, notify,
respond. Column mapping, payload validation, email transport, and email HTML
live under `lib/submissions/*` and `lib/email/*`. New fields go into
`lib/submissions/types.ts` + `persistence.ts`, not the route.

> **Partner doesn't follow this convention.** `/api/partner/submit` and
> `/api/partner/refer` (§4.6–4.7) validate and normalize their request bodies
> inline in the route file — there's no `partner-parse.ts` mirroring
> `lib/submissions/parse.ts`. Persistence and email are still cleanly split
> out (`partner-persistence.ts`, `partner-emails.ts`), so it's only the parse step
> that diverges. Don't assume a shared parse module exists for Partner when
> extending it — either add one to match the original convention, or treat
> the divergence as deliberate and keep it consistent within Partner's own
> routes.

**Partner has its own error-class hierarchy**
`PartnerConfigError` / `PartnerSaveError` (`lib/submissions/partner-persistence.ts`)
mirror `SubmissionConfigError` / `SubmissionSaveError` in name and in the
500/502 status mapping, but are a **separate class hierarchy** — a `catch` on
one won't match the other. `/api/partner/submit` also uniquely branches its
error message by `NODE_ENV` (raw `err.message` in dev, a generic string in
prod) — the original `/api/submit` route always returns the same generic
string regardless of environment (§4.1). Don't assume the two submission
paths share error-handling behavior.

**HTML escaping in emails**
`lib/email/templates.ts` runs every interpolated payload value through
`escapeHtml()` before it hits the email body. Don't interpolate raw payload
values into HTML anywhere else.