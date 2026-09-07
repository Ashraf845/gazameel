#!/usr/bin/env node
/**
 * فحص جاهزية المرحلة 2 بدون طباعة أسرار.
 * الاستخدام: npm run check:phase2
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function statusOf(key, val, { placeholders = [], allowLocalhost = false } = {}) {
  if (!val) return { ok: false, label: "EMPTY" };
  if (placeholders.some((p) => val.includes(p) || val === p)) {
    return { ok: false, label: "PLACEHOLDER" };
  }
  if (key === "CRON_SECRET" && val === "change-me") {
    return { ok: false, label: "WEAK" };
  }
  if (
    key === "NEXT_PUBLIC_APP_URL" &&
    !allowLocalhost &&
    (val.includes("localhost") || val.includes("127.0.0.1"))
  ) {
    return { ok: false, label: "LOCAL_ONLY" };
  }
  return { ok: true, label: "SET" };
}

const env = loadEnv(envPath);
if (!existsSync(envPath)) {
  console.error(".env.local غير موجود");
  process.exit(1);
}

const checks = [
  ["NEXT_PUBLIC_SUPABASE_URL", { placeholders: ["YOUR_PROJECT", "your_"] }],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", { placeholders: ["your_anon_key", "your_"] }],
  ["SUPABASE_SERVICE_ROLE_KEY", { placeholders: ["your_service_role_key", "your_"] }],
  ["ADMIN_EMAIL", { placeholders: ["you@gmail.com"] }],
  ["TELEGRAM_BOT_TOKEN", {}],
  ["ADMIN_TELEGRAM_CHAT_ID", {}],
  ["NEXT_PUBLIC_TELEGRAM_BOT_USERNAME", {}],
  ["TELEGRAM_WEBHOOK_SECRET", {}],
  ["CRON_SECRET", {}],
  ["NEXT_PUBLIC_APP_URL", {}],
];

console.log("Gazameel Phase 2 readiness (.env.local)\n");
let blocked = 0;
for (const [key, opts] of checks) {
  const { ok, label } = statusOf(key, (env[key] || "").trim(), opts);
  if (!ok) blocked++;
  const mark = ok ? "✓" : "✗";
  console.log(`${mark} ${key}: ${label}`);
}

const appUrl = (env.NEXT_PUBLIC_APP_URL || "").trim();
const tgReady =
  env.TELEGRAM_BOT_TOKEN?.trim() &&
  env.ADMIN_TELEGRAM_CHAT_ID?.trim() &&
  env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim();
const httpsReady =
  appUrl.startsWith("https://") &&
  !appUrl.includes("localhost") &&
  !appUrl.includes("127.0.0.1");

console.log("\n— ملخص —");
console.log(
  tgReady
    ? "✓ قيم تيليجرام الثلاثة موجودة"
    : "✗ ربط البوت موقوف: الصق TELEGRAM_BOT_TOKEN + ADMIN_TELEGRAM_CHAT_ID + NEXT_PUBLIC_TELEGRAM_BOT_USERNAME"
);
console.log(
  httpsReady
    ? "✓ NEXT_PUBLIC_APP_URL جاهز لـ setWebhook"
    : "✗ يلزم رابط إنتاج HTTPS قبل npm run telegram:webhook:set"
);
console.log(
  existsSync(resolve(root, "node_modules/.bin/vercel"))
    ? "✓ Vercel CLI جاهز (npx vercel)"
    : "· Vercel CLI غير مثبت — نفّذ: npm i -D vercel ثم npx vercel login && npx vercel --prod"
);

process.exit(blocked > 0 ? 1 : 0);
