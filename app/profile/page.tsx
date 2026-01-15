"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseClient";
import { normalizePostalCode } from "@/lib/postal";

type Profile = {
  user_id: string;
  postal_code: string;
  display_name: string | null;
  is_available: boolean;
  can_push: boolean;
  can_shovel: boolean;
  can_tow: boolean;
  max_blocks_push: number;
  max_blocks_shovel: number;
  max_blocks_tow: number;
};

export default function ProfilePage() {
  const supabase = supabaseBrowser();
  const [p, setP] = useState<Profile | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", u.user.id)
        .single();
      setP(data as Profile);
    })();
  }, [supabase]);

  async function save() {
    if (!p) return;
    setMsg("");

    const pc = normalizePostalCode(p.postal_code);
    if (!pc) return setMsg("Postal code invalid.");

    await fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postalCode: pc }),
    });

    const { error } = await supabase
      .from("profiles")
      .update({
        postal_code: pc,
        display_name: p.display_name,
        is_available: p.is_available,
        can_push: p.can_push,
        can_shovel: p.can_shovel,
        can_tow: p.can_tow,
        max_blocks_push: p.max_blocks_push,
        max_blocks_shovel: p.max_blocks_shovel,
        max_blocks_tow: p.max_blocks_tow,
      })
      .eq("user_id", p.user_id);

    if (error) return setMsg(error.message);
    setMsg("Saved.");
  }

  if (!p) return <p>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
      <label>
        Display name (optional)
        <input
          value={p.display_name ?? ""}
          onChange={(e) =>
            setP({
              ...p,
              display_name: e.target.value,
            })
          }
        />
      </label>

      <label>
        Postal code
        <input
          value={p.postal_code}
          onChange={(e) => setP({ ...p, postal_code: e.target.value })}
        />
      </label>

      <label>
        Available to help right now
        <input
          type="checkbox"
          checked={p.is_available}
          onChange={(e) => setP({ ...p, is_available: e.target.checked })}
        />
      </label>

      <fieldset>
        <legend>What can you do?</legend>

        <label>
          <input
            type="checkbox"
            checked={p.can_push}
            onChange={(e) => setP({ ...p, can_push: e.target.checked })}
          />
          Push / help physically
        </label>
        <label>
          Max blocks (push):
          <input
            type="number"
            min={1}
            max={10}
            value={p.max_blocks_push}
            onChange={(e) =>
              setP({ ...p, max_blocks_push: Number(e.target.value) })
            }
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={p.can_shovel}
            onChange={(e) => setP({ ...p, can_shovel: e.target.checked })}
          />
          Shovel / snow tools
        </label>
        <label>
          Max blocks (shovel):
          <input
            type="number"
            min={1}
            max={10}
            value={p.max_blocks_shovel}
            onChange={(e) =>
              setP({ ...p, max_blocks_shovel: Number(e.target.value) })
            }
          />
        </label>

        <label>
          <input
            type="checkbox"
            checked={p.can_tow}
            onChange={(e) => setP({ ...p, can_tow: e.target.checked })}
          />
          Tow / pull (only if safe + you know what you’re doing)
        </label>
        <label>
          Max blocks (tow):
          <input
            type="number"
            min={1}
            max={20}
            value={p.max_blocks_tow}
            onChange={(e) =>
              setP({ ...p, max_blocks_tow: Number(e.target.value) })
            }
          />
        </label>
      </fieldset>

      <button onClick={save}>Save</button>
      {msg && <p>{msg}</p>}
    </div>
  );
}
