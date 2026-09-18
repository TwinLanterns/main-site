import { NextResponse } from "next/server";

export type ParseJsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false };

export async function parseJsonBody(req: Request): Promise<ParseJsonBodyResult> {
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return { ok: false };
  }
}

export function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}
