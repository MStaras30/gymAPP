"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "login" | "register" | "reset";
type RegisterStep = "form" | "verify";
type ResetStep = "request" | "confirm";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

async function readError(res: Response) {
  try {
    const data = await res.json();
    return data?.error ?? "Įvyko klaida.";
  } catch {
    return "Įvyko klaida.";
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("login");

  // shared
  const [email, setEmail] = useState("");
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // login
  const [loginPassword, setLoginPassword] = useState("");

  // register
  const [regPassword, setRegPassword] = useState("");
  const [regStep, setRegStep] = useState<RegisterStep>("form");
  const [regCode, setRegCode] = useState("");
  const [regCooldownUntil, setRegCooldownUntil] = useState<number>(0);
  const regCooldownLeft = Math.max(0, Math.ceil((regCooldownUntil - Date.now()) / 1000));

  // reset
  const [resetStep, setResetStep] = useState<ResetStep>("request");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetCooldownUntil, setResetCooldownUntil] = useState<number>(0);
  const resetCooldownLeft = Math.max(0, Math.ceil((resetCooldownUntil - Date.now()) / 1000));

  function clearMessages() {
    setError("");
    setInfo("");
  }

  function switchTab(next: Tab) {
    setTab(next);
    clearMessages();
    setLoading(false);

    // paliekam email (patogu), bet resetinam specifinius laukus
    if (next === "login") {
      setLoginPassword("");
    }
    if (next === "register") {
      setRegPassword("");
      setRegCode("");
      setRegStep("form");
      setRegCooldownUntil(0);
    }
    if (next === "reset") {
      setResetCode("");
      setResetNewPassword("");
      setResetStep("request");
      setResetCooldownUntil(0);
    }
  }

  async function doLogin() {
    clearMessages();

    const e = normalizedEmail;
    const p = loginPassword;

    if (!e || !p) return setError("Įvesk el. paštą ir slaptažodį.");
    if (!isEmail(e)) return setError("Neteisingas el. pašto formatas.");

    try {
      setLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p }),
      });

      if (!res.ok) {
        setError(await readError(res));
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Nepavyko prisijungti. Patikrink internetą ir bandyk dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  // REGISTER FLOW
  async function sendRegisterCode() {
    clearMessages();

    const e = normalizedEmail;
    const p = regPassword;

    if (!e || !p) return setError("Įvesk el. paštą ir slaptažodį.");
    if (!isEmail(e)) return setError("Neteisingas el. pašto formatas.");
    if (p.length < 8) return setError("Slaptažodis per trumpas (min 8 simboliai).");

    try {
      setLoading(true);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p }),
      });

      if (!res.ok) {
        setError(await readError(res));
        return;
      }

      setRegStep("verify");
      setInfo("Kodas išsiųstas į el. paštą. Įvesk 6 simbolių kodą.");
      setRegCooldownUntil(Date.now() + 30_000);
    } catch {
      setError("Nepavyko išsiųsti kodo. Bandyk dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyRegisterCode() {
    clearMessages();

    const e = normalizedEmail;
    const c = regCode.trim().toUpperCase().replace(/\s+/g, "");

    if (!e) return setError("Įvesk el. paštą.");
    if (!isEmail(e)) return setError("Neteisingas el. pašto formatas.");
    if (c.length !== 6) return setError("Kodas turi būti 6 simboliai.");

    try {
      setLoading(true);

      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, code: c }),
      });

      if (!res.ok) {
        setError(await readError(res));
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Nepavyko patvirtinti kodo. Bandyk dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  // RESET FLOW
  async function sendResetCode() {
    clearMessages();

    const e = normalizedEmail;
    if (!e) return setError("Įvesk el. paštą.");
    if (!isEmail(e)) return setError("Neteisingas el. pašto formatas.");

    try {
      setLoading(true);

      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e }),
      });

      if (!res.ok) {
        setError(await readError(res));
        return;
      }

      setResetStep("confirm");
      setInfo("Jei toks el. paštas egzistuoja, kodas išsiųstas. Įvesk 6 simbolių kodą.");
      setResetCooldownUntil(Date.now() + 30_000);
    } catch {
      setError("Nepavyko išsiųsti kodo. Bandyk dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmReset() {
    clearMessages();

    const e = normalizedEmail;
    const c = resetCode.trim().toUpperCase().replace(/\s+/g, "");
    const p = resetNewPassword;

    if (!e) return setError("Įvesk el. paštą.");
    if (!isEmail(e)) return setError("Neteisingas el. pašto formatas.");
    if (c.length !== 6) return setError("Kodas turi būti 6 simboliai.");
    if (p.length < 8) return setError("Slaptažodis per trumpas (min 8 simboliai).");

    try {
      setLoading(true);

      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, code: c, newPassword: p }),
      });

      if (!res.ok) {
        setError(await readError(res));
        return;
      }

      // reset endpointas uždeda session cookie -> užlogina
      router.replace("/");
      router.refresh();
    } catch {
      setError("Nepavyko pakeisti slaptažodžio. Bandyk dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <div className="text-xs text-zinc-500">Gym Log</div>
          <h1 className="text-2xl font-bold">Paskyra</h1>
          <p className="text-sm text-zinc-400">
            Prisijunk, susikurk paskyrą arba atstatyk slaptažodį.
          </p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-2">
          <button
            type="button"
            onClick={() => switchTab("login")}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-semibold transition",
              tab === "login"
                ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
                : "bg-zinc-900/40 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800/60"
            )}
          >
            Prisijungti
          </button>
          <button
            type="button"
            onClick={() => switchTab("register")}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-semibold transition",
              tab === "register"
                ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
                : "bg-zinc-900/40 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800/60"
            )}
          >
            Registruotis
          </button>
          <button
            type="button"
            onClick={() => switchTab("reset")}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-semibold transition",
              tab === "reset"
                ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
                : "bg-zinc-900/40 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800/60"
            )}
          >
            Atstatyti
          </button>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
          {/* Shared email */}
          <div>
            <label className="text-xs text-zinc-400">El. paštas</label>
            <input
              className="mt-1 w-full rounded-xl bg-zinc-800 px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="pvz. vardas@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              autoComplete="email"
              disabled={loading || (tab === "register" && regStep === "verify") || (tab === "reset" && resetStep === "confirm")}
            />
          </div>

          {/* LOGIN */}
          {tab === "login" && (
            <>
              <div>
                <label className="text-xs text-zinc-400">Slaptažodis</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl bg-zinc-800 px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Tavo slaptažodis"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              <button
                type="button"
                onClick={doLogin}
                disabled={loading}
                className={cn(
                  "w-full rounded-xl bg-white text-black py-3 font-semibold",
                  loading && "opacity-60 cursor-not-allowed"
                )}
              >
                {loading ? "Palauk..." : "Prisijungti"}
              </button>
            </>
          )}

          {/* REGISTER */}
          {tab === "register" && (
            <>
              {regStep === "form" ? (
                <>
                  <div>
                    <label className="text-xs text-zinc-400">Slaptažodis (min 8)</label>
                    <input
                      type="password"
                      className="mt-1 w-full rounded-xl bg-zinc-800 px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Sugalvok slaptažodį"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={sendRegisterCode}
                    disabled={loading}
                    className={cn(
                      "w-full rounded-xl bg-emerald-500 text-zinc-950 py-3 font-semibold hover:bg-emerald-400 transition",
                      loading && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {loading ? "Siunčiama..." : "Siųsti patvirtinimo kodą"}
                  </button>

                  <div className="text-xs text-zinc-500">
                    Į el. paštą atsiųsim 6 simbolių kodą (raidės + skaičiai).
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-zinc-400">Kodas (6 simboliai)</label>
                    <input
                      className="mt-1 w-full rounded-xl bg-zinc-800 px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500 tracking-widest uppercase"
                      placeholder="pvz. A7K2P9"
                      value={regCode}
                      onChange={(e) => setRegCode(e.target.value.toUpperCase())}
                      autoComplete="one-time-code"
                      disabled={loading}
                    />
                    <div className="mt-2 text-xs text-zinc-500">
                      Patikrink Spam/Promotions, jei nematai laiško.
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={sendRegisterCode}
                      disabled={loading || regCooldownLeft > 0}
                      className={cn(
                        "text-sm rounded-xl px-3 py-2 border border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800 transition",
                        (loading || regCooldownLeft > 0) && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {regCooldownLeft > 0 ? `Siųsti dar kartą (${regCooldownLeft}s)` : "Siųsti dar kartą"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        clearMessages();
                        setRegStep("form");
                        setRegCode("");
                        setRegCooldownUntil(0);
                      }}
                      disabled={loading}
                      className={cn(
                        "text-sm rounded-xl px-3 py-2 border border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800 transition",
                        loading && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      Atgal
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={verifyRegisterCode}
                    disabled={loading}
                    className={cn(
                      "w-full rounded-xl bg-white text-black py-3 font-semibold",
                      loading && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {loading ? "Tikrinama..." : "Patvirtinti ir sukurti paskyrą"}
                  </button>
                </>
              )}
            </>
          )}

          {/* RESET */}
          {tab === "reset" && (
            <>
              {resetStep === "request" ? (
                <>
                  <button
                    type="button"
                    onClick={sendResetCode}
                    disabled={loading}
                    className={cn(
                      "w-full rounded-xl bg-white text-black py-3 font-semibold",
                      loading && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {loading ? "Siunčiama..." : "Gauti atstatymo kodą"}
                  </button>

                  <div className="text-xs text-zinc-500">
                    Įvesk el. paštą — atsiųsim 6 simbolių kodą slaptažodžio pakeitimui.
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-zinc-400">Kodas (6 simboliai)</label>
                    <input
                      className="mt-1 w-full rounded-xl bg-zinc-800 px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500 tracking-widest uppercase"
                      placeholder="pvz. A7K2P9"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                      autoComplete="one-time-code"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400">Naujas slaptažodis (min 8)</label>
                    <input
                      type="password"
                      className="mt-1 w-full rounded-xl bg-zinc-800 px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Naujas slaptažodis"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={sendResetCode}
                      disabled={loading || resetCooldownLeft > 0}
                      className={cn(
                        "text-sm rounded-xl px-3 py-2 border border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800 transition",
                        (loading || resetCooldownLeft > 0) && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {resetCooldownLeft > 0 ? `Siųsti dar kartą (${resetCooldownLeft}s)` : "Siųsti dar kartą"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        clearMessages();
                        setResetStep("request");
                        setResetCode("");
                        setResetNewPassword("");
                        setResetCooldownUntil(0);
                      }}
                      disabled={loading}
                      className={cn(
                        "text-sm rounded-xl px-3 py-2 border border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800 transition",
                        loading && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      Atgal
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={confirmReset}
                    disabled={loading}
                    className={cn(
                      "w-full rounded-xl bg-emerald-500 text-zinc-950 py-3 font-semibold hover:bg-emerald-400 transition",
                      loading && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {loading ? "Keičiama..." : "Pakeisti slaptažodį ir prisijungti"}
                  </button>
                </>
              )}
            </>
          )}

          {error && <div className="text-sm text-red-400">{error}</div>}
          {info && <div className="text-sm text-emerald-300">{info}</div>}
        </div>

        <div className="text-xs text-zinc-500">
          Kodai galioja ~10 min. Jei negauni laiško – patikrink Spam/Promotions.
        </div>
      </div>
    </div>
  );
}
