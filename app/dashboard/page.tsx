"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";

export default function Dashboard() {
  const supabase = supabaseBrowser();
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? "");
    });
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    location.href = "/";
  }

  return (
    <div>
      <p>
        Logged in as: <b>{userEmail || "unknown"}</b>
      </p>
      <ul>
        <li>
          <Link href="/profile">Edit profile (what you can do + radius)</Link>
        </li>
        <li>
          <Link href="/request-help">Request help</Link>
        </li>
      </ul>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
