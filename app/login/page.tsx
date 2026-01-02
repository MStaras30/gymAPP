"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function submit(path: "login" | "register") {
    setError("");

    const e = email.trim().toLowerCase();
    const p = password;

    // minimalus validavimas (kad nereiktų be reikalo šauti į serverį)
    if (!e || !p) return setError("Įvesk el. paštą ir slaptažodį.");
    if (!isEmail(e)) return setError("Neteisingas el. pašto formatas.");
    if (path === "register" && p.length < 8) return setError("Slaptažodis per trumpas (min 8 simboliai).");

    try {
      setLoading(true);

      const res = await fetch(`/api/auth/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p }),
      });

      if (!res.ok) {
        // bandome perskaityti JSON, bet jei ne JSON – fallback
        let msg = "Įvyko klaida.";
        try {
          const data = await res.json();
          msg = data?.error ?? msg;
        } catch {
          // ignore
        }
        setError(msg);
        return;
      }

      // sėkmė
      router.replace("/");
      router.refresh(); // priverčia server components persiskaityti cookies
    } catch {
      setError("Nepavyko prisijungti. Patikrink internetą ir bandyk dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white px-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Prisijungimas</h1>

        <input
          className="w-full p-3 bg-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="El. paštas"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          inputMode="email"
          autoComplete="email"
        />

        <input
          type="password"
          className="w-full p-3 bg-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Slaptažodis"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={loading ? "off" : pathAutoCompleteHint()} // žemiau helperis
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          disabled={loading}
          onClick={() => submit("login")}
          className="w-full bg-white text-black py-3 rounded-xl font-semibold disabled:opacity-60"
        >
          {loading ? "Palauk..." : "Prisijungti"}
        </button>

        <button
          disabled={loading}
          onClick={() => submit("register")}
          className="w-full border border-white/70 py-3 rounded-xl font-semibold disabled:opacity-60"
        >
          {loading ? "Palauk..." : "Registruotis"}
        </button>

        <p className="text-xs text-zinc-400">
          Registracijai: slaptažodis bent 8 simboliai.
        </p>
      </div>
    </div>
  );
}

// mažas helperis, kad TS nesikeiktų ir nebūtų “magic string”
// (jei nenori – gali ištrinti ir palikt autoComplete="current-password")
function pathAutoCompleteHint() {
  return "current-password";
}
