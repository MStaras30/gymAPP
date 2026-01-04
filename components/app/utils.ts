export function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("lt-LT");
  } catch {
    return iso;
  }
}

export function fmtDate(isoDay: string) {
  try {
    const [y, m, d] = isoDay.split("-").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    return dt.toLocaleDateString("lt-LT", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return isoDay;
  }
}

export function parseDecimalLt(s: string) {
  const t = s.trim().replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function groupByDay<T extends { dateTime?: string }>(entries: T[]) {
  const groups: Array<{ day: string; items: T[] }> = [];
  for (const e of entries) {
    const iso = (e as any).dateTime ?? "";
    const day = String(iso).slice(0, 10);
    const last = groups[groups.length - 1];
    if (!last || last.day !== day) groups.push({ day, items: [e] });
    else last.items.push(e);
  }
  return groups;
}
