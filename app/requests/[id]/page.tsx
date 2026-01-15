"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

type Req = Record<string, unknown>;

type RequestDetailProps = {
  params: { id: string };
};

export default function RequestDetail({ params }: RequestDetailProps) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [reqRow, setReqRow] = useState<Req | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [msg, setMsg] = useState("");

  const requestId = params.id;

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    setUserId(u.user?.id ?? "");

    const { data, error } = await supabase
      .from("help_requests")
      .select("*")
      .eq("id", requestId)
      .single();
    if (error) setMsg(error.message);
    setReqRow(data as Req);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`req:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "help_requests",
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          setReqRow(payload.new as Req);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, supabase]);

  async function accept() {
    setMsg("");
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return setMsg("Not logged in.");

    const r = await fetch("/api/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ requestId }),
    });
    const data = await r.json();
    if (!r.ok) return setMsg(data.error ?? "Failed");
    setMsg("Accepted. The requester has been notified.");
    await load();
  }

  async function resolve(status: "resolved" | "cancelled") {
    setMsg("");
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return setMsg("Not logged in.");

    const r = await fetch("/api/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ requestId, status }),
    });
    const data = await r.json();
    if (!r.ok) return setMsg(data.error ?? "Failed");
    await load();
  }

  if (!reqRow) return <p>Loading… {msg}</p>;

  const requesterId = reqRow.requester_id as string | undefined;
  const assignedHelperId = reqRow.assigned_helper_id as string | undefined;
  const status = reqRow.status as string | undefined;

  const isRequester = requesterId === userId;
  const isAssignedHelper = assignedHelperId === userId;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <h2>Request</h2>
      <p>
        <b>Status:</b> {status}
      </p>
      <p>
        <b>Area:</b> {String(reqRow.postal_code ?? "")}
      </p>
      <p>
        <b>Public note:</b> {String(reqRow.public_note ?? "(none)")}
      </p>

      <p>
        <b>Needs:</b>{" "}
        {reqRow.need_push ? "push " : ""}
        {reqRow.need_shovel ? "shovel " : ""}
        {reqRow.need_tow ? "tow " : ""}
      </p>

      {(isRequester || isAssignedHelper) && (
        <div style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}>
          <p>
            <b>Private details:</b>{" "}
            {String(reqRow.private_location_details ?? "(none)")}
          </p>
        </div>
      )}

      {status === "open" && !isRequester && (
        <button onClick={accept}>Accept this request</button>
      )}

      {isRequester && status !== "resolved" && status !== "cancelled" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => resolve("resolved")}>I’m unstuck (resolve)</button>
          <button onClick={() => resolve("cancelled")}>Cancel</button>
        </div>
      )}

      {(isAssignedHelper || isRequester) && status === "assigned" && (
        <p>
          <b>Confirmation:</b> Helper assigned. Coordinate in-app (MVP) or add
          chat later.
        </p>
      )}

      {msg && <p style={{ color: "#b00" }}>{msg}</p>}
    </div>
  );
}
