#!/usr/bin/env node
/**
 * إدارة Webhook تيليجرام من .env.local (لا يطبع التوكن).
 *
 * الاستخدام:
 *   node scripts/telegram-webhook.mjs set
 *   node scripts/telegram-webhook.mjs info
 *   node scripts/telegram-webhook.mjs delete
 *   node scripts/telegram-webhook.mjs me
 *   node scripts/telegram-webhook.mjs commands
 *   node scripts/telegram-webhook.mjs photo
 *
 * يتطلب: TELEGRAM_BOT_TOKEN
 * set: NEXT_PUBLIC_APP_URL (HTTPS للإنتاج)
 * مستحسن: TELEGRAM_WEBHOOK_SECRET
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BOT_COMMANDS = [
  { command: "start", description: "بدء الربط والترحيب" },
  { command: "help", description: "قائمة الأوامر" },
  { command: "countdown", description: "العد التنازلي للمواعيد" },
  { command: "daily", description: "سؤال اليوم" },
  { command: "whoami", description: "عرض رقم المحادثة chat_id" },
];

const ALLOWED_UPDATES = ["message", "callback_query"];

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

function requireHttpsAppUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_APP_URL يجب أن يكون HTTPS لـ setWebhook");
    }
    return u.origin;
  } catch (e) {
    if (e instanceof TypeError) throw new Error("NEXT_PUBLIC_APP_URL غير صالح");
    throw e;
  }
}

async function tg(token, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  const data = await res.json();
  return data;
}

const env = { ...loadEnv(envPath), ...process.env };
const token = (env.TELEGRAM_BOT_TOKEN || "").trim();
const action = (process.argv[2] || "info").toLowerCase();

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN فارغ في .env.local — الصقه من BotFather أولًا.");
  process.exit(1);
}

console.log(`token: ${maskToken(token)}`);
console.log(`action: ${action}`);

if (action === "me") {
  const data = await tg(token, "getMe");
  console.log(JSON.stringify(data, null, 2));
  process.exit(data.ok ? 0 : 1);
}

if (action === "info") {
  const data = await tg(token, "getWebhookInfo");
  console.log(JSON.stringify(data, null, 2));
  process.exit(data.ok ? 0 : 1);
}

if (action === "delete") {
  const data = await tg(token, "deleteWebhook", { drop_pending_updates: false });
  console.log(JSON.stringify(data, null, 2));
  process.exit(data.ok ? 0 : 1);
}

if (action === "set") {
  const appUrl = (env.NEXT_PUBLIC_APP_URL || "").trim();
  if (!appUrl || appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) {
    console.error(
      "NEXT_PUBLIC_APP_URL يجب أن يكون رابط إنتاج HTTPS (ليس localhost)."
    );
    process.exit(1);
  }
  const origin = requireHttpsAppUrl(appUrl);
  const webhookUrl = `${origin}/api/telegram/webhook`;
  const secret = (env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  const body = {
    url: webhookUrl,
    allowed_updates: ALLOWED_UPDATES,
  };
  if (secret) body.secret_token = secret;
  else console.warn("تحذير: TELEGRAM_WEBHOOK_SECRET فارغ — عيّنه لتقوية الـ webhook.");

  console.log(`url: ${webhookUrl}`);
  console.log(`secret_token: ${secret ? "set" : "missing"}`);
  const data = await tg(token, "setWebhook", body);
  console.log(JSON.stringify(data, null, 2));
  if (data.ok) {
    const cmds = await setCommands(token);
    console.log("commands:", cmds.ok ? "set" : JSON.stringify(cmds));
  }
  process.exit(data.ok ? 0 : 1);
}

if (action === "commands") {
  const data = await setCommands(token);
  console.log(JSON.stringify(data, null, 2));
  process.exit(data.ok ? 0 : 1);
}

if (action === "photo") {
  const jpgPath = resolve(root, "public/gazameel-bot.jpg");
  if (!existsSync(jpgPath)) {
    console.error("ضع الشعار في public/gazameel-bot.jpg أولًا.");
    process.exit(1);
  }
  const buf = new Uint8Array(readFileSync(jpgPath));
  const form = new FormData();
  form.append(
    "photo",
    JSON.stringify({ type: "static", photo: "attach://pic" })
  );
  form.append("pic", new Blob([buf], { type: "image/jpeg" }), "gazameel-bot.jpg");
  const res = await fetch(
    `https://api.telegram.org/bot${token}/setMyProfilePhoto`,
    { method: "POST", body: form, signal: AbortSignal.timeout(30000) }
  );
  const data = await res.json();
  console.log(JSON.stringify({ ok: data.ok, description: data.description || "profile photo set" }, null, 2));
  const adminChat = (env.ADMIN_TELEGRAM_CHAT_ID || "").trim();
  if (data.ok && adminChat) {
    const sendForm = new FormData();
    sendForm.append("chat_id", adminChat);
    sendForm.append(
      "caption",
      "شعار Gazameel صار صورة البوت. اكتب /start بعد رفع الموقع لتشوفه مع دليل الخطوات."
    );
    sendForm.append(
      "photo",
      new Blob([buf], { type: "image/jpeg" }),
      "gazameel-bot.jpg"
    );
    const sent = await fetch(
      `https://api.telegram.org/bot${token}/sendPhoto`,
      { method: "POST", body: sendForm, signal: AbortSignal.timeout(30000) }
    );
    const sentData = await sent.json();
    console.log("preview:", sentData.ok ? "sent to admin chat" : sentData.description);
  }
  process.exit(data.ok ? 0 : 1);
}

if (action === "setup") {
  const me = await tg(token, "getMe");
  if (!me.ok) {
    console.error("getMe فشل — تحقق من TELEGRAM_BOT_TOKEN");
    console.log(JSON.stringify(me, null, 2));
    process.exit(1);
  }
  const username = me.result?.username || "";
  console.log(`bot: @${username} (${me.result?.first_name || ""})`);

  const updates = {};
  const currentUser = (env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "").trim();
  if (username && currentUser !== username) {
    updates.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = username;
  }
  if (!(env.TELEGRAM_WEBHOOK_SECRET || "").trim()) {
    const { randomBytes } = await import("node:crypto");
    updates.TELEGRAM_WEBHOOK_SECRET = randomBytes(24).toString("hex");
  }
  if (Object.keys(updates).length) {
    upsertEnv(envPath, updates);
    console.log(`updated .env.local: ${Object.keys(updates).join(", ")}`);
  } else {
    console.log(".env.local: username + webhook secret already set");
  }

  const cmds = await setCommands(token);
  console.log("commands:", cmds.ok ? "set" : JSON.stringify(cmds));
  console.log("\nالتالي:");
  console.log("1) npm run dev");
  console.log("2) npm run telegram:poll");
  console.log("3) راسل البوت /whoami ثم ضع الرقم في ADMIN_TELEGRAM_CHAT_ID");
  process.exit(cmds.ok ? 0 : 1);
}

console.error(
  "الاستخدام: node scripts/telegram-webhook.mjs <set|info|delete|me|commands|setup|photo>"
);
process.exit(1);

async function setCommands(token) {
  return tg(token, "setMyCommands", { commands: BOT_COMMANDS });
}

function upsertEnv(path, updates) {
  let text = "";
  if (existsSync(path)) {
    text = readFileSync(path, "utf8");
  } else {
    const examplePath = resolve(root, ".env.example");
    if (existsSync(examplePath)) {
      text = readFileSync(examplePath, "utf8");
      console.log("أنشئ .env.local من .env.example (لم يكن موجودًا).");
    } else {
      console.log("أنشئ .env.local جديدًا (لم يكن موجودًا).");
    }
  }
  for (const [key, value] of Object.entries(updates)) {
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(text)) {
      text = text.replace(re, `${key}=${value}`);
    } else {
      text += `\n${key}=${value}\n`;
    }
  }
  writeFileSync(path, text);
}
