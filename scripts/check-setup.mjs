#!/usr/bin/env node
/**
 * فحص جاهزية الربط — بدون طباعة الأسرار
 * تشغيل: npm run check:setup
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.local");

function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function isReal(val) {
  if (!val) return false;
  return !/YOUR_|your_|change-me|placeholder|example\.com|xxxx/i.test(val);
}

const env = parseEnv(envPath);
const checks = [
  {
    title: "مرحلة 1 — Supabase",
    keys: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "ADMIN_EMAIL",
    ],
    docs: "docs/درس-المرحلة-1.md",
    also: "نفّذ schema.sql + rls.sql وأنشئ bucket resources (Private) + Google Auth",
  },
  {
    title: "مرحلة 2 — تيليجرام",
    keys: [
      "TELEGRAM_BOT_TOKEN",
      "ADMIN_TELEGRAM_CHAT_ID",
      "NEXT_PUBLIC_TELEGRAM_BOT_USERNAME",
    ],
    docs: "docs/درس-المرحلة-2.md",
    also: "بعد النشر: npm run telegram:webhook:set",
  },
  {
    title: "مرحلة 3 — واتساب",
    keys: ["NEXT_PUBLIC_WHATSAPP_URL"],
    docs: "docs/درس-المرحلة-3.md",
    also: "رابط chat.whatsapp.com يظهر في Footer و /about",
  },
];

console.log("\nGazameel — فحص الربط (.env.local)\n");

if (!fs.existsSync(envPath)) {
  console.log("❌ لا يوجد .env.local — نفّذ: cp .env.example .env.local\n");
  process.exit(1);
}

let allOk = true;
for (const c of checks) {
  const missing = c.keys.filter((k) => !isReal(env[k]));
  const ok = missing.length === 0;
  if (!ok) allOk = false;
  console.log(`${ok ? "✅" : "⏳"} ${c.title}`);
  for (const k of c.keys) {
    console.log(`   ${isReal(env[k]) ? "✓" : "·"} ${k}`);
  }
  if (!ok) {
    console.log(`   → اقرأ: ${c.docs}`);
    console.log(`   → ${c.also}`);
  }
  console.log("");
}

console.log(
  allOk
    ? "كل مفاتيح الربط مضبوطة. أكمل اختبارات الـ Checklist داخل الدروس.\n"
    : "الكود جاهز — الصق القيم الحقيقية ثم أعد: npm run check:setup\nدليل مختصر: docs/الربط-السريع.md\n"
);

process.exit(allOk ? 0 : 2);
