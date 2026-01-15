import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = supabaseService();
  const token = (req.headers.get("authorization") || "").replace(
    "Bearer ",
    ""
  );
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Auth failed" }, { status: 401 });
  }

  const { requestId, status } = await req.json();
  if (!requestId || !["resolved", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Bad input" }, { status: 400 });
  }

  const reqRow = await supabase
    .from("help_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (!reqRow.data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isRequester = reqRow.data.requester_id === userData.user.id;
  const isAssignedHelper = reqRow.data.assigned_helper_id === userData.user.id;

  if (!isRequester && !isAssignedHelper) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  await supabase.from("help_requests").update({ status }).eq("id", requestId);
  return NextResponse.json({ ok: true });
}
