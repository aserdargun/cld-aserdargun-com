import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(repositoryRoot, "dist");
const indexPath = resolve(dist, "index.html");
const configPath = resolve(dist, "staticwebapp.config.json");
const assetsPath = resolve(dist, "assets");

assert.ok(existsSync(indexPath), "dist/index.html is missing");
assert.ok(statSync(indexPath).size > 0, "dist/index.html is empty");
assert.ok(existsSync(configPath), "dist/staticwebapp.config.json is missing");

const config = JSON.parse(readFileSync(configPath, "utf8"));
assert.equal(config.navigationFallback?.rewrite, "/index.html");

const assets = readdirSync(assetsPath);
assert.ok(assets.some((name) => name.endsWith(".js")), "compiled JavaScript is missing");
assert.ok(assets.some((name) => name.endsWith(".css")), "compiled CSS is missing");

console.log(`Verified static artifact: index.html, SPA fallback, ${assets.length} assets.`);
