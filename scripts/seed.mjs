#!/usr/bin/env node
/**
 * يزرع أسئلة الكويز واستطلاعًا تجريبيًا من public/sample-questions.csv
 * npm run seed
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
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

const { data: adminProfile } = env.ADMIN_EMAIL
  ? await supabase
      .from("profiles")
      .select("id, telegram_chat_id")
      .eq("email", env.ADMIN_EMAIL)
      .maybeSingle()
  : { data: null };

if (
  adminProfile?.id &&
  env.ADMIN_TELEGRAM_CHAT_ID &&
  !adminProfile.telegram_chat_id
) {
  const { error: linkErr } = await supabase
    .from("profiles")
    .update({ telegram_chat_id: String(env.ADMIN_TELEGRAM_CHAT_ID) })
    .eq("id", adminProfile.id);
  if (!linkErr) console.log("رُبط حساب الأدمن بتيليجرام للتذكيرات");
}

const SAMPLE_EXAMS = [
  {
    code: "ENGG1209",
    title: "تسليم رسم هندسي — تمرين 1",
    event_type: "assignment",
    starts_at: "2026-09-21T10:00:00+03:00",
    notes: "ارفع الملف قبل الموعد من صفحة ساهم.",
  },
  {
    code: "ECOM2402",
    title: "كويز 1 — مؤشرات ودوال",
    event_type: "quiz",
    starts_at: "2026-09-28T11:00:00+03:00",
    notes: "راجع المؤشرات والمصفوفات.",
  },
  {
    code: "ECOM2311",
    title: "كويز منطق ومجموعات",
    event_type: "quiz",
    starts_at: "2026-10-05T11:00:00+03:00",
    notes: null,
  },
  {
    code: "QURN3101",
    title: "كويز تجويد",
    event_type: "quiz",
    starts_at: "2026-10-12T08:00:00+03:00",
    notes: null,
  },
  {
    code: "MATH2341",
    title: "منتصف الجبر الخطي",
    event_type: "midterm",
    starts_at: "2026-10-26T09:00:00+03:00",
    notes: "المصفوفات والمتجهات.",
  },
  {
    code: "ENGG1305",
    title: "منتصف الإنجليزية التقنية",
    event_type: "midterm",
    starts_at: "2026-11-02T10:00:00+03:00",
    notes: null,
  },
  {
    code: "ECOM2402",
    title: "نهائي برمجة حاسوب (2)",
    event_type: "final",
    starts_at: "2027-01-11T09:00:00+03:00",
    notes: "شامل الفصل.",
  },
];

let examsInserted = 0;
for (const exam of SAMPLE_EXAMS) {
  const courseId = byCode[exam.code];
  if (!courseId) continue;
  const { data: existingExam } = await supabase
    .from("exam_events")
    .select("id")
    .eq("course_id", courseId)
    .eq("title", exam.title)
    .maybeSingle();
  if (existingExam) continue;
  const { error: examErr } = await supabase.from("exam_events").insert({
    course_id: courseId,
    title: exam.title,
    event_type: exam.event_type,
    starts_at: exam.starts_at,
    notes: exam.notes,
    created_by: adminProfile?.id || null,
  });
  if (examErr) {
    console.warn("تخطي موعد:", exam.title, examErr.message);
    continue;
  }
  examsInserted++;
  await supabase.from("updates_feed").insert({
    message: `موعد جديد في التقويم: ${exam.title}`,
  });
}
if (examsInserted) console.log(`أُضيف ${examsInserted} موعد للتقويم`);

const sampleTitle = "ملخص تجريبي — برمجة حاسوب (2)";
const sampleCourseId = byCode.ECOM2402;
if (sampleCourseId) {
  const { data: existingRes } = await supabase
    .from("resources")
    .select("id")
    .eq("title", sampleTitle)
    .eq("course_id", sampleCourseId)
    .maybeSingle();
  if (!existingRes) {
    const storagePath = `approved/${sampleCourseId}/${randomUUID()}.pdf`;
    const pdf = buildSamplePdf("Gazameel sample — Computer Programming (2)");
    const { error: upErr } = await supabase.storage
      .from("resources")
      .upload(storagePath, pdf, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (upErr) {
      console.warn("تخطي ملف تجريبي:", upErr.message);
    } else {
      const { data: resource, error: resErr } = await supabase
        .from("resources")
        .insert({
          course_id: sampleCourseId,
          title: sampleTitle,
          description: "ملف تجريبي للتحقق من المكتبة والتنزيل.",
          resource_type: "summary",
          storage_path: storagePath,
          mime_type: "application/pdf",
          file_size: pdf.length,
          status: "approved",
          contributor_display_name: "فريق Gazameel",
          uploaded_by: adminProfile?.id || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminProfile?.id || null,
          source_note: "seed",
        })
        .select("id")
        .maybeSingle();
      if (resErr) {
        console.warn("تخطي سجل الملف:", resErr.message);
      } else {
        console.log("أُضيف ملف تجريبي في المكتبة");
        await supabase.from("updates_feed").insert({
          message: `ملف معتمد: ${sampleTitle}`,
          resource_id: resource?.id || null,
        });
      }
    }
  }
}

const token = env.TELEGRAM_BOT_TOKEN;
const adminChat = env.ADMIN_TELEGRAM_CHAT_ID;
if (token && adminChat && examsInserted > 0) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: adminChat,
      text: "أُضيفت مواعيد للتقويم. اكتب /countdown لعرض العد التنازلي، أو افتح صفحة التقويم على الموقع.",
    }),
  }).catch(() => {});
}

console.log(`تم: ${inserted} سؤال جديد · تخطي ${skipped}`);
if (inserted === 0 && skipped === 0) {
  process.exit(1);
}

function buildSamplePdf(text) {
  const safe = String(text).replace(/[()\\]/g, " ");
  const stream = `BT /F1 16 Tf 72 720 Td (${safe}) Tj ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(body.length);
    body += obj;
  }
  const xrefPos = body.length;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += xref;
  body += `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(body, "ascii");
}
