"use client";

import { useState } from "react";
import { normalizePostalCode } from "@/lib/postal";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function RequestHelpPage() {
  const supabase = supabaseBrowser();
  const [postal, setPostal] = useState("");
  const [publicNote, setPublicNote] = useState("");
  const [privateDetails, setPrivateDetails] = useState("");
  const [needPush, setNeedPush] = useState(true);
  const [needShovel, setNeedShovel] = useState(false);
  const [needTow, setNeedTow] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    setMsg("");
    const pc = normalizePostalCode(postal);
    if (!pc) return setMsg("Enter a valid postal code (A1A 1A1).");

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return setMsg("Please login first.");

    const r = await fetch("/api/request-help", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postalCode: pc,
        publicNote,
        privateLocationDetails: privateDetails,
        needPush,
        needShovel,
        needTow,
      }),
    });

    const data = await r.json();
    if (!r.ok) return setMsg(data.error ?? "Failed.");
    setMsg(`Request created. ID: ${data.id}`);
    location.href = `/requests/${data.id}`;
  }

  return (
    <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
      <h2>Request help</h2>

      <input
        placeholder="Postal code (A1A 1A1)"
        value={postal}
        onChange={(e) => setPostal(e.target.value)}
      />

      <label>
        What do you need?
        <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
          <label>
            <input
              type="checkbox"
              checked={needPush}
              onChange={(e) => setNeedPush(e.target.checked)}
            />{" "}
            Push / physical help
          </label>
          <label>
            <input
              type="checkbox"
              checked={needShovel}
              onChange={(e) => setNeedShovel(e.target.checked)}
            />{" "}
            Shovel / snow tools
          </label>
          <label>
            <input
              type="checkbox"
              checked={needTow}
              onChange={(e) => setNeedTow(e.target.checked)}
            />{" "}
            Tow / pull
          </label>
        </div>
      </label>

      <textarea
        placeholder="Public note (keep it vague): e.g., “Stuck near the corner, need a push.”"
        value={publicNote}
        onChange={(e) => setPublicNote(e.target.value)}
      />

      <textarea
        placeholder="Private details (shared only after someone accepts): cross-street, driveway, exact spot, etc."
        value={privateDetails}
        onChange={(e) => setPrivateDetails(e.target.value)}
      />

      <button onClick={submit}>Send request</button>
      {msg && <p>{msg}</p>}
    </div>
  );
}
