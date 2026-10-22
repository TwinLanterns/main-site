import { getSupabaseServerClient } from "@/lib/supabase-server";
import { fetchAllRows } from "@/lib/supabase-fetch-all";
import AdminDashboard from "./AdminDashboard";
import type { Metadata } from 'next'

// Always hit the database fresh — this is an admin tool, not a public page.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  // This adds the <meta name="robots" content="noindex, nofollow"> tag
  // to every page inside the /admin directory
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default async function AdminPage() {
  const supabase = getSupabaseServerClient();

  const [
    { data: applications, error: applicationsError },
    { data: briefs, error: briefsError },
    { data: earnAmbassadors, error: earnAmbassadorsError },
    { data: earnQualified, error: earnQualifiedError },
    { data: earnUnqualified, error: earnUnqualifiedError },
    { data: earnGopro, error: earnGoproError },
    { data: earnSpeech, error: earnSpeechError },
  ] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("student_applications")
        // resume_data (base64) is deliberately excluded here — it's fetched
        // on demand via /api/admin/resume/[id] so the dashboard stays light
        // even once there are a lot of resumes attached.
        .select(
          `id, 
             first_name, 
             last_name, 
             email, 
             phone, 
             level, 
             school, 
             grad_year, 
             location, 
             interests, 
             hours_per_week, 
             start_timing, 
             work_setup, 
             priorities, 
             built, 
             links, 
             resume_name, 
             raw_payload, 
             created_at,
             candidate_ai_tags (
               vibe_tags,
               soft_skills,
               hard_skills,
               ai_summary
             )`,
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        // A student gets a tag row per prompt version; keep the newest.
        .order("ai_processed_at", {
          referencedTable: "candidate_ai_tags",
          ascending: false,
          nullsFirst: false,
        })
        .limit(1, { referencedTable: "candidate_ai_tags" })
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("company_briefs")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("earn_ambassadors")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("earn_applicants_qualified")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("earn_applicants_unqualified")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("earn_gopro_applicants")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("earn_speech_participants")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);

  if (
    applicationsError ||
    briefsError ||
    earnAmbassadorsError ||
    earnQualifiedError ||
    earnUnqualifiedError ||
    earnGoproError ||
    earnSpeechError
  ) {
    return (
      <div className="p-8 text-sm text-red-600">
        Failed to load data:{" "}
        {applicationsError?.message ||
          briefsError?.message ||
          earnAmbassadorsError?.message ||
          earnQualifiedError?.message ||
          earnUnqualifiedError?.message ||
          earnGoproError?.message ||
          earnSpeechError?.message}
      </div>
    );
  }

  return (
    <AdminDashboard
      applications={applications ?? []}
      briefs={briefs ?? []}
      earnAmbassadors={earnAmbassadors ?? []}
      earnQualified={earnQualified ?? []}
      earnUnqualified={earnUnqualified ?? []}
      earnGopro={earnGopro ?? []}
      earnSpeech={earnSpeech ?? []}
    />
  );
}