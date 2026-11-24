// Read and write single settings in .env.local without printing them.
import fs from "node:fs";
import path from "node:path";

const file = () => path.join(process.cwd(), process.env.TACT_ENV_FILE || ".env.local");

export function setEnv(key: string, value: string) {
  const f = file();
  const text = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
  const line = `${key}=${value}`;
  const at = new RegExp(`^#?\\s*${key}=.*$`, "m");
  const next = at.test(text) ? text.replace(at, line) : `${text.replace(/\n*$/, "\n")}${line}\n`;
  fs.writeFileSync(f, next);
  process.env[key] = value;
}
