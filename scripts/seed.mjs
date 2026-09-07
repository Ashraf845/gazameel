#!/usr/bin/env node
/**
 * يزرع أسئلة الكويز واستطلاعًا تجريبيًا من public/sample-questions.csv
 * npm run seed
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  function split(line) {
    const result = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === "," && !inQ) {
        result.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  }
  const header = split(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = split(line);
    const row = {};
    header.forEach((h, i) => {
      row[h] = cols[i] || "";
    });
    return row;
  });
}

const env = { ...parseEnv(path.join(root, ".env")), ...parseEnv(path.join(root, ".env.local")) };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || /YOUR_|placeholder|change-me/i.test(url + key)) {
  console.error("ضع NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});
const csvPath = path.join(root, "public", "sample-questions.csv");
const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));

const { data: courses, error: cErr } = await supabase.from("courses").select("id, code");
if (cErr) {
  console.error("فشل قراءة المواد:", cErr.message);
  process.exit(1);
}
const byCode = Object.fromEntries((courses || []).map((c) => [c.code, c.id]));

let inserted = 0;
let skipped = 0;
for (const row of rows) {
  const courseId = byCode[row.course_code];
  if (!courseId) {
    console.warn("مادة غير موجودة:", row.course_code);
    skipped++;
    continue;
  }
  const { data: existing } = await supabase
    .from("questions")
    .select("id")
    .eq("course_id", courseId)
    .eq("question", row.question)
    .maybeSingle();
  if (existing) {
    skipped++;
    continue;
  }
  const { error } = await supabase.from("questions").insert({
    course_id: courseId,
    topic: row.topic || null,
    question: row.question,
    option_a: row.option_a,
    option_b: row.option_b,
    option_c: row.option_c,
    option_d: row.option_d,
    correct: String(row.correct || "A").toUpperCase().slice(0, 1),
    explanation: row.explanation || null,
    active: true,
    daily_eligible: row.topic === "Logic" || row.topic === "Pointers",
  });
  if (error) {
    console.warn("تخطي سؤال:", row.question.slice(0, 40), error.message);
    skipped++;
    continue;
  }
  inserted++;
}

const pollQ = "كيف تقيّم صعوبة برمجة حاسوب (2) حتى الآن؟";
const { data: pollExists } = await supabase.from("polls").select("id").eq("question", pollQ).maybeSingle();
if (!pollExists) {
  const { error: pErr } = await supabase.from("polls").insert({
    course_id: byCode.ECOM2402 || null,
    question: pollQ,
    options: ["سهلة", "متوسطة", "صعبة", "صعبة جدًا"],
    active: true,
  });
  if (!pErr) console.log("أُضيف استطلاع تجريبي");
}

console.log(`تم: ${inserted} سؤال جديد · تخطي ${skipped}`);
if (inserted === 0 && skipped === 0) {
  process.exit(1);
}
