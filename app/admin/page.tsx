import { getSupabaseServerClient } from "@/lib/supabase-server";
import AdminDashboard from "./AdminDashboard";

// Always hit the database fresh — this is an admin tool, not a public page.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = getSupabaseServerClient();

  const [
    { data: applications, error: applicationsError },
    { data: briefs, error: briefsError },
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
  ]);
  console.log(
    "First application with AI tags:",
    JSON.stringify(applications?.[0], null, 2),
  );
  if (applicationsError || briefsError) {
    return (
      <div className="p-8 text-sm text-red-600">
        Failed to load data:{" "}
        {applicationsError?.message || briefsError?.message}
      </div>
    );
  }

  return (
    <AdminDashboard applications={applications ?? []} briefs={briefs ?? []} />
  );
}
