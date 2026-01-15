import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseServer";
import { sendEmail } from "@/lib/email";

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

  const { requestId } = await req.json();
  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
  }

  const reqRow = await supabase
    .from("help_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (!reqRow.data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (reqRow.data.status !== "open") {
    return NextResponse.json(
      { error: "Request already taken/closed." },
      { status: 409 }
    );
  }

  await supabase
    .from("help_offers")
    .insert({ request_id: requestId, helper_id: userData.user.id });

  const updated = await supabase
    .from("help_requests")
    .update({ status: "assigned", assigned_helper_id: userData.user.id })
    .eq("id", requestId)
    .eq("status", "open")
    .select("*")
    .single();

  if (!updated.data) {
    return NextResponse.json(
      { error: "Someone else accepted first." },
      { status: 409 }
    );
  }

  const requesterProfile = await supabase
    .from("profiles")
    .select("email")
    .eq("user_id", updated.data.requester_id)
    .single();
  if (requesterProfile.data?.email) {
    await sendEmail(
      requesterProfile.data.email,
      "Snow Help: A helper is on the way",
      `<p>Someone accepted your request.</p>
       <p>Open the app to see details: <a href="${process.env.APP_URL}/requests/${requestId}">View request</a></p>`
    );
  }

  return NextResponse.json({ ok: true });
}
