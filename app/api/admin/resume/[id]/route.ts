import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth"; // 👈 Import this

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  txt: "text/plain",
  rtf: "application/rtf",
};

function guessMimeType(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

// Helper function to check if user is admin
async function isAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  
  if (!sessionToken) return false;
  
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  
  // ✅ Use the proper verification function
  return await verifySessionToken(sessionToken, secret);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 🔒 Check authentication first
  const isAuthenticated = await isAdmin();
  
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("student_applications")
    .select("resume_name, resume_data")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!data.resume_data || !data.resume_name) {
    return NextResponse.json({ error: "No resume on file for this application" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    const raw: string = data.resume_data;
    const base64 = raw.includes(",") ? raw.split(",").pop()! : raw;
    buffer = Buffer.from(base64, "base64");
  } catch {
    return NextResponse.json({ error: "Could not decode stored resume data" }, { status: 500 });
  }

  const filename = String(data.resume_name).replace(/"/g, "");
  const uint8Array = new Uint8Array(buffer);

  return new NextResponse(uint8Array, {
    headers: {
      "Content-Type": guessMimeType(filename),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}