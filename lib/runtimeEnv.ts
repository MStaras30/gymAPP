import { runtimeEnv } from "./runtimeEnv.generated";

export function applyRuntimeEnv() {
  // užpildom process.env runtime'e (Hostinger jo nepaduoda)
  for (const [k, v] of Object.entries(runtimeEnv)) {
    if (!process.env[k]) process.env[k] = v;
  }
}
