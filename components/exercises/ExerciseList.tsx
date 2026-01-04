"use client";

import type { Exercise, Muscle } from "../app/types";
import { muscleLabel, equipmentLabel } from "../app/labels";
import { cn } from "../app/utils";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900/60 px-2.5 py-1 text-[11px] text-zinc-300">
      {children}
    </span>
  );
}

function IconTile({ imageUrl }: { imageUrl?: string | null }) {
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

export function ExerciseList({
  recent,
  others,
  selectedId,
  muscleFilter,
  query,
  onPick,
  onMuscleFilter,
  onQuery,
}: {
  recent: Exercise[];
  others: Exercise[];
  selectedId: string | null;
  muscleFilter: Muscle | "all";
  query: string;
  onPick: (id: string) => void;
  onMuscleFilter: (v: Muscle | "all") => void;
  onQuery: (v: string) => void;
}) {
  const all = [...recent, ...others];

  const filtered = all
    .filter((e) => {
      const q = query.trim().toLowerCase();
      const matchQuery = !q || e.name.toLowerCase().includes(q);
      const matchMuscle = muscleFilter === "all" || e.muscle === muscleFilter;
      return matchQuery && matchMuscle;
    });

  // Kad "recent" būtų viršuje ir po filtro:
  const recentSet = new Set(recent.map((x) => x.id));
  const recentFiltered = filtered.filter((e) => recentSet.has(e.id));
  const othersFiltered = filtered.filter((e) => !recentSet.has(e.id));

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Filtrai</div>
          <Badge>{filtered.length} vnt.</Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="text-xs text-zinc-400">Raumenų grupė</label>
            <select
              className="mt-1 w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
              value={muscleFilter}
              onChange={(e) => onMuscleFilter(e.target.value as any)}
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
              onChange={(e) => onQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {recentFiltered.length > 0 && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Paskutiniai daryti</div>
            <Badge>{recentFiltered.length} vnt.</Badge>
          </div>

          <div className="grid gap-2">
            {recentFiltered.map((e) => (
              <button
                key={e.id}
                onClick={() => onPick(e.id)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ring-1 transition",
                  selectedId === e.id
                    ? "bg-emerald-500/10 ring-emerald-500/40"
                    : "bg-zinc-900/40 ring-zinc-800 hover:bg-zinc-800/60"
                )}
              >
                <IconTile imageUrl={e.imageUrl} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-zinc-100">{e.name}</div>
                  <div className="mt-0.5 text-xs text-zinc-400">
                    {muscleLabel[e.muscle]} • {equipmentLabel[e.equipment]}
                    {e.visibility === "PRIVATE" && <span className="ml-2 text-zinc-500">• mano</span>}
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
          <Badge>{othersFiltered.length} vnt.</Badge>
        </div>

        <div className="grid gap-2">
          {othersFiltered.map((e) => (
            <button
              key={e.id}
              onClick={() => onPick(e.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left ring-1 transition",
                selectedId === e.id
                  ? "bg-emerald-500/10 ring-emerald-500/40"
                  : "bg-zinc-900/40 ring-zinc-800 hover:bg-zinc-800/60"
              )}
            >
              <IconTile imageUrl={e.imageUrl} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-zinc-100">{e.name}</div>
                <div className="mt-0.5 text-xs text-zinc-400">
                  {muscleLabel[e.muscle]} • {equipmentLabel[e.equipment]}
                  {e.visibility === "PRIVATE" && <span className="ml-2 text-zinc-500">• mano</span>}
                </div>
              </div>
              <div className="text-zinc-500 group-hover:text-zinc-300">→</div>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-2xl bg-zinc-900/50 p-4 text-sm text-zinc-400 ring-1 ring-zinc-800">
              Nieko nerasta.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
