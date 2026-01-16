"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { normalizePostalCode } from "@/lib/postal";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [postal, setPostal] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [msg, setMsg] = useState<string>("");

  async function onSubmit() {
    setMsg("");
    if (mode === "signup") {
      const pc = normalizePostalCode(postal);
      if (!pc) return setMsg("Enter a valid Canadian postal code (A1A 1A1).");

      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
      });
      if (error) return setMsg(error.message);

      if (data.user) {
        await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postalCode: pc }),
        });

        await supabase.from("profiles").upsert({
          user_id: data.user.id,
          email,
          postal_code: pc,
        });
      }

      setMsg("Signed up. You can continue to dashboard.");
      router.push("/dashboard");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });
    if (error) return setMsg(error.message);
    router.push("/dashboard");
  }

  return (
    <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setMode("login")} disabled={mode === "login"}>
          Login
        </button>
        <button onClick={() => setMode("signup")} disabled={mode === "signup"}>
          Sign up
        </button>
      </div>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="Password"
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />

      {mode === "signup" && (
        <input
          placeholder="Postal code (A1A 1A1)"
          value={postal}
          onChange={(e) => setPostal(e.target.value)}
        />
      )}

      <button onClick={onSubmit}>
        {mode === "signup" ? "Create account" : "Login"}
      </button>
      {msg && <p style={{ color: "#b00" }}>{msg}</p>}
    </div>
  );
}
