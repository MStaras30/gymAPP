"use client";

import type { Exercise, LogEntry } from "../app/types";
import { muscleLabel, equipmentLabel } from "../app/labels";
import { fmtDate, fmtDateTime, groupByDay, parseDecimalLt } from "../app/utils";
import { Input } from "../ui/Inputs";
import { PrimaryButton, SecondaryButton } from "../ui/Buttons";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900/60 px-2.5 py-1 text-[11px] text-zinc-300">
      {children}
    </span>
  );
}

export function ExerciseDetails({
  exercise,
  logs,
  loadingLogs,
  onClose,
  onSaveSet,
}: {
  exercise: Exercise | null;
  logs: LogEntry[];
  loadingLogs: boolean;
  onClose: () => void;
  onSaveSet: (payload: { exerciseId: string; weightKg: number; reps: number; comment?: string }) => Promise<void>;
}) {
  const grouped = groupByDay(logs);

  const last = logs[0] ?? null;
  const [weightKg, setWeightKg] = React.useState(last ? String(last.weightKg) : "");
  const [reps, setReps] = React.useState(last ? String(last.reps) : "");
  const [comment, setComment] = React.useState("");

  React.useEffect(() => {
    const l = logs[0] ?? null;
    setWeightKg(l ? String(l.weightKg) : "");
    setReps(l ? String(l.reps) : "");
    setComment("");
  }, [exercise?.id]); // kai keičiasi pratimas

    if (!exercise) {
    return (
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-4 md:sticky md:top-[140px] md:self-start">
        <div className="rounded-2xl bg-zinc-900/50 p-4 text-sm text-zinc-400 ring-1 ring-zinc-800">
          Pasirink pratimą kairėje, kad galėtum greitai įrašyti setą ir matyti istoriją.
        </div>
      </section>
    );
  }

  const exerciseId = exercise.id;

  async function save() {
    const w = parseDecimalLt(weightKg);
    const r = Number(reps);

    if (w == null || w < 0) return alert('Įvesk svorį (kg). “Savo svoris” – gali rašyti 0.');
    if (!Number.isInteger(r) || r <= 0) return alert("Įvesk pakartojimų skaičių (teigiamas sveikas skaičius).");

    await onSaveSet({
      exerciseId,
      weightKg: w,
      reps: r,
      comment: comment.trim() ? comment.trim() : undefined,
    });

    setComment("");
  }


  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-4 md:sticky md:top-[140px] md:self-start">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
            {exercise.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={exercise.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm text-zinc-500">📷</div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{exercise.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge>{muscleLabel[exercise.muscle]}</Badge>
              <Badge>{equipmentLabel[exercise.equipment]}</Badge>
              {exercise.visibility === "PRIVATE" && <Badge>mano</Badge>}
            </div>
            {exercise.notes && <div className="mt-2 text-sm text-zinc-300">{exercise.notes}</div>}
          </div>

          <SecondaryButton onClick={onClose} className="px-3 py-2">
            Uždaryti
          </SecondaryButton>
        </div>

        {/* LOG */}
        <div className="rounded-3xl bg-zinc-900/50 p-4 ring-1 ring-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Įrašyti setą</div>
            <Badge>{logs.length} įrašai</Badge>
          </div>

          {loadingLogs ? (
            <div className="text-sm text-zinc-400">Kraunama istorija…</div>
          ) : (
            <>
              {logs.length > 0 && (
                <div className="mb-3 rounded-2xl bg-zinc-950/40 p-3 ring-1 ring-zinc-800">
                  <div className="text-xs font-semibold text-zinc-400">Paskutiniai įrašai</div>
                  <div className="mt-2 grid gap-2">
                    {logs.slice(0, 3).map((l) => (
                      <div key={l.id} className="flex items-baseline justify-between gap-3">
                        <div className="font-semibold text-zinc-100">
                          {String(l.weightKg)} kg × {l.reps}
                        </div>
                        <div className="text-xs text-zinc-500">{fmtDateTime(l.dateTime)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Input label="Svoris (kg)" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="pvz. 60,000" inputMode="decimal" />
                <Input label="Pakartojimai" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="pvz. 8" inputMode="numeric" />
                <div className="col-span-2">
                  <Input label="Komentaras (nebūtina)" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="pvz. lengva / lėtas tempas…" />
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <PrimaryButton onClick={save} className="flex-1 py-3 text-base">
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
                Patarimas: “Savo svorio” pratimams rašyk <span className="font-semibold text-zinc-300">0</span>.
              </div>
            </>
          )}
        </div>

        {/* ISTORIJA */}
        <div className="rounded-3xl bg-zinc-900/50 p-4 ring-1 ring-zinc-800">
          <div className="mb-3 text-sm font-semibold">Istorija</div>

          {loadingLogs ? (
            <div className="text-sm text-zinc-400">Kraunama…</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-zinc-400">Šitam pratimui dar nėra įrašų.</div>
          ) : (
            <div className="max-h-[360px] overflow-auto rounded-2xl bg-zinc-950/30 ring-1 ring-zinc-800">
              <div className="divide-y divide-zinc-800">
                {grouped.slice(0, 14).map((g) => (
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
                              {String(l.weightKg)} kg × {l.reps}
                            </div>
                            <div className="text-xs text-zinc-500">{fmtDateTime(l.dateTime)}</div>
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

          {logs.length > 0 && grouped.length > 14 && (
            <div className="mt-2 text-xs text-zinc-500">Rodomos paskutinės 14 dienų grupių.</div>
          )}
        </div>
      </div>
    </section>
  );
}

import React from "react";
