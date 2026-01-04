"use client";

import { useEffect, useMemo, useState } from "react";
import type { Exercise, Equipment, Muscle, LogEntry } from "@/components/app/types";
import { ExerciseList } from "@/components/exercises/ExerciseList";
import { ExerciseDetails } from "@/components/exercises/ExerciseDetails";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Buttons";
import { Input, Textarea } from "@/components/ui/Inputs";
import { muscleLabel, equipmentLabel } from "@/components/app/labels";

type View = "treniruote"; // kol kas MVP tik treniruotė (kūną pridėsim po to)

async function readError(res: Response) {
  try {
    const data = await res.json();
    return data?.error ?? "Įvyko klaida.";
  } catch {
    return "Įvyko klaida.";
  }
}

export default function HomeClient() {
  const [view] = useState<View>("treniruote");

  const [recent, setRecent] = useState<Exercise[]>([]);
  const [others, setOthers] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedExercise = useMemo(
    () => [...recent, ...others].find((e) => e.id === selectedId) ?? null,
    [recent, others, selectedId]
  );

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [muscleFilter, setMuscleFilter] = useState<Muscle | "all">("all");
  const [query, setQuery] = useState("");

  // modal create private exercise
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState<Muscle>("chest");
  const [newEquipment, setNewEquipment] = useState<Equipment>("machine");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newNotes, setNewNotes] = useState("");

  async function loadExercises() {
    setLoadingExercises(true);
    try {
      const res = await fetch("/api/app/exercises", { cache: "no-store" });
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      setRecent(data.recent ?? []);
      setOthers(data.others ?? []);
    } finally {
      setLoadingExercises(false);
    }
  }

  async function loadLogs(exerciseId: string) {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/app/logs?exerciseId=${encodeURIComponent(exerciseId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await readError(res));
      const data = await res.json();
      setLogs(data.logs ?? []);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    loadExercises();
  }, []);

  async function pickExercise(id: string) {
    setSelectedId(id);
    await loadLogs(id);
  }

  async function saveSet(payload: { exerciseId: string; weightKg: number; reps: number; comment?: string }) {
    const res = await fetch("/api/app/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert(await readError(res));
      return;
    }

    // refetch logs + exercises (kad pratimas pakiltų į recent)
    await Promise.all([loadLogs(payload.exerciseId), loadExercises()]);
  }

  async function createExercise() {
    const name = newName.trim();
    if (!name) return alert("Įvesk pratimo pavadinimą.");

    const res = await fetch("/api/app/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        muscle: newMuscle,
        equipment: newEquipment,
        imageUrl: newImageUrl.trim() ? newImageUrl.trim() : undefined,
        notes: newNotes.trim() ? newNotes.trim() : undefined,
      }),
    });

    if (!res.ok) {
      alert(await readError(res));
      return;
    }

    setShowCreate(false);
    setNewName("");
    setNewImageUrl("");
    setNewNotes("");
    setNewMuscle("chest");
    setNewEquipment("machine");

    await loadExercises();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-zinc-500">Greitas log’inimas salėje</div>
              <h1 className="mt-1 flex items-center gap-2 text-lg font-semibold">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                  🏋️
                </span>
                Gym Log
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <PrimaryButton onClick={() => setShowCreate(true)} className="px-3 py-2">
                + Naujas pratimas
              </PrimaryButton>
            </div>
          </div>

          {loadingExercises && (
            <div className="mt-3 text-sm text-zinc-400">Kraunama pratimų bazė…</div>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-6xl px-4 py-4">
        {view === "treniruote" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ExerciseList
              recent={recent}
              others={others}
              selectedId={selectedId}
              muscleFilter={muscleFilter}
              query={query}
              onPick={pickExercise}
              onMuscleFilter={setMuscleFilter}
              onQuery={setQuery}
            />

            <ExerciseDetails
              exercise={selectedExercise}
              logs={logs}
              loadingLogs={loadingLogs}
              onClose={() => setSelectedId(null)}
              onSaveSet={saveSet}
            />
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
                <div className="text-lg font-semibold">Naujas (privatus)</div>
              </div>
              <SecondaryButton onClick={() => setShowCreate(false)} className="px-3 py-2">
                Uždaryti
              </SecondaryButton>
            </div>

            <div className="mt-4 grid gap-3">
              <Input label="Pavadinimas" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="pvz. Kojų tiesimas aparate" />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400">Raumenų grupė</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newMuscle}
                    onChange={(e) => setNewMuscle(e.target.value as any)}
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
                    onChange={(e) => setNewEquipment(e.target.value as any)}
                  >
                    {Object.entries(equipmentLabel).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input label="Nuotraukos URL (nebūtina)" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="pvz. https://..." />
              <Textarea label="Pastabos (nebūtina)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="pvz. lėtas nusileidimas…" rows={3} />
            </div>

            <div className="mt-4 flex gap-2">
              <PrimaryButton onClick={createExercise} className="flex-1 py-3 text-base">
                Išsaugoti pratimą
              </PrimaryButton>
              <SecondaryButton onClick={() => setShowCreate(false)} className="py-3">
                Atšaukti
              </SecondaryButton>
            </div>

            <div className="mt-2 text-xs text-zinc-500">
              Privatus pratimas matomas tik tau. Vėliau admin galės patvirtinti ir padaryti viešą.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
