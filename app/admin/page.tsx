import { getSupabaseServerClient } from "@/lib/supabase-server";
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
    { data: partnerAmbassadors, error: partnerAmbassadorsError },
    { data: partnerQualified, error: partnerQualifiedError },
    { data: partnerUnqualified, error: partnerUnqualifiedError },
    { data: partnerGopro, error: partnerGoproError },
    { data: partnerSpeech, error: partnerSpeechError },
  ] = await Promise.all([
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
      .order("created_at", { ascending: false }),
    supabase
      .from("company_briefs")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("partner_ambassadors")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("partner_applicants_qualified")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("partner_applicants_unqualified")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("partner_gopro_applicants")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("partner_speech_participants")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  if (
    applicationsError ||
    briefsError ||
    partnerAmbassadorsError ||
    partnerQualifiedError ||
    partnerUnqualifiedError ||
    partnerGoproError ||
    partnerSpeechError
  ) {
    return (
      <div className="p-8 text-sm text-red-600">
        Failed to load data:{" "}
        {applicationsError?.message ||
          briefsError?.message ||
          partnerAmbassadorsError?.message ||
          partnerQualifiedError?.message ||
          partnerUnqualifiedError?.message ||
          partnerGoproError?.message ||
          partnerSpeechError?.message}
      </div>
    );
  }

  return (
    <AdminDashboard
      applications={applications ?? []}
      briefs={briefs ?? []}
      partnerAmbassadors={partnerAmbassadors ?? []}
      partnerQualified={partnerQualified ?? []}
      partnerUnqualified={partnerUnqualified ?? []}
      partnerGopro={partnerGopro ?? []}
      partnerSpeech={partnerSpeech ?? []}
    />
  );
}