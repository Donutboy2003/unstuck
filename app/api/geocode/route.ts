import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseServer";
import { normalizePostalCode } from "@/lib/postal";

export async function POST(req: Request) {
  const body = await req.json();
  const postalCode = normalizePostalCode(body.postalCode ?? "");
  if (!postalCode) {
    return NextResponse.json({ error: "Invalid postal code" }, { status: 400 });
  }

  const supabase = supabaseService();

  const cached = await supabase
    .from("postal_geocodes")
    .select("*")
    .eq("postal_code", postalCode)
    .single();
  if (cached.data) {
    return NextResponse.json({ lat: cached.data.lat, lon: cached.data.lon });
  }

  const q = encodeURIComponent(`${postalCode} Canada`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;

  const r = await fetch(url, {
    headers: { "User-Agent": "SnowHelpMVP/1.0 (contact: example@example.com)" },
  });

  if (!r.ok) {
    return NextResponse.json({ error: "Geocode failed" }, { status: 502 });
  }

  const data = await r.json();
  if (!data?.[0]) {
    return NextResponse.json(
      { error: "No match for postal code" },
      { status: 404 }
    );
  }

  const lat = Number(data[0].lat);
  const lon = Number(data[0].lon);

  await supabase.from("postal_geocodes").insert({
    postal_code: postalCode,
    lat,
    lon,
  });

  return NextResponse.json({ lat, lon });
}
