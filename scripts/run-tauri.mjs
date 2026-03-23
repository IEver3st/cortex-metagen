import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const args = process.argv.slice(2);

const resolveSigningEnv = (env) => {
  const signingEnv = { ...env };
  const privateKey =
    signingEnv.TAURI_SIGNING_PRIVATE_KEY?.trim() ?? signingEnv.TAURI_PRIVATE_KEY?.trim();
  const privateKeyPath =
    signingEnv.TAURI_SIGNING_PRIVATE_KEY_PATH?.trim() ?? signingEnv.TAURI_PRIVATE_KEY_PATH?.trim();
  const privateKeyPassword =
    signingEnv.TAURI_SIGNING_PRIVATE_KEY_PASSWORD?.trim() ??
    signingEnv.TAURI_PRIVATE_KEY_PASSWORD?.trim();

  if (!privateKey && privateKeyPath) {
    const resolvedPath = isAbsolute(privateKeyPath)
      ? privateKeyPath
      : resolve(privateKeyPath);

    signingEnv.TAURI_SIGNING_PRIVATE_KEY_PATH = resolvedPath;
    signingEnv.TAURI_SIGNING_PRIVATE_KEY = readFileSync(resolvedPath, "utf8");
  }

  if (privateKeyPassword && !signingEnv.TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
    signingEnv.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = privateKeyPassword;
  }

  return signingEnv;
};

const proc = Bun.spawn(["bun", "x", "tauri", ...args], {
  env: resolveSigningEnv(process.env),
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

process.exit(await proc.exited);
