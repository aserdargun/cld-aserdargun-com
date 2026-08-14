import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = realpathSync(resolve(scriptsDirectory, ".."));
const stopScriptPath = resolve(scriptsDirectory, "stop-dev.mjs");
const listenerSource = `
  const server = require("node:http").createServer((_request, response) => response.end("ok"));
  server.listen(0, "127.0.0.1", () => process.stdout.write(String(server.address().port) + "\\n"));
`;

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

async function waitForExit(child) {
  if (!isProcessAlive(child.pid)) return;
  await new Promise((resolveExit, rejectExit) => {
    const timeout = setTimeout(
      () => rejectExit(new Error(`Timed out waiting for PID ${child.pid} to exit`)),
      5_000,
    );
    child.once("exit", () => {
      clearTimeout(timeout);
      resolveExit();
    });
  });
}

async function startListener(workingDirectory) {
  const child = spawn(process.execPath, ["-e", listenerSource], {
    cwd: workingDirectory,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const port = await new Promise((resolvePort, rejectPort) => {
    let output = "";
    const timeout = setTimeout(
      () => rejectPort(new Error("Timed out waiting for listener port")),
      5_000,
    );
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/^(\d+)\n/);
      if (!match) return;
      clearTimeout(timeout);
      resolvePort(Number(match[1]));
    });
    child.once("error", rejectPort);
    child.once("exit", (code) => rejectPort(new Error(`Listener exited with ${code}`)));
  });
  return { child, port };
}

function forceStop(child) {
  if (!isProcessAlive(child.pid)) return;
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

test("stops a listener owned by this checkout", async (t) => {
  const { child, port } = await startListener(repositoryRoot);
  t.after(() => forceStop(child));

  const result = spawnSync(process.execPath, [stopScriptPath], {
    encoding: "utf8",
    env: { ...process.env, CODEX_DEV_PORT: String(port) },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  await waitForExit(child);
  assert.equal(result.stdout, `Stopped cloud comparison app on port ${port}.\n`);
});

test("refuses to stop a listener owned by another working directory", async (t) => {
  const foreignDirectory = mkdtempSync(resolve(tmpdir(), "cld-foreign-listener-"));
  const { child, port } = await startListener(foreignDirectory);
  t.after(() => {
    forceStop(child);
    rmSync(foreignDirectory, { recursive: true, force: true });
  });

  const result = spawnSync(process.execPath, [stopScriptPath], {
    encoding: "utf8",
    env: { ...process.env, CODEX_DEV_PORT: String(port) },
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /belongs to another working directory/);
  assert.equal(isProcessAlive(child.pid), true);
});
