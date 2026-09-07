#!/usr/bin/env node
/**
 * تشغيل البوت محليًا عبر long polling (بدون HTTPS / Vercel).
 * يسحب التحديثات من تيليجرام ويرسلها إلى /api/telegram/webhook على جهازك.
 *
 * الاستخدام: npm run telegram:poll
 * يتطلب: TELEGRAM_BOT_TOKEN + خادم `npm run dev`
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

function maskToken(token) {
  if (!token || token.length < 12) return "(missing)";
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

async function tg(token, method, body) {
  const waitMs = method === "getUpdates" ? 45000 : 25000;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(waitMs),
  });
  return res.json();
}

const env = { ...loadEnv(envPath), ...process.env };
const token = (env.TELEGRAM_BOT_TOKEN || "").trim();
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN فارغ في .env.local — الصقه من BotFather أولًا.");
  process.exit(1);
}

const appUrl = (
  env.TELEGRAM_POLL_URL ||
  env.NEXT_PUBLIC_APP_URL ||
  "http://127.0.0.1:3000"
).trim();
let origin;
try {
  origin = new URL(appUrl).origin;
} catch {
  console.error("NEXT_PUBLIC_APP_URL غير صالح");
  process.exit(1);
}
if (!origin.startsWith("http://127.") && !origin.includes("localhost")) {
  console.error(
    "telegram:poll للتشغيل المحلي فقط. للإنتاج استخدم: npm run telegram:webhook:set"
  );
  process.exit(1);
}

const webhookUrl = `${origin}/api/telegram/webhook`;
const secret = (env.TELEGRAM_WEBHOOK_SECRET || "").trim();

console.log(`token: ${maskToken(token)}`);
console.log(`forward → ${webhookUrl}`);

try {
  const dropped = await tg(token, "deleteWebhook", { drop_pending_updates: false });
  if (!dropped.ok) {
    console.warn("deleteWebhook:", JSON.stringify(dropped));
  }
} catch (e) {
  console.warn("deleteWebhook skip:", e?.message || e);
}

const headers = { "Content-Type": "application/json" };
if (secret) headers["x-telegram-bot-api-secret-token"] = secret;

let healthy = false;
for (let attempt = 1; attempt <= 8; attempt++) {
  try {
    const health = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: "{}",
      signal: AbortSignal.timeout(15000),
    });
    if (health.status === 404) {
      console.error(`المسار غير موجود (${health.status}). شغّل npm run dev أولًا.`);
      process.exit(1);
    }
    healthy = true;
    break;
  } catch {
    console.log(`انتظار السيرفر على ${origin} (${attempt}/8)…`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}
if (!healthy) {
  console.error(
    `لا يمكن الوصول إلى ${origin} — شغّل npm run dev في طرفية أخرى ثم أعد: npm run telegram:poll`
  );
  process.exit(1);
}

console.log("polling… أرسل /start أو /whoami للبوت. Ctrl+C للإيقاف.");

let offset = 0;
while (true) {
  let data;
  try {
    data = await tg(token, "getUpdates", {
      offset,
      timeout: 30,
      allowed_updates: ["message", "callback_query"],
    });
  } catch (e) {
    console.error("getUpdates", e?.message || e);
    await new Promise((r) => setTimeout(r, 2000));
    continue;
  }

  if (!data?.ok) {
    console.error("getUpdates failed", JSON.stringify(data));
    await new Promise((r) => setTimeout(r, 3000));
    continue;
  }

  for (const update of data.result || []) {
    offset = update.update_id + 1;
    const kind = update.message?.text
      ? `msg ${update.message.text}`
      : update.callback_query?.data
        ? `cb ${update.callback_query.data}`
        : `id ${update.update_id}`;
    try {
      const headers = { "Content-Type": "application/json" };
      if (secret) headers["x-telegram-bot-api-secret-token"] = secret;
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(update),
      });
      const body = await res.text();
      console.log(`${kind} → ${res.status} ${body.slice(0, 120)}`);
    } catch (e) {
      console.error(`${kind} forward failed`, e?.message || e);
    }
  }
}
