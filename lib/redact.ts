export function maskSecret(s?: string | null) {
  if (!s) return null;
  const str = String(s);
  if (str.length <= 4) return "***";
  return `${str.slice(0, 2)}***${str.slice(-2)}`;
}

export function parseDatabaseUrl(url?: string) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return {
      protocol: u.protocol,
      host: u.hostname,
      port: u.port || null,
      user: decodeURIComponent(u.username),
      passwordMasked: maskSecret(decodeURIComponent(u.password)),
      hasPassword: !!u.password,
      database: u.pathname?.replace(/^\//, "") || null,
    };
  } catch {
    return { invalidUrl: true };
  }
}
