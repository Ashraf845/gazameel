/**
 * يزامن مفاتيح .env.local إلى Vercel (Production + Preview)
 * الاستخدام: npx vercel login && npm run vercel:sync-env
 */
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const ENV_PATH = resolve(ROOT, ".env.local");

const CONFIG_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_TELEGRAM_BOT_USERNAME",
  "NEXT_PUBLIC_WHATSAPP_URL",
];

const SECRET_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_EMAIL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "CRON_SECRET",
  "ADMIN_TELEGRAM_CHAT_ID",
];

function loadEnv(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function run(cmd, args, input) {
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    input,
    encoding: "utf8",
    shell: false,
  });
  return res;
}

const env = loadEnv(ENV_PATH);
if (!Object.keys(env).length) {
  console.error("Missing .env.local");
  process.exit(1);
}

// على Vercel لازم رابط الإنتاج مش localhost
env.NEXT_PUBLIC_APP_URL = "https://gazameel.vercel.app";

const who = run("npx", ["vercel", "whoami"]);
if ((who.stderr || who.stdout || "").includes("Logged out") || who.status !== 0) {
  console.error("سجّل دخول أولًا:\n  npx vercel login\nثم:\n  npm run vercel:sync-env");
  process.exit(1);
}

// ربط المشروع إن لزم
if (!existsSync(resolve(ROOT, ".vercel/project.json"))) {
  console.log("Linking project…");
  const link = run("npx", ["vercel", "link", "--yes", "--project", "gazameel"]);
  if (link.status !== 0) {
    console.error(link.stderr || link.stdout);
    process.exit(1);
  }
}

const tmp = resolve(ROOT, ".env.vercel.tmp");
const lines = [];
for (const key of [...CONFIG_KEYS, ...SECRET_KEYS]) {
  const val = (env[key] || "").trim();
  if (!val) {
    console.log(`skip empty ${key}`);
    continue;
  }
  lines.push(`${key}=${val}`);
}
writeFileSync(tmp, lines.join("\n") + "\n");

console.log("Importing env to Production + Preview…");
for (const target of ["production", "preview"]) {
  const res = run("npx", [
    "vercel",
    "env",
    "pull",
    "--yes",
    "--environment",
    target,
    ".env.pull.check",
  ]);
  // pull may fail; continue to add via env add by removing+adding each
}

// vercel env add is interactive; use `vercel env` bulk via removing then adding with printf
function upsert(key, value, environments) {
  for (const environment of environments) {
    run("npx", ["vercel", "env", "rm", key, environment, "--yes"]);
    const add = run(
      "npx",
      ["vercel", "env", "add", key, environment, "--sensitive"],
      value + "\n"
    );
    // For NEXT_PUBLIC use non-sensitive: Vercel CLI 59 might use different flags
    if (add.status !== 0) {
      const add2 = run(
        "npx",
        ["vercel", "env", "add", key, environment],
        value + "\n"
      );
      if (add2.status !== 0) {
        console.error(`FAIL ${key} @ ${environment}`, add2.stderr || add.stderr);
        continue;
      }
    }
    console.log(`ok ${key} @ ${environment}`);
  }
}

for (const key of CONFIG_KEYS) {
  const val = (env[key] || "").trim();
  if (!val) continue;
  // Config/public: try without --sensitive
  for (const environment of ["production", "preview"]) {
    run("npx", ["vercel", "env", "rm", key, environment, "--yes"]);
    const add = run(
      "npx",
      ["vercel", "env", "add", key, environment],
      val + "\n"
    );
    if (add.status !== 0) {
      console.error(`FAIL ${key} @ ${environment}`, add.stderr || add.stdout);
    } else {
      console.log(`ok ${key} @ ${environment}`);
    }
  }
}

for (const key of SECRET_KEYS) {
  const val = (env[key] || "").trim();
  if (!val) continue;
  for (const environment of ["production", "preview"]) {
    run("npx", ["vercel", "env", "rm", key, environment, "--yes"]);
    const add = run(
      "npx",
      ["vercel", "env", "add", key, environment],
      val + "\n"
    );
    if (add.status !== 0) {
      console.error(`FAIL ${key} @ ${environment}`, add.stderr || add.stdout);
    } else {
      console.log(`ok ${key} @ ${environment}`);
    }
  }
}

try {
  unlinkSync(tmp);
} catch {
  /* */
}
try {
  unlinkSync(resolve(ROOT, ".env.pull.check"));
} catch {
  /* */
}

console.log("\nRedeploying production…");
const dep = run("npx", ["vercel", "--prod", "--yes"]);
console.log(dep.stdout || "");
if (dep.status !== 0) {
  console.error(dep.stderr || "");
  process.exit(dep.status || 1);
}
console.log("Done.");
