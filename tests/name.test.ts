// The product's name is one setting. The name it had before the rename counts as not set.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

const nameWith = (value: string | undefined) => {
  const env = { ...process.env };
  if (value == null) delete env.NEXT_PUBLIC_APP_NAME;
  else env.NEXT_PUBLIC_APP_NAME = value;
  return execFileSync(process.execPath, ["--import", "tsx", "-e", 'import("./lib/name.ts").then((m) => process.stdout.write(m.APP_NAME))'], { env, encoding: "utf8" });
};

test("the name is Connet unless another one is set", () => {
  assert.equal(nameWith(undefined), "Connet");
  assert.equal(nameWith("Tact"), "Connet"); // an .env.local copied before the rename
  assert.equal(nameWith("Orbit"), "Orbit");
});
