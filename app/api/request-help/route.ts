import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseServer";
import { normalizePostalCode } from "@/lib/postal";
import { haversineMeters, metersToBlocks } from "@/lib/geo";
import { sendEmail } from "@/lib/email";

type HelperRow = {
  user_id: string;
  email: string | null;
  lat: number | null;
  lon: number | null;
  is_available: boolean;
  can_push: boolean;
  can_shovel: boolean;
  can_tow: boolean;
  max_blocks_push: number;
  max_blocks_shovel: number;
  max_blocks_tow: number;
};

export async function POST(req: Request) {
  const supabase = supabaseService();
  const authHeader = req.headers.get("authorization") || "";

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Auth failed" }, { status: 401 });
  }

  const body = await req.json();
  const postalCode = normalizePostalCode(body.postalCode ?? "");
  if (!postalCode) {
    return NextResponse.json({ error: "Invalid postal code" }, { status: 400 });
  }

  const needPush = !!body.needPush;
  const needShovel = !!body.needShovel;
  const needTow = !!body.needTow;
  if (!needPush && !needShovel && !needTow) {
    return NextResponse.json(
      { error: "Select at least one type of help." },
      { status: 400 }
    );
  }

  const rl = await supabase
    .from("request_rate_limits")
    .select("*")
    .eq("requester_id", userData.user.id)
    .single();
  const last = rl.data?.last_request_at
    ? new Date(rl.data.last_request_at).getTime()
    : 0;
  if (Date.now() - last < 10 * 60 * 1000) {
    return NextResponse.json(
      { error: "Please wait a bit before creating another request." },
      { status: 429 }
    );
  }
  if (rl.data) {
    await supabase
      .from("request_rate_limits")
      .update({ last_request_at: new Date().toISOString() })
      .eq("requester_id", userData.user.id);
  } else {
    await supabase.from("request_rate_limits").insert({
      requester_id: userData.user.id,
      last_request_at: new Date().toISOString(),
    });
  }

  const geo = await supabase
    .from("postal_geocodes")
    .select("*")
    .eq("postal_code", postalCode)
    .single();
  if (!geo.data) {
    return NextResponse.json(
      { error: "Postal code not geocoded yet. Try again." },
      { status: 400 }
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from("help_requests")
    .insert({
      requester_id: userData.user.id,
      postal_code: postalCode,
      lat: geo.data.lat,
      lon: geo.data.lon,
      public_note: body.publicNote ?? null,
      private_location_details: body.privateLocationDetails ?? null,
      need_push: needPush,
      need_shovel: needShovel,
      need_tow: needTow,
    })
    .select("id, lat, lon")
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? "Insert failed" },
      { status: 500 }
    );
  }

  const helpers = await supabase
    .from("profiles")
    .select(
      "user_id,email,lat,lon,is_available,can_push,can_shovel,can_tow,max_blocks_push,max_blocks_shovel,max_blocks_tow"
    )
    .eq("is_available", true);

  const reqPos = { lat: inserted.lat as number, lon: inserted.lon as number };

  const candidates = (helpers.data ?? []).filter((h: HelperRow) => {
    if (!h.lat || !h.lon || !h.email) return false;

    const blocks = metersToBlocks(
      haversineMeters(reqPos, { lat: h.lat, lon: h.lon })
    );
    const okPush = needPush && h.can_push && blocks <= h.max_blocks_push;
    const okShovel =
      needShovel && h.can_shovel && blocks <= h.max_blocks_shovel;
    const okTow = needTow && h.can_tow && blocks <= h.max_blocks_tow;

    return okPush || okShovel || okTow;
  });

  const appUrl = process.env.APP_URL!;
  const subject = "Snow Help: Someone nearby requested help";
  await Promise.allSettled(
    candidates.slice(0, 30).map(async (h: HelperRow) => {
      if (!h.email) return;
      const acceptLink = `${appUrl}/requests/${inserted.id}`;
      const html = `
        <p>Someone nearby requested help.</p>
        <p><b>Postal code area:</b> ${postalCode}</p>
        <p><b>Note:</b> ${(body.publicNote ?? "").slice(0, 200)}</p>
        <p><a href="${acceptLink}">Open request</a></p>
        <p>If you can help, open the request and tap “Accept”.</p>
      `;
      await sendEmail(h.email, subject, html);
    })
  );

  return NextResponse.json({ id: inserted.id });
}
