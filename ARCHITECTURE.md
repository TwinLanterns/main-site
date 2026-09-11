# Twin Lanterns — Architecture

> **Student talent, matched by hand.**
>
> Twin Lanterns is a two-sided marketplace that connects high school and college
> students with startups and small companies looking for part-time or intern
> talent. Students apply once, companies submit a role brief, and the two founders
> personally screen and match. This repo is the marketing site, the application
> funnels for both sides, and an admin dashboard for reading submissions and
> running AI-assisted candidate search.

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
11. [Deployment](#11-deployment)
12. [Cross-Cutting Conventions](#12-cross-cutting-conventions)
13. [Known Gaps / Follow-Ups](#13-known-gaps--follow-ups)

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
│  Apply / Hire    │   │    (/api/)          │   │    (/admin/)       │
│  (React client)  │   │    Node runtime     │   │    React client    │
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
                      │            │  Groq API (tagging)    │
                      │            │  Resend (email)        │
                      │            │  Vercel Analytics      │
                      │            └────────────────────────┘
                      ▼
        student_applications
        company_briefs
        candidate_ai_tags
```

Two user-facing funnels feed the same Supabase tables. An admin surface reads from
them, runs AI semantic search over tagged candidates, and can stream resumes back
to the browser.

`proxy.ts` (Next.js 16's renamed `middleware.ts`) sits in front of `/admin/*` and
the two protected admin API routes, verifying the HMAC session cookie before any
of them run.

---

## 2. Tech Stack

| Layer | Choice |
| --- | --- |
| **Framework** | Next.js 16 (App Router, React 19) |
| **Language** | TypeScript (strict) |
| **Styling** | Tailwind CSS v4 + custom CSS vars (`ink`, `line`, `flame`, `sky`, `lemon`, `lilac`, `lime`, `blush`, `shell`, `muted`) |
| **Fonts** | DM Sans via `next/font/google` → CSS var `--font-dm` |
| **Animations** | Motion (`motion/react`, Framer Motion v11+) |
| **Database** | Supabase (Postgres, service-role client) |
| **AI (tagging)** | Groq SDK — `openai/gpt-oss-120b` for resume tagging |
| **AI (search)** | DeepSeek via a self-hosted Playwright reverse proxy |
| **Parsing** | `pdfjs-dist`, `mammoth` (docx), `pdf-parse` |
| **Email** | Resend (optional — non-blocking) |
| **Analytics** | Vercel Analytics |
| **Deployment** | Vercel |
| **Scripts runner** | `tsx` |
| **Formatting** | Prettier `3.9.6` (pinned, `--save-exact`) |
| **Legacy DB bridge** | `pg` (Lovable backup restore) |

---

## 3. Directory Structure

```
.
├── app/
│   ├── layout.tsx                  Root layout: DM Sans, Nav, Footer, Analytics
│   ├── page.tsx                    "/" → <Landing />
│   ├── globals.css                 Tailwind v4 entry + CSS vars
│   │
│   ├── apply/
│   │   ├── page.tsx                "/apply" wrapper
│   │   └── ApplyFlow.tsx           5-step student wizard (client)
│   │
│   ├── companies/
│   │   ├── page.tsx                "/companies" wrapper
│   │   └── HireFlow.tsx            4-step company wizard (client)
│   │
│   ├── admin/
│   │   ├── page.tsx                Server component, fetches rows for dashboard
│   │   ├── AdminDashboard.tsx      Client dashboard + VibeSearch
│   │   └── login/
│   │       └── page.tsx            Client login (Suspense-wrapped form;
│   │                               honors ?from= with /admin allowlist)
│   │
│   └── api/
│       ├── submit/route.ts         POST — student + company submissions
│       └── admin/
│           ├── login/route.ts      POST — verify creds, set cookie
│           ├── logout/route.ts     POST — clear cookie
│           ├── resume/[id]/route.ts GET — download resume (auth)
│           └── vibe-search/route.ts POST — SSE semantic candidate search
│
├── components/
│   ├── form.tsx                    Design system: Field, Input, Pills,
│   │                               ChoiceCards, Slider, RankList, DropZone,
│   │                               StepHeader, StepRail, Progress, NavButtons, ease
│   ├── Landing.tsx                 Homepage composed of internal sections
│   ├── Nav.tsx                     Floating nav pill with scroll-collapse
│   ├── Footer.tsx                  Server component with brand wordmark
│   ├── Mark.tsx                    Twin Lanterns logo (two panels + spark)
│   ├── Reveal.tsx                  Single whileInView fade-up primitive
│   └── Shapes.tsx                  6 procedural SVG shapes + shapePaths
│
├── lib/
│   ├── supabase-server.ts          Service-role Supabase client factory
│   ├── admin-auth.ts               HMAC-signed cookie sessions (Web Crypto)
│   │                               + ADMIN_COOKIE_NAME / ADMIN_SESSION_MAX_AGE
│   └── deepseek.ts                 Streaming DeepSeek proxy client (SSE)
│
├── scripts/
│   ├── migrate-lovable.ts          Lovable students → student_applications
│   ├── migrate-resumes.ts          Backfill resume_data from local files
│   ├── tag-resumes.ts              Groq tagging → candidate_ai_tags
│   └── test-deepseek-api.ts        Interactive CLI chat against the proxy
│
├── public/
│   ├── favicon.ico, icon.png       icon.png also serves as the email logo
│   ├── mark.svg                    Logo source (used by components/Mark.tsx)
│   ├── file.svg, globe.svg,        Next.js boilerplate — dead
│   │   next.svg, vercel.svg,
│   │   window.svg
│   └── team/{carlos,cameron}.png   Orphaned — Founders section removed
│
├── proxy.ts                        Next.js 16 middleware — gates /admin/*
│                                   and the two protected admin API routes
├── next.config.ts                  Empty (defaults)
├── tsconfig.json                   @/* → ./*
├── eslint.config.mjs
├── postcss.config.mjs
├── .prettierrc
├── .prettierignore
└── package.json
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
▼
Supabase (student_applications)
│  - named columns for every field
│  - interests[], priorities[] as arrays
│  - resume_data (base64) + resume_name
│  - raw_payload (jsonb, verbatim)
▼
(optional, non-blocking)
├── Resend → internal notification to founders (with attachment)
└── Resend → confirmation to the student
▼
{ ok: true }
```

**Failure modes**

| Condition | Response |
| --- | --- |
| Invalid JSON / missing `kind` / wrong `kind` | `400` |
| Supabase misconfigured (missing env) | `500 Server misconfigured` |
| Insert error | `502 Save failed` |
| Email failure | logged, never fails |

### 4.2 Company Brief — `POST /api/submit` with `kind: "company"`

Same endpoint. Writes to `company_briefs`. No attachment; no resume columns.

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

Three-stage pipeline, streamed via SSE:

**Stage 1 — Fetch & filter**

- Fetch all tagged students from `student_applications` (filter out test accounts)
- `classifyQueryWithAI(query)` via DeepSeek proxy →
  `{ keywords, tag_matches{ vibe_tags, soft_skills, hard_skills }, search_phrase }`
- `matchCandidatesWithTags(...)`
  - tag overlap **+8 / hit**
  - summary hit **+2 / term**
  - `raw_payload` **+3 / term**
  - token pipeline: lowercase → strip unicode dashes → strip non-alnum →
    tokenize (len > 1) → light stem (`ing` / `ers` / `ies` / `es` / `s`)
  - prefix match for tokens ≥ 4 chars
  - relax-if-too-few: if `< min(5, limit)` matches, fill by score

**Stage 2 — `stage2BatchAnalysis`**

- DeepSeek, per shortlist, `max_tokens 1500`, `temperature 0.3`
- Fallback: `"Analysis unavailable (API limits)."`

**Stage 3 — `stage3Rank`**

- DeepSeek, `max_tokens 4000`, `temperature 0.1`
- Returns `{ ranked_candidates: [{ index, rank, match_score, reason }] }`
- Fallback on parse failure: unranked with `match_score = 50`

> **Security:** All stages wrap untrusted content in XML-style tags and instruct
> the model to treat it as data (prompt-injection hardening). `<think>` blocks
> are stripped from responses.

**SSE events**

```ts
{ type: "stage",  stage: "initializing" | "filtering" | "analyzing" | "ranking",
  message: string, shortlist?: Candidate[] }

{ type: "result", results: RankedCandidate[], shortlist: Candidate[] }

{ type: "error",  error: string }
```

**Response headers**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

### 4.5 Resume Download — `GET /api/admin/resume/[id]`

```
cookies() → admin_session → verifySessionToken
│
├── 401 if invalid/expired
▼
Supabase: select resume_name, resume_data where id = ?
│
├── 404 if row or resume missing
▼
decode base64 → Buffer
▼
NextResponse(bytes) with:
  Content-Type: guessed from extension
                (pdf / doc / docx / png / jpg / jpeg / txt / rtf)
  Content-Disposition: attachment; filename="..."
  Cache-Control: private, no-store
```

---

## 5. Authentication

**Model:** stateless, HMAC-signed cookie. No user table, no bcrypt, no session
table. The only credential store is the `ADMIN_USERNAME` / `ADMIN_PASSWORD` env
vars.

**Token format**

```
admin.<expiresAtMs>.<hmac_sha256_hex>
```

The `admin` prefix comes from `TOKEN_PREFIX` in `lib/admin-auth.ts` and lets
`verifySessionToken` reject unrelated cookies without doing crypto work.

**Code:** `lib/admin-auth.ts`

| Export | Purpose |
| --- | --- |
| `ADMIN_COOKIE_NAME` | `"admin_session"` — single source of truth for the cookie name |
| `ADMIN_SESSION_MAX_AGE` | `60 * 60 * 24 * 7` — shared cookie lifetime (7 days) |
| `createSessionToken(secret, maxAgeSeconds)` | Signs `<prefix>.<expiry>` with HMAC-SHA256; throws on non-positive `maxAgeSeconds` |
| `verifySessionToken(token, secret)` | Checks length bound, structure, numeric expiry, and constant-time signature comparison (`timingSafeEqualHex`). Accepts `string \| undefined \| null`. |

Uses **Web Crypto** (`crypto.subtle`) so the same code runs in both the Edge
runtime (`proxy.ts`) and Node runtime (API routes).

**Cookie: `ADMIN_COOKIE_NAME`**

| Attribute | Value |
| --- | --- |
| `httpOnly` | yes |
| `sameSite` | `lax` |
| `secure` | in production |
| `path` | `/` |
| `maxAge` | `ADMIN_SESSION_MAX_AGE` (7 days) |

**Login comparison** (`app/api/admin/login/route.ts`): uses Node
`crypto.timingSafeEqual` behind a helper that still compares buffers of unequal
length (prevents leaking length via timing).

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

Behavior:

| Condition | `/admin/*` pages | `/api/admin/*` routes |
| --- | --- | --- |
| `ADMIN_SESSION_SECRET` missing | `302 → /admin/login` (fail closed) | `500 { error: "Server misconfigured" }` |
| Cookie missing or invalid | `302 → /admin/login?from=<path>` | `401 { error: "Unauthorized" }` |
| Cookie valid, visiting `/admin/login` | `302 → /admin` | n/a |
| Cookie valid, any other match | pass through | pass through |

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
| `model_used` | text | e.g. `"llama-3.3-70b-versatile"` |
| `prompt_version` | text | e.g. `"v2"` |
| `source_file_name` | text | |
| `ai_processed_at` | timestamptz | |
| `raw_ai_response` | jsonb | |

> **Unique constraint:** `(student_id, prompt_version)` — the tagging script
> upserts on this pair.

### 6.2 DeepSeek Reverse Proxy

Self-hosted Playwright proxy that drives the DeepSeek web UI and returns either a
streamed SSE response (`stream: true`) or a single JSON object (`stream: false`)
shaped like OpenAI's `/v1/chat/completions`.

| Item | Value |
| --- | --- |
| Env | `DEEPSEEK_PROXY_URL`, `DEEPSEEK_API_KEY_REVERSE_PROXY` |
| Model requested | `deepseek-chat` |

**Two client paths**

| Path | Behaviour |
| --- | --- |
| `lib/deepseek.ts` | streaming (`stream: true`), yields `"append"` / `"replace"` events. `"replace"` exists because DeepSeek's DOM can re-render mid-response (e.g. table separators becoming real content), which append-only streaming can't represent. |
| `app/api/admin/vibe-search/route.ts` | non-streaming (`stream: false`) with per-call timeouts. |

- **Timeout:** 200s client-side via `AbortController` (server hard cap is 180s).
- **Reasoning tokens:** `<think>...</think>` blocks are stripped before use.

### 6.3 Groq (Tagging)

Used **only** by `scripts/tag-resumes.ts`, not by any runtime API route.

| Item | Value |
| --- | --- |
| Env | `GROQ_API_KEY` |
| Model | `openai/gpt-oss-120b` (older runs used `llama-3.3-70b-versatile`; the `model_used` column records what was actually used) |
| Response format | `{ type: "json_object" }` |

**Produces:** `hard_skills`, `soft_skills`, `vibe_tags`, `one_line_summary`

### 6.4 Resend (Email)

Used **only** by `app/api/submit/route.ts`, and entirely non-blocking.

| Env | Notes |
| --- | --- |
| `RESEND_API_KEY` | |
| `TL_NOTIFY_EMAIL` | |
| `TL_FROM_EMAIL` | defaults to `"Twin Lanterns onboarding@resend.dev"` |

Sends two emails per submission:

1. Internal notification to founders (with resume attachment if present)
2. Confirmation to the submitter

Both emails embed the Twin Lanterns mark inline as `cid:mark`, backed by an
attachment that Resend fetches from `https://twinlanterns.co/icon.png`. The
logo attachment is unconditional; the student's resume is added only to the
founder notification when they included one.

Note: `icon.png` is currently the favicon — small and possibly padded. If it
looks off at 32px, generate a dedicated `mark.png` from `mark.svg` and swap
the URL.

> Any failure is logged, never returned to the client.

### 6.5 Vercel Analytics

`<Analytics />` in `app/layout.tsx`, from `@vercel/analytics/next`.

---

## 7. Environment Variables

**Server-only** (never `NEXT_PUBLIC_`):

| Variable | Used by |
| --- | --- |
| `SUPABASE_URL` | `lib/supabase-server` |
| `NEXT_PUBLIC_SUPABASE_URL` | fallback URL |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS-bypassing key |
| `ADMIN_USERNAME` | `api/admin/login` |
| `ADMIN_PASSWORD` | `api/admin/login` |
| `ADMIN_SESSION_SECRET` | `lib/admin-auth`, `proxy.ts`, `api/admin/*` |
| `DEEPSEEK_PROXY_URL` | `lib/deepseek`, `vibe-search` |
| `DEEPSEEK_API_KEY_REVERSE_PROXY` | `lib/deepseek`, `vibe-search` |
| `RESEND_API_KEY` | `api/submit` (optional) |
| `TL_NOTIFY_EMAIL` | `api/submit` |
| `TL_FROM_EMAIL` | `api/submit` (optional) |
| `GROQ_API_KEY` | `scripts/tag-resumes` |
| `OLD_DATABASE_URL` | `scripts/migrate-lovable` |
| `RESUME_DIR` | `scripts/migrate-resumes` |
| `DEBUG` | `lib/deepseek`, `scripts/test-deepseek-api` |

---

## 8. Admin Dashboard

`app/admin/page.tsx` (server) fetches all `student_applications` (with nested
`candidate_ai_tags`) and all `company_briefs`, then hands them to
`AdminDashboard.tsx` (client).

**Three tabs**

| Tab | Contents |
| --- | --- |
| **Student applications** | Table with fixed columns + AI columns (`vibe_tags`, `soft_skills`, `hard_skills`, `ai_summary`) + resume download link |
| **Company briefs** | Table with `BRIEF_COLUMNS` |
| **Search** | `<VibeSearch />` |

**Table features** (internal to `AdminDashboard.tsx`)

- Client-side free-text search across `JSON.stringify(row)`
- **"Show short answers"** toggle: dynamically derives extra columns from each
  row's `raw_payload`, filtering out system/meta fields and fields already in
  fixed columns (`SHORT_ANSWER_EXCLUDE`)
- **Dual schema support:** `raw_payload` may be flat (current) or wrapped as
  `{ original: {...}, migrated_from: "lovable_students" }` (legacy). A
  `SchemaBadge` marks each derived column as `new` / `legacy` / `both`
- **Expandable row** — pretty-printed payload (URLs become links, ISO timestamps
  localized, booleans as Yes/No pills, arrays as chips or nested items) or raw
  JSON toggle

**VibeSearch UI**

- Text input + "Semantic Search" button; example prompts for quick fill
- Manual SSE parsing of the `/api/admin/vibe-search` response
- Stepper shows progress across
  `initializing → filtering → analyzing → ranking → complete`
- Two views: **Shortlist** (stage 1) and **Final rankings** (stage 3), with a
  fade transition between them

**CandidateCard shows**

- Rank badge (gold / silver / bronze for top 3)
- Contact info
- Vibe tag chips
- Highlighted snippet
- Matched keyword chips with source dots (`tags` / `summary` / `profile`)
- "Why this match" panel
- Deep analysis
- `ScoreRing` (SVG donut; green ≥ 80, lime ≥ 60, amber ≥ 40, red below)

**Logout:** `POST /api/admin/logout` then `router.push("/admin/login")` +
`router.refresh()`.

---

## 9. Frontend Design System

### 9.1 Form Primitives (`components/form.tsx`)

All exported from one file. Used by both `ApplyFlow.tsx` and `HireFlow.tsx`.

| Export | Description |
| --- | --- |
| `ease` | `[0.22, 1, 0.36, 1]` — site-wide cubic bezier |
| `Field` | Label + hint wrapper around any control |
| `Input`, `Textarea`, `Select` | Styled HTML controls sharing a base class |
| `Pills` | Single- or multi-select pill group; `aria-pressed` set |
| `ChoiceCards` | Grid of tappable cards with a rotating Shape icon |
| `Slider` | Range input with `format(value)` display + optional ticks |
| `RankList` / `RankItem` | Drag-to-reorder list (Motion `Reorder`) with drag controls |
| `DropZone` / `Upload` | File drop zone; reads to base64; 4 MB cap; accepts `.pdf,.doc,.docx,.png,.jpg,.jpeg,.txt` |
| `StepHeader` | "Step X of Y", title, blurb |
| `StepRail` | Vertical step navigation; completed steps clickable |
| `Progress` | 0.5px top bar; `width = value * 100%` |
| `NavButtons` | Back (button) + Next (submit); loading state "Sending..." |

### 9.2 Visual System

| Module | Notes |
| --- | --- |
| **Shapes** (`components/Shapes.tsx`) | Six SVG shapes: `clover`, `hex`, `arch`, `squircle`, `scallop` (14-point smooth ring), `burst` (12-point sharp star). `scallop` and `burst` are generated procedurally by `ring(points, rOuter, rInner, sharp)`. The exported `shapePaths` record is consumed by `Landing.tsx` for morphing SVG
decorations (`<path d={shapePaths[kind]} className="blob-morph" />`) and by the
`Shape` component itself.|
| **Mark** (`components/Mark.tsx`) | The Twin Lanterns logo: two angled panels plus a flickering spark in `--color-flame`. |
| **Reveal** (`components/Reveal.tsx`) | Single motion primitive. Every section entrance on the site uses it: fade up 12px, once, `amount: 0.25`. |
| **Nav** (`components/Nav.tsx`) | Fixed floating pill, centered. After 40px of scroll it collapses to `w-max`, hides the brand text, and moves the CTAs to a corner cluster. Mobile menu slides down from the pill. |

- **Typography utilities:** `display`, `label`, `eyebrow`
- **Motion:** all animations import from `motion/react`. `AnimatePresence` is
  used in the two wizard flows to cross-fade between steps.

### 9.3 Homepage Sections (`components/Landing.tsx`)

Rendered in order:

```
Hero → Stats → Split → Process → Statement → Roles → Faq → Cta
```

**Hero**
Typewriter cycling between two phrases:

- "Stop hiring shtty interns."
- "Stop working for shtty companies."

Honors `prefers-reduced-motion`. Six floating Shapes rotate opposite directions
per phase.

---

## 10. Scripts

All run through `tsx`. Scripts that write to Supabase honor a `--commit` flag;
running with no flag is a **dry run**.

### 10.1 `scripts/migrate-lovable.ts`

One-time migration from the old Lovable-generated `public.students` table to
`student_applications`. Requires a Postgres instance with the Lovable backup data
restored locally.

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
| `linkedin_url`, `portfolio_url`, `website_url` | `links` (joined) |

Preserves `id` and upserts on conflict `id` — re-running after a partial commit
is idempotent.

Writes legacy schema shape to `raw_payload`:

```json
{ "migrated_from": "lovable_students", "original": "<row>" }
```

This is what `AdminDashboard` detects to render the **"legacy"** badge.

### 10.2 `scripts/migrate-resumes.ts`

Backfills `resume_data` (base64) on rows already migrated, by matching local
files (renamed to UUIDs by Lovable) against `resume_name`.

```bash
npx tsx scripts/migrate-resumes.ts
npx tsx scripts/migrate-resumes.ts --commit
RESUME_DIR="C:\path\to\files" npx tsx scripts/migrate-resumes.ts
```

- Default folder: `./lovable-resumes`
- Only touches rows where `resume_data IS NULL` — safe to re-run
- Filenames are normalized (lowercase, non-alnum stripped) before matching

### 10.3 `scripts/tag-resumes.ts`

Runs every student application through Groq and writes to `candidate_ai_tags`.
Uses both resume text (via `pdfjs-dist` / `mammoth` / raw txt) and `raw_payload`.

```bash
npx tsx --env-file=.env.local scripts/tag-resumes.ts
npx tsx --env-file=.env.local scripts/tag-resumes.ts --commit
```

- Requires `GROQ_API_KEY`
- Model: `openai/gpt-oss-120b`, `temperature: 0.2`, JSON response mode
- Idempotent per `(student_id, prompt_version)` — skips rows already tagged at
  the current `prompt_version` (`"v2"`)
- 200ms delay between calls
- Records: `model_used`, `prompt_version`, `source_file_name`, `ai_processed_at`,
  `raw_ai_response`

### 10.4 `scripts/test-deepseek-api.ts`

Interactive CLI chat against the DeepSeek proxy, streaming tokens to stdout.
Handles `"replace"` events by clearing the current terminal line and reprinting
(the same logic a UI would use).

```bash
npx tsx --env-file=.env.local scripts/test-deepseek-api.ts
DEBUG=true npx tsx --env-file=.env.local scripts/test-deepseek-api.ts
```

Type `exit`, `quit`, or `q` to end the session.

---

## 11. Deployment

| Item | Value |
| --- | --- |
| **Platform** | Vercel |
| **Production URL** | https://twin-lanterns.vercel.app (`metadataBase` in `app/layout.tsx`) |

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
Every place user or candidate data is sent to an LLM, it's wrapped in an XML-ish
tag and the system prompt explicitly tells the model to treat it as data.
Applies to `vibe-search` and to `tag-resumes.ts`.

**Reasoning tags**
`<think>...</think>` blocks are stripped on both the server (`lib/deepseek.ts`,
`vibe-search`) and the client (`AdminDashboard.tsx` `stripThinking`) so leaked
reasoning never reaches the UI.

**Idempotency**
Migration scripts preserve IDs and upsert on the natural key. The tagging script
skips already-tagged rows. The vibe-search prompt cache is per
`(student_id, prompt_version)`.

**Two-schema awareness**
The admin dashboard treats `raw_payload` as either the current flat shape or the
Lovable legacy wrapper and renders a matching badge. New code should keep
producing the flat shape.

**Non-blocking side effects**
Email in `/api/submit` is best-effort and never blocks the DB write or fails the
request.

**Single source of truth for the session cookie**
`ADMIN_COOKIE_NAME` and `ADMIN_SESSION_MAX_AGE` live in `lib/admin-auth.ts`.
Every call site — `proxy.ts`, `login/route.ts`, `logout/route.ts`,
`resume/[id]/route.ts`, `vibe-search/route.ts` — imports them. Don't inline the
string or the literal `60 * 60 * 24 * 7` again.

**Formatting**
Prettier `3.9.6` is pinned with `--save-exact`. Run `npm run format` before
committing. `.prettierignore` skips `.next`, `node_modules`, `package-lock.json`,
and `public`.

---

## 13. Known Gaps / Follow-Ups

- `public/` contains five Next.js boilerplate SVGs (`file.svg`, `globe.svg`,
  `next.svg`, `vercel.svg`, `window.svg`) and the `team/` folder with two
  orphaned founder photos. All safe to delete.
- `OPENAI_API_KEY` / `@google/generative-ai` are in `package.json` but not
  referenced by any runtime code in this repo — likely leftovers or intended for
  future use.
- `scripts/tag-resumes.ts` records `model_used: "llama-3.3-70b-versatile"` even
  though the current call uses `openai/gpt-oss-120b` — the field is hardcoded and
  should probably be derived from the request.
- `app/apply/page.tsx` and `app/companies/page.tsx` wrappers were not included
  in the batches reviewed, but their client components (`ApplyFlow.tsx` and
  `HireFlow.tsx`) were fully covered.
- `lib/deepseek.ts` and `app/api/admin/vibe-search/route.ts` share a lot of
  DeepSeek call logic (URL, auth, timeout, thinking-tag strip). Worth extracting
  into a single shared client if it starts to drift.