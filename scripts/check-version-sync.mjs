import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function readText(path) {
  return readFileSync(path, "utf-8");
}

const packageJsonPath = resolve(root, "package.json");
const packageLockPath = resolve(root, "package-lock.json");
const cargoTomlPath = resolve(root, "src-tauri", "Cargo.toml");
const tauriConfPath = resolve(root, "src-tauri", "tauri.conf.json");
const cargoLockPath = resolve(root, "src-tauri", "Cargo.lock");

const packageJson = readJson(packageJsonPath);
const packageLock = readJson(packageLockPath);
const cargoToml = readText(cargoTomlPath);
const tauriConf = readJson(tauriConfPath);
const cargoLock = readText(cargoLockPath);

const expectedVersion = packageJson.version;

if (typeof expectedVersion !== "string" || expectedVersion.length === 0) {
  console.error("❌ package.json is missing a valid version string");
  process.exit(1);
}

const checks = [
  {
    file: "package-lock.json (top-level)",
    value: packageLock.version,
  },
  {
    file: "package-lock.json (packages[\"\"])",
    value: packageLock.packages?.[""]?.version,
  },
  {
    file: "src-tauri/tauri.conf.json",
    value: tauriConf.version,
  },
  {
    file: "src-tauri/Cargo.toml",
    value: (cargoToml.match(/^version\s*=\s*"([^"]+)"/m) ?? [])[1],
  },
  {
    file: "src-tauri/Cargo.lock (cortex-metagen package)",
    value:
      (
        cargoLock.match(
          /\[\[package\]\]\s*\nname\s*=\s*"cortex-metagen"\s*\nversion\s*=\s*"([^"]+)"/
        ) ?? []
      )[1],
  },
];

const mismatches = checks.filter((check) => check.value !== expectedVersion);

if (mismatches.length > 0) {
  console.error("❌ Version mismatch detected");
  console.error(`Expected version: ${expectedVersion}`);
  for (const mismatch of mismatches) {
    console.error(`- ${mismatch.file}: ${mismatch.value ?? "<missing>"}`);
  }
  process.exit(1);
}

console.log(`✅ Version sync check passed (${expectedVersion})`);
