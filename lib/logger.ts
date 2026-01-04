import "server-only";
import fs from "fs";
import path from "path";
import { createLogger, format, transports } from "winston";

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), "logs");

// pabandom sukurti logs/ katalogą (jei hostas leidžia)
try {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {
  // jei neleis – tiesiog nerašysim į failą (liks console)
}

const baseTransports: any[] = [
  new transports.Console({
    level: process.env.LOG_LEVEL || "info",
  }),
];

// jei pavyko turėti logs/ – pridedam failą
try {
  const testFile = path.join(LOG_DIR, ".write-test");
  fs.writeFileSync(testFile, "ok");
  fs.unlinkSync(testFile);

  baseTransports.push(
    new transports.File({
      filename: path.join(LOG_DIR, "app.log"),
      level: process.env.LOG_LEVEL || "info",
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5, // laikys 5 failus
    })
  );
} catch {
  // failų rašymo nėra – ok, liekam su console
}

export const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf((info) => {
      const meta = info.meta ? ` meta=${JSON.stringify(info.meta)}` : "";
      const req = info.requestId ? ` requestId=${info.requestId}` : "";
      return `${info.timestamp} ${info.level}${req} ${info.message}${meta}${info.stack ? `\n${info.stack}` : ""}`;
    })
  ),
  transports: baseTransports,
});
