import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("defines the Codex setup and Run, Validate, Stop actions", () => {
  const environment = readFileSync(
    resolve(repositoryRoot, ".codex/environments/environment.toml"),
    "utf8",
  );
  const packageJson = JSON.parse(
    readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
  );

  assert.match(environment, /^version = 1$/m);
  assert.match(environment, /^name = "Cloud Provider Cost Comparison"$/m);
  assert.match(environment, /\[setup\]\nscript = """\nnpm ci\nnpx playwright install chromium\n"""/);

  const actionNames = environment
    .split("[[actions]]")
    .slice(1)
    .map((block) => block.match(/^name = "([^"]+)"$/m)?.[1]);

  assert.deepEqual(actionNames, ["Run", "Validate", "Stop"]);
  assert.match(environment, /command = "npm run dev:codex"/);
  assert.match(environment, /command = "npm run validate:codex"/);
  assert.match(environment, /command = "npm run stop:codex"/);

  assert.equal(
    packageJson.scripts["dev:codex"],
    "npm run stop:codex && vite --host 127.0.0.1 --port 4173 --strictPort",
  );
  assert.equal(packageJson.scripts["stop:codex"], "node scripts/stop-dev.mjs");
  assert.equal(
    packageJson.scripts["validate:codex"],
    "npm run stop:codex && npm run check && npm run e2e && git diff --check",
  );
});
