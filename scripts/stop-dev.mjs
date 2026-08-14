import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));

function parsePort(value = process.env.CODEX_DEV_PORT ?? "4173") {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("CODEX_DEV_PORT must be a TCP port between 1 and 65535.");
  }
  return port;
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw result.error;
  return result;
}

function listeningPids(port) {
  const result = run("lsof", ["-nP", "-t", `-iTCP:${port}`, "-sTCP:LISTEN"]);
  if (result.status === 1) return [];
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Could not inspect port ${port}.`);
  }
  return [...new Set(
    result.stdout
      .split(/\s+/)
      .filter(Boolean)
      .map(Number)
      .filter(Number.isInteger),
  )];
}

function processWorkingDirectory(pid) {
  const result = run("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"]);
  if (result.status !== 0) return undefined;
  const path = result.stdout
    .split("\n")
    .find((line) => line.startsWith("n"))
    ?.slice(1);
  if (!path) return undefined;
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

function signal(pids, signalName) {
  for (const pid of pids) {
    try {
      process.kill(pid, signalName);
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
  }
}

async function waitForPortToClose(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (listeningPids(port).length === 0) return true;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  return listeningPids(port).length === 0;
}

export async function stopDevServer(port = parsePort()) {
  const pids = listeningPids(port);
  if (pids.length === 0) {
    console.log(`No cloud comparison app is listening on port ${port}.`);
    return;
  }

  const foreignPids = pids.filter(
    (pid) => processWorkingDirectory(pid) !== repositoryRoot,
  );
  if (foreignPids.length > 0) {
    throw new Error(
      `Port ${port} belongs to another working directory (PID ${foreignPids.join(", ")}); refusing to stop it.`,
    );
  }

  signal(pids, "SIGTERM");
  if (!(await waitForPortToClose(port, 3_000))) {
    const verifiedOriginalPids = listeningPids(port).filter(
      (pid) => pids.includes(pid) && processWorkingDirectory(pid) === repositoryRoot,
    );
    signal(verifiedOriginalPids, "SIGKILL");
    if (!(await waitForPortToClose(port, 1_000))) {
      throw new Error(`Could not stop cloud comparison app on port ${port}.`);
    }
  }

  console.log(`Stopped cloud comparison app on port ${port}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await stopDevServer();
  } catch (error) {
    console.error(`[stop-dev] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
