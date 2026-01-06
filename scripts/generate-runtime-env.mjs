import fs from "node:fs";
import path from "node:path";

const required = [
  "DATABASE_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("[env] Missing:", missing.join(", "));
  // necrashinam lokaliai, bet prod geriau crashint:
  // process.exit(1)
}

const out = `// AUTO-GENERATED. DO NOT COMMIT.
export const runtimeEnv = {
${required
  .map((k) => `  ${k}: ${JSON.stringify(process.env[k] ?? "")},`)
  .join("\n")}
} as const;
`;

fs.mkdirSync(path.join(process.cwd(), "lib"), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), "lib", "runtimeEnv.generated.ts"), out, "utf8");

console.log("[env] Generated lib/runtimeEnv.generated.ts");
