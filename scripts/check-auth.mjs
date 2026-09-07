#!/usr/bin/env node
/**
 * فحص اتصال Supabase Auth — npm run check:auth
 */
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

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

function get(url, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https
      .get({ hostname: u.hostname, path: u.pathname + u.search, headers, family: 4 }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, data }));
      })
      .on("error", reject);
  });
}

const env = parseEnv(envPath);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("\nGazameel — فحص Supabase Auth\n");

if (!url || !key) {
  console.log("❌ NEXT_PUBLIC_SUPABASE_URL أو ANON_KEY ناقص في .env.local\n");
  process.exit(1);
}

console.log("URL:", url);
console.log("Key:", key.startsWith("eyJ") ? "eyJ... (legacy ✓)" : key.slice(0, 20) + "...");

try {
  const health = await get(`${url}/auth/v1/health`, { apikey: key });
  console.log("Health:", health.status === 200 ? "✅ OK" : `⚠️ ${health.status}`);
} catch (e) {
  console.log("Health: ❌", e.message);
  console.log("\n→ الشبكة ما توصل Supabase — جرّب Hotspot من الجوال.\n");
  process.exit(2);
}

try {
  const settings = await get(`${url}/auth/v1/settings`, { apikey: key });
  console.log("Settings:", settings.status === 200 ? "✅ OK" : `⚠️ ${settings.status}`);
} catch (e) {
  console.log("Settings: ❌", e.message);
}

console.log("\nRedirect URL في Supabase:\n  http://localhost:3000/auth/confirm\n");
