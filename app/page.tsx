"use client";

import { useEffect, useMemo, useState } from "react";

/* ================= TIPAI ================= */

type Equipment = "machine" | "cable" | "dumbbell" | "barbell" | "bodyweight" | "other";
type Muscle = "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "fullbody" | "other";

type Exercise = {
  id: string;
  name: string;
  equipment: Equipment;
  muscle: Muscle;
  notes?: string;
  imageUrl?: string;
};

type LogEntry = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  dateTimeISO: string;
  weightKg: number;
  reps: number;
  comment?: string;
};

type BodyWeightEntry = {
  id: string;
  dateISO: string; // YYYY-MM-DD
  weightKg: number;
  note?: string;
};

type BodyMeasureEntry = {
  id: string;
  dateISO: string; // YYYY-MM-DD
  waistCm?: number; // liemuo
  chestCm?: number; // krūtinė
  armCm?: number; // ranka
  thighCm?: number; // šlaunis
  hipsCm?: number; // klubai
  note?: string;
};

type View = "treniruote" | "kunas";

/* ================= RAKTAI ================= */

const LOGS_KEY = "gym_logs_v4";
const EXERCISES_KEY = "gym_exercises_v4";
const SHORTLIST_KEY = "gym_shortlist_v4";

const BODY_WEIGHT_KEY = "gym_body_weight_v1";
const BODY_MEASURES_KEY = "gym_body_measures_v1";

/* ================= DEFAULT PRATIMAI ================= */

const DEFAULT_EXERCISES: Exercise[] = [
  { id: "bench-press", name: "Spaudimas su štanga", equipment: "barbell", muscle: "chest" },
  { id: "incline-db-press", name: "Spaudimas su hanteliais įkalnėje", equipment: "dumbbell", muscle: "chest" },
  { id: "lat-pulldown", name: "Viršutinė trauka", equipment: "machine", muscle: "back" },
  { id: "seated-row", name: "Sėdima trauka", equipment: "cable", muscle: "back" },
  { id: "back-squat", name: "Pritūpimai su štanga", equipment: "barbell", muscle: "legs" },
  { id: "leg-press", name: "Kojų spaudimas", equipment: "machine", muscle: "legs" },
  { id: "shoulder-press", name: "Pečių spaudimas (aparatas)", equipment: "machine", muscle: "shoulders" },
  { id: "db-lateral-raise", name: "Šoninis kėlimas su hanteliais", equipment: "dumbbell", muscle: "shoulders" },
  { id: "triceps-pushdown", name: "Tricepsų stūmimas lynu", equipment: "cable", muscle: "arms" },
  { id: "db-curl", name: "Rankų lenkimas su hanteliais", equipment: "dumbbell", muscle: "arms" },
  { id: "plank", name: "Lenta", equipment: "bodyweight", muscle: "core" },
];

/* ================= PAGALBINĖS ================= */

const todayKey = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const load = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const save = (key: string, value: any) => localStorage.setItem(key, JSON.stringify(value));
const uid = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const muscleLabel: Record<Muscle, string> = {
  chest: "Krūtinė",
  back: "Nugara",
  legs: "Kojos",
  shoulders: "Pečiai",
  arms: "Rankos",
  core: "Korsetas",
  fullbody: "Visas kūnas",
  other: "Kita",
};

const equipmentLabel: Record<Equipment, string> = {
  machine: "Aparatas",
  cable: "Lynai",
  dumbbell: "Hanteliai",
  barbell: "Štanga",
  bodyweight: "Savo svoris",
  other: "Kita",
};

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("lt-LT");
  } catch {
    return iso;
  }
}

function fmtDate(yyyyMmDd: string) {
  try {
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    return dt.toLocaleDateString("lt-LT", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return yyyyMmDd;
  }
}

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function groupLogsByDayGeneric<T extends { dateISO?: string; dateTimeISO?: string }>(entries: T[]) {
  // entries turi būti surūšiuoti nuo naujausių iki seniausių
  const groups: Array<{ day: string; items: T[] }> = [];
  for (const e of entries) {
    const iso = (e as any).dateISO ?? (e as any).dateTimeISO ?? "";
    const day = String(iso).slice(0, 10);
    const last = groups[groups.length - 1];
    if (!last || last.day !== day) groups.push({ day, items: [e] });
    else last.items.push(e);
  }
  return groups;
}

/* ================= UI ATOMAI ================= */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900/60 px-2.5 py-1 text-[11px] text-zinc-300">
      {children}
    </span>
  );
}

function IconTile({ imageUrl }: { imageUrl?: string }) {
  return (
    <div className="h-11 w-11 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/60">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-sm text-zinc-500">📷</div>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <label className="text-xs text-zinc-400">{label}</label>
      <input
        className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-emerald-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="text-xs text-zinc-400">{label}</label>
      <textarea
        className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-emerald-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 active:scale-[0.99] transition",
        className
      )}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border border-zinc-700 bg-zinc-900/40 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 active:scale-[0.99] transition",
        className
      )}
    >
      {children}
    </button>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-semibold transition",
        active
          ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
          : "bg-zinc-900/40 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800/60"
      )}
    >
      {children}
    </button>
  );
}

/* ================= PUSLAPIS ================= */

export default function Page() {
  // view
  const [view, setView] = useState<View>("treniruote");

  // treniruote
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [muscleFilter, setMuscleFilter] = useState<Muscle | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // modal: naujas pratimas
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState<Muscle>("chest");
  const [newEquipment, setNewEquipment] = useState<Equipment>("machine");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // log form
  const [weightKg, setWeightKg] = useState("");
  const [reps, setReps] = useState("");
  const [comment, setComment] = useState("");

  // kūnas
  const [bodyWeights, setBodyWeights] = useState<BodyWeightEntry[]>([]);
  const [bodyMeasures, setBodyMeasures] = useState<BodyMeasureEntry[]>([]);

  const [bwWeight, setBwWeight] = useState(""); // įvedamas svoris
  const [bwNote, setBwNote] = useState("");

  const [mWaist, setMWaist] = useState("");
  const [mChest, setMChest] = useState("");
  const [mArm, setMArm] = useState("");
  const [mThigh, setMThigh] = useState("");
  const [mHips, setMHips] = useState("");
  const [mNote, setMNote] = useState("");

  useEffect(() => {
    // pratimai
    const loadedExercises = load<Exercise[]>(EXERCISES_KEY, []);
    const initialExercises = loadedExercises.length ? loadedExercises : DEFAULT_EXERCISES;
    setExercises(initialExercises);
    save(EXERCISES_KEY, initialExercises);

    setLogs(load(LOGS_KEY, []));

    const allShortlists = load<Record<string, string[]>>(SHORTLIST_KEY, {});
    setShortlist(allShortlists[todayKey()] ?? []);

    // kūnas
    const bw = load<BodyWeightEntry[]>(BODY_WEIGHT_KEY, []);
    const bm = load<BodyMeasureEntry[]>(BODY_MEASURES_KEY, []);
    // laikom naujausius viršuje
    setBodyWeights([...bw].sort((a, b) => b.dateISO.localeCompare(a.dateISO)));
    setBodyMeasures([...bm].sort((a, b) => b.dateISO.localeCompare(a.dateISO)));
  }, []);

  /* ======= TRENIRUOTĖ: skaičiavimai ======= */

  const selectedExercise = useMemo(
    () => exercises.find((e) => e.id === selectedId) ?? null,
    [exercises, selectedId]
  );

  const filteredExercises = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises
      .filter((e) => {
        const matchQuery = !q || e.name.toLowerCase().includes(q);
        const matchMuscle = muscleFilter === "all" || e.muscle === muscleFilter;
        return matchQuery && matchMuscle;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "lt-LT"));
  }, [exercises, query, muscleFilter]);

  const lastForExercise = useMemo(() => {
    const map = new Map<string, LogEntry>();
    [...logs]
      .sort((a, b) => b.dateTimeISO.localeCompare(a.dateTimeISO))
      .forEach((l) => {
        if (!map.has(l.exerciseId)) map.set(l.exerciseId, l);
      });
    return map;
  }, [logs]);

  const latestDaySummaryByExercise = useMemo(() => {
    const byEx = new Map<string, LogEntry[]>();
    for (const l of logs) {
      const arr = byEx.get(l.exerciseId) ?? [];
      arr.push(l);
      byEx.set(l.exerciseId, arr);
    }

    const result = new Map<string, { day: string; setsText: string }>();
    for (const [exerciseId, arr] of byEx.entries()) {
      const sorted = [...arr].sort((a, b) => b.dateTimeISO.localeCompare(a.dateTimeISO));
      if (sorted.length === 0) continue;

      const latestDay = sorted[0].dateTimeISO.slice(0, 10);
      const sameDay = sorted.filter((x) => x.dateTimeISO.slice(0, 10) === latestDay);
      const ordered = [...sameDay].sort((a, b) => a.weightKg - b.weightKg);
      const setsText = ordered.map((x) => `${x.weightKg}×${x.reps}`).join(" • ");

      result.set(exerciseId, { day: latestDay, setsText });
    }
    return result;
  }, [logs]);

  const historyForSelected = useMemo(() => {
    if (!selectedExercise) return [];
    return [...logs]
      .filter((l) => l.exerciseId === selectedExercise.id)
      .sort((a, b) => b.dateTimeISO.localeCompare(a.dateTimeISO));
  }, [logs, selectedExercise]);

  const groupedHistoryForSelected = useMemo(() => groupLogsByDayGeneric(historyForSelected), [historyForSelected]);

  /* ======= KŪNAS: skaičiavimai ======= */

  const latestBodyWeight = bodyWeights[0] ?? null;
  const groupedBodyWeights = useMemo(() => groupLogsByDayGeneric(bodyWeights), [bodyWeights]);

  const latestMeasures = bodyMeasures[0] ?? null;
  const groupedBodyMeasures = useMemo(() => groupLogsByDayGeneric(bodyMeasures), [bodyMeasures]);

  /* ================= FUNKCIJOS ================= */

  function toggleShortlist(id: string) {
    const next = shortlist.includes(id) ? shortlist.filter((x) => x !== id) : [...shortlist, id];
    setShortlist(next);

    const all = load<Record<string, string[]>>(SHORTLIST_KEY, {});
    all[todayKey()] = next;
    save(SHORTLIST_KEY, all);
  }

  function openExercise(id: string) {
    setView("treniruote");
    setSelectedId(id);
    const last = lastForExercise.get(id);
    setWeightKg(last ? String(last.weightKg) : "");
    setReps(last ? String(last.reps) : "");
    setComment("");
  }

  function saveSet() {
    if (!selectedExercise) return;

    const w = Number(weightKg);
    const r = Number(reps);

    if (!Number.isFinite(w) || w < 0) return alert('Įvesk svorį (kg). Jei "savo svoris" – gali rašyti 0.');
    if (!Number.isInteger(r) || r <= 0) return alert("Įvesk pakartojimų skaičių (teigiamas sveikas skaičius).");

    const entry: LogEntry = {
      id: uid(),
      exerciseId: selectedExercise.id,
      exerciseName: selectedExercise.name,
      dateTimeISO: new Date().toISOString(),
      weightKg: w,
      reps: r,
      comment: comment.trim() ? comment.trim() : undefined,
    };

    const next = [entry, ...logs];
    setLogs(next);
    save(LOGS_KEY, next);
    setComment("");
  }

  function createExercise() {
    const name = newName.trim();
    if (!name) return alert("Įvesk pratimo pavadinimą.");

    const ex: Exercise = {
      id: uid(),
      name,
      muscle: newMuscle,
      equipment: newEquipment,
      imageUrl: newImageUrl.trim() ? newImageUrl.trim() : undefined,
      notes: newNotes.trim() ? newNotes.trim() : undefined,
    };

    const next = [ex, ...exercises];
    setExercises(next);
    save(EXERCISES_KEY, next);

    setShowCreate(false);
    setNewName("");
    setNewImageUrl("");
    setNewNotes("");
    setNewMuscle("chest");
    setNewEquipment("machine");
  }

  function prefillBodyFromLast() {
    // patogumas: užpildom iš paskutinio įrašo (jei yra)
    if (latestBodyWeight) setBwWeight(String(latestBodyWeight.weightKg));
    if (latestMeasures) {
      setMWaist(latestMeasures.waistCm != null ? String(latestMeasures.waistCm) : "");
      setMChest(latestMeasures.chestCm != null ? String(latestMeasures.chestCm) : "");
      setMArm(latestMeasures.armCm != null ? String(latestMeasures.armCm) : "");
      setMThigh(latestMeasures.thighCm != null ? String(latestMeasures.thighCm) : "");
      setMHips(latestMeasures.hipsCm != null ? String(latestMeasures.hipsCm) : "");
    }
  }

  function saveBodyWeight() {
    const w = Number(bwWeight);
    if (!Number.isFinite(w) || w <= 0) return alert("Įvesk teisingą kūno svorį (kg).");

    const entry: BodyWeightEntry = {
      id: uid(),
      dateISO: todayKey(),
      weightKg: w,
      note: bwNote.trim() ? bwNote.trim() : undefined,
    };

    const next = [entry, ...bodyWeights].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    setBodyWeights(next);
    save(BODY_WEIGHT_KEY, next);

    setBwNote("");
  }

  function toNumOrUndef(s: string): number | undefined {
    const t = s.trim();
    if (!t) return undefined;
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return n;
  }

  function saveMeasures() {
    const entry: BodyMeasureEntry = {
      id: uid(),
      dateISO: todayKey(),
      waistCm: toNumOrUndef(mWaist),
      chestCm: toNumOrUndef(mChest),
      armCm: toNumOrUndef(mArm),
      thighCm: toNumOrUndef(mThigh),
      hipsCm: toNumOrUndef(mHips),
      note: mNote.trim() ? mNote.trim() : undefined,
    };

    const hasAny =
      entry.waistCm != null ||
      entry.chestCm != null ||
      entry.armCm != null ||
      entry.thighCm != null ||
      entry.hipsCm != null ||
      !!entry.note;

    if (!hasAny) return alert("Įvesk bent vieną matmenį arba pastabą.");

    const next = [entry, ...bodyMeasures].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    setBodyMeasures(next);
    save(BODY_MEASURES_KEY, next);

    setMNote("");
  }

  /* ================= RENDER ================= */

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-zinc-500">Telefonui + kompiuteriui</div>
              <h1 className="mt-1 flex items-center gap-2 text-lg font-semibold">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                  🏋️
                </span>
                Gym žurnalas
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <TabButton active={view === "treniruote"} onClick={() => setView("treniruote")}>
                Treniruotė
              </TabButton>
              <TabButton
                active={view === "kunas"}
                onClick={() => {
                  setView("kunas");
                  prefillBodyFromLast();
                }}
              >
                Kūnas
              </TabButton>

              {view === "treniruote" && (
                <PrimaryButton onClick={() => setShowCreate(true)} className="px-3 py-2">
                  + Naujas pratimas
                </PrimaryButton>
              )}
            </div>
          </div>

          {/* TRENIRUOTĖ: filtrai */}
          {view === "treniruote" && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-1">
                <label className="text-xs text-zinc-400">Raumenų grupė</label>
                <select
                  className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={muscleFilter}
                  onChange={(e) => setMuscleFilter(e.target.value as any)}
                >
                  <option value="all">Visos</option>
                  {Object.entries(muscleLabel).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-zinc-400">Paieška</label>
                <input
                  className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ieškoti pratimo…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-5xl px-4 py-4">
        {/* ======= VIEW: TRENIRUOTĖ ======= */}
        {view === "treniruote" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* KAIRĖ */}
            <section className="space-y-4">
              {shortlist.length > 0 && (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold">Šiandienos sąrašas</div>
                    <Badge>{shortlist.length} vnt.</Badge>
                  </div>

                  <div className="grid gap-2">
                    {exercises
                      .filter((e) => shortlist.includes(e.id))
                      .map((e) => (
                        <button
                          key={e.id}
                          onClick={() => openExercise(e.id)}
                          className="group flex w-full items-center gap-3 rounded-2xl bg-zinc-900/40 px-3 py-2 text-left ring-1 ring-zinc-800 hover:bg-zinc-800/60 transition"
                        >
                          <IconTile imageUrl={e.imageUrl} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-zinc-100">{e.name}</div>
                            <div className="mt-0.5 text-xs text-zinc-400">
                              {muscleLabel[e.muscle]} • {equipmentLabel[e.equipment]}
                            </div>
                          </div>
                          <div className="text-zinc-500 group-hover:text-zinc-300">→</div>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold">Visi pratimai</div>
                  <Badge>{filteredExercises.length} vnt.</Badge>
                </div>

                <div className="grid gap-2">
                  {filteredExercises.map((e) => {
                    const isSelected = selectedId === e.id;
                    const summary = latestDaySummaryByExercise.get(e.id);

                    return (
                      <div
                        key={e.id}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-3 py-2 ring-1 transition",
                          isSelected
                            ? "bg-emerald-500/10 ring-emerald-500/40"
                            : "bg-zinc-900/40 ring-zinc-800 hover:bg-zinc-800/60"
                        )}
                      >
                        <button
                          onClick={() => openExercise(e.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <IconTile imageUrl={e.imageUrl} />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-zinc-100">{e.name}</div>
                            <div className="mt-0.5 text-xs text-zinc-400">
                              {muscleLabel[e.muscle]} • {equipmentLabel[e.equipment]}
                            </div>

                            {summary && (
                              <div className="mt-1 text-xs text-zinc-300">
                                Paskutinė diena:{" "}
                                <span className="font-semibold text-zinc-100">{summary.setsText}</span>{" "}
                                <span className="text-zinc-500">({summary.day})</span>
                              </div>
                            )}
                          </div>
                        </button>

                        <button
                          onClick={() => toggleShortlist(e.id)}
                          className={cn(
                            "rounded-xl px-2 py-1 text-lg transition",
                            shortlist.includes(e.id) ? "text-yellow-300" : "text-zinc-600 hover:text-zinc-300"
                          )}
                          title="Pridėti/pašalinti iš šiandienos sąrašo"
                        >
                          {shortlist.includes(e.id) ? "★" : "☆"}
                        </button>
                      </div>
                    );
                  })}

                  {filteredExercises.length === 0 && (
                    <div className="rounded-2xl bg-zinc-900/50 p-4 text-sm text-zinc-400 ring-1 ring-zinc-800">
                      Nieko nerasta.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* DEŠINĖ */}
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-4 md:sticky md:top-[140px] md:self-start">
              {!selectedExercise ? (
                <div className="rounded-2xl bg-zinc-900/50 p-4 text-sm text-zinc-400 ring-1 ring-zinc-800">
                  Pasirink pratimą kairėje, kad galėtum greitai įrašyti setą ir matyti istoriją.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
                      {selectedExercise.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectedExercise.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-sm text-zinc-500">📷</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-semibold">{selectedExercise.name}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge>{muscleLabel[selectedExercise.muscle]}</Badge>
                        <Badge>{equipmentLabel[selectedExercise.equipment]}</Badge>
                      </div>
                      {selectedExercise.notes && <div className="mt-2 text-sm text-zinc-300">{selectedExercise.notes}</div>}
                    </div>

                    <SecondaryButton onClick={() => setSelectedId(null)} className="px-3 py-2">
                      Uždaryti
                    </SecondaryButton>
                  </div>

                  {/* LOG */}
                  <div className="rounded-3xl bg-zinc-900/50 p-4 ring-1 ring-zinc-800">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold">Įrašyti setą</div>
                      <Badge>{historyForSelected.length} įrašai</Badge>
                    </div>

                    {historyForSelected.length > 0 && (
                      <div className="mb-3 rounded-2xl bg-zinc-950/40 p-3 ring-1 ring-zinc-800">
                        <div className="text-xs font-semibold text-zinc-400">Paskutiniai įrašai</div>
                        <div className="mt-2 grid gap-2">
                          {historyForSelected.slice(0, 3).map((l) => (
                            <div key={l.id} className="flex items-baseline justify-between gap-3">
                              <div className="font-semibold text-zinc-100">
                                {l.weightKg} kg × {l.reps}
                              </div>
                              <div className="text-xs text-zinc-500">{fmtDateTime(l.dateTimeISO)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Input label="Svoris (kg)" value={weightKg} onChange={setWeightKg} placeholder="pvz. 60" inputMode="decimal" />
                      <Input label="Pakartojimai" value={reps} onChange={setReps} placeholder="pvz. 8" inputMode="numeric" />
                      <div className="col-span-2">
                        <Input
                          label="Komentaras (nebūtina)"
                          value={comment}
                          onChange={setComment}
                          placeholder="pvz. lengva / lėtas tempas…"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <PrimaryButton onClick={saveSet} className="flex-1 py-3 text-base">
                        Išsaugoti
                      </PrimaryButton>
                      <SecondaryButton
                        onClick={() => {
                          setWeightKg("");
                          setReps("");
                          setComment("");
                        }}
                        className="py-3"
                      >
                        Išvalyti
                      </SecondaryButton>
                    </div>

                    <div className="mt-2 text-xs text-zinc-500">
                      Patarimas: “Savo svorio” pratimams rašyk <span className="font-semibold text-zinc-300">0 kg</span>.
                    </div>
                  </div>

                  {/* ISTORIJA */}
                  <div className="rounded-3xl bg-zinc-900/50 p-4 ring-1 ring-zinc-800">
                    <div className="mb-3 text-sm font-semibold">Istorija</div>

                    {historyForSelected.length === 0 ? (
                      <div className="text-sm text-zinc-400">Šitam pratimui dar nėra įrašų.</div>
                    ) : (
                      <div className="max-h-[360px] overflow-auto rounded-2xl bg-zinc-950/30 ring-1 ring-zinc-800">
                        <div className="divide-y divide-zinc-800">
                          {groupedHistoryForSelected.slice(0, 14).map((g) => (
                            <div key={g.day} className="p-3">
                              <div className="mb-2 flex items-baseline justify-between">
                                <div className="text-sm font-semibold text-zinc-100">{fmtDate(g.day)}</div>
                                <div className="text-xs text-zinc-500">{g.day}</div>
                              </div>

                              <div className="grid gap-2">
                                {g.items.map((l: any) => (
                                  <div key={l.id} className="rounded-2xl bg-zinc-950/30 p-3 ring-1 ring-zinc-800">
                                    <div className="flex items-baseline justify-between gap-3">
                                      <div className="font-semibold text-zinc-100">
                                        {l.weightKg} kg × {l.reps}
                                      </div>
                                      <div className="text-xs text-zinc-500">{fmtDateTime(l.dateTimeISO)}</div>
                                    </div>
                                    {l.comment && <div className="mt-1 text-sm text-zinc-300">{l.comment}</div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {groupedHistoryForSelected.length > 14 && (
                      <div className="mt-2 text-xs text-zinc-500">Rodomos paskutinės 14 dienų grupių.</div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ======= VIEW: KŪNAS ======= */}
        {view === "kunas" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* SVORIS */}
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Kūno svoris</div>
                  <div className="text-xs text-zinc-500">Greitas įrašymas (šiandien)</div>
                </div>
                <Badge>{bodyWeights.length} įrašai</Badge>
              </div>

              {latestBodyWeight && (
                <div className="mt-3 rounded-2xl bg-zinc-900/50 p-3 ring-1 ring-zinc-800">
                  <div className="text-xs text-zinc-400">Paskutinis</div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <div className="text-lg font-semibold text-zinc-100">{latestBodyWeight.weightKg} kg</div>
                    <div className="text-xs text-zinc-500">{latestBodyWeight.dateISO}</div>
                  </div>
                  {latestBodyWeight.note && <div className="mt-1 text-sm text-zinc-300">{latestBodyWeight.note}</div>}
                </div>
              )}

              <div className="mt-3 grid gap-2">
                <Input
                  label="Svoris (kg)"
                  value={bwWeight}
                  onChange={setBwWeight}
                  placeholder="pvz. 84.2"
                  inputMode="decimal"
                />
                <Input
                  label="Pastaba (nebūtina)"
                  value={bwNote}
                  onChange={setBwNote}
                  placeholder="pvz. po treniruotės / ryte nevalgęs…"
                />
              </div>

              <div className="mt-3 flex gap-2">
                <PrimaryButton onClick={saveBodyWeight} className="flex-1 py-3 text-base">
                  Išsaugoti svorį
                </PrimaryButton>
                <SecondaryButton onClick={() => { setBwWeight(""); setBwNote(""); }} className="py-3">
                  Išvalyti
                </SecondaryButton>
              </div>

              {/* Istorija */}
              <div className="mt-4 rounded-3xl bg-zinc-900/50 p-4 ring-1 ring-zinc-800">
                <div className="mb-2 text-sm font-semibold">Svorio istorija</div>
                {bodyWeights.length === 0 ? (
                  <div className="text-sm text-zinc-400">Dar nėra įrašų.</div>
                ) : (
                  <div className="max-h-[360px] overflow-auto rounded-2xl bg-zinc-950/30 ring-1 ring-zinc-800">
                    <div className="divide-y divide-zinc-800">
                      {groupedBodyWeights.slice(0, 30).map((g) => (
                        <div key={g.day} className="p-3">
                          <div className="mb-2 flex items-baseline justify-between">
                            <div className="text-sm font-semibold text-zinc-100">{fmtDate(g.day)}</div>
                            <div className="text-xs text-zinc-500">{g.day}</div>
                          </div>
                          <div className="grid gap-2">
                            {(g.items as any as BodyWeightEntry[]).map((it) => (
                              <div key={it.id} className="rounded-2xl bg-zinc-950/30 p-3 ring-1 ring-zinc-800">
                                <div className="flex items-baseline justify-between gap-3">
                                  <div className="font-semibold text-zinc-100">{it.weightKg} kg</div>
                                  <div className="text-xs text-zinc-500">{it.dateISO}</div>
                                </div>
                                {it.note && <div className="mt-1 text-sm text-zinc-300">{it.note}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {groupedBodyWeights.length > 30 && (
                  <div className="mt-2 text-xs text-zinc-500">Rodomos paskutinės 30 dienų grupių.</div>
                )}
              </div>
            </section>

            {/* MATMENYS */}
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Kūno matmenys</div>
                  <div className="text-xs text-zinc-500">Užpildyk ką matuoji (nebūtina viską)</div>
                </div>
                <Badge>{bodyMeasures.length} įrašai</Badge>
              </div>

              {latestMeasures && (
                <div className="mt-3 rounded-2xl bg-zinc-900/50 p-3 ring-1 ring-zinc-800">
                  <div className="text-xs text-zinc-400">Paskutiniai</div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <div className="text-sm font-semibold text-zinc-100">{latestMeasures.dateISO}</div>
                    <div className="text-xs text-zinc-500">{fmtDate(latestMeasures.dateISO)}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-300">
                    {latestMeasures.waistCm != null && <Badge>Liemuo: {latestMeasures.waistCm} cm</Badge>}
                    {latestMeasures.chestCm != null && <Badge>Krūtinė: {latestMeasures.chestCm} cm</Badge>}
                    {latestMeasures.armCm != null && <Badge>Ranka: {latestMeasures.armCm} cm</Badge>}
                    {latestMeasures.thighCm != null && <Badge>Šlaunis: {latestMeasures.thighCm} cm</Badge>}
                    {latestMeasures.hipsCm != null && <Badge>Klubai: {latestMeasures.hipsCm} cm</Badge>}
                  </div>
                  {latestMeasures.note && <div className="mt-2 text-sm text-zinc-300">{latestMeasures.note}</div>}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Input label="Liemuo (cm)" value={mWaist} onChange={setMWaist} placeholder="pvz. 86" inputMode="decimal" />
                <Input label="Krūtinė (cm)" value={mChest} onChange={setMChest} placeholder="pvz. 104" inputMode="decimal" />
                <Input label="Ranka (cm)" value={mArm} onChange={setMArm} placeholder="pvz. 36" inputMode="decimal" />
                <Input label="Šlaunis (cm)" value={mThigh} onChange={setMThigh} placeholder="pvz. 58" inputMode="decimal" />
                <Input label="Klubai (cm)" value={mHips} onChange={setMHips} placeholder="pvz. 98" inputMode="decimal" />
                <div className="col-span-2">
                  <Input label="Pastaba (nebūtina)" value={mNote} onChange={setMNote} placeholder="pvz. ryte / po valgio…" />
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <PrimaryButton onClick={saveMeasures} className="flex-1 py-3 text-base">
                  Išsaugoti matmenis
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => {
                    setMWaist("");
                    setMChest("");
                    setMArm("");
                    setMThigh("");
                    setMHips("");
                    setMNote("");
                  }}
                  className="py-3"
                >
                  Išvalyti
                </SecondaryButton>
              </div>

              {/* Matmenų istorija */}
              <div className="mt-4 rounded-3xl bg-zinc-900/50 p-4 ring-1 ring-zinc-800">
                <div className="mb-2 text-sm font-semibold">Matmenų istorija</div>
                {bodyMeasures.length === 0 ? (
                  <div className="text-sm text-zinc-400">Dar nėra įrašų.</div>
                ) : (
                  <div className="max-h-[360px] overflow-auto rounded-2xl bg-zinc-950/30 ring-1 ring-zinc-800">
                    <div className="divide-y divide-zinc-800">
                      {groupedBodyMeasures.slice(0, 30).map((g) => (
                        <div key={g.day} className="p-3">
                          <div className="mb-2 flex items-baseline justify-between">
                            <div className="text-sm font-semibold text-zinc-100">{fmtDate(g.day)}</div>
                            <div className="text-xs text-zinc-500">{g.day}</div>
                          </div>

                          <div className="grid gap-2">
                            {(g.items as any as BodyMeasureEntry[]).map((it) => (
                              <div key={it.id} className="rounded-2xl bg-zinc-950/30 p-3 ring-1 ring-zinc-800">
                                <div className="flex flex-wrap gap-2">
                                  {it.waistCm != null && <Badge>Liemuo: {it.waistCm} cm</Badge>}
                                  {it.chestCm != null && <Badge>Krūtinė: {it.chestCm} cm</Badge>}
                                  {it.armCm != null && <Badge>Ranka: {it.armCm} cm</Badge>}
                                  {it.thighCm != null && <Badge>Šlaunis: {it.thighCm} cm</Badge>}
                                  {it.hipsCm != null && <Badge>Klubai: {it.hipsCm} cm</Badge>}
                                </div>
                                {it.note && <div className="mt-2 text-sm text-zinc-300">{it.note}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {groupedBodyMeasures.length > 30 && (
                  <div className="mt-2 text-xs text-zinc-500">Rodomos paskutinės 30 dienų grupių.</div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* MODAL: NAUJAS PRATIMAS */}
      {showCreate && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/75 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-zinc-400">Pridėti pratimą</div>
                <div className="text-lg font-semibold">Naujas pratimas</div>
              </div>
              <SecondaryButton onClick={() => setShowCreate(false)} className="px-3 py-2">
                Uždaryti
              </SecondaryButton>
            </div>

            <div className="mt-4 grid gap-3">
              <Input label="Pavadinimas" value={newName} onChange={setNewName} placeholder="pvz. Kojų tiesimas aparate" />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400">Raumenų grupė</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newMuscle}
                    onChange={(e) => setNewMuscle(e.target.value as Muscle)}
                  >
                    {Object.entries(muscleLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Įranga</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newEquipment}
                    onChange={(e) => setNewEquipment(e.target.value as Equipment)}
                  >
                    {Object.entries(equipmentLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input label="Nuotraukos URL (nebūtina)" value={newImageUrl} onChange={setNewImageUrl} placeholder="pvz. https://..." />
              <Textarea label="Pastabos (nebūtina)" value={newNotes} onChange={setNewNotes} placeholder="pvz. lėtas nusileidimas…" rows={3} />
            </div>

            <div className="mt-4 flex gap-2">
              <PrimaryButton onClick={createExercise} className="flex-1 py-3 text-base">
                Išsaugoti pratimą
              </PrimaryButton>
              <SecondaryButton onClick={() => setShowCreate(false)} className="py-3">
                Atšaukti
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
