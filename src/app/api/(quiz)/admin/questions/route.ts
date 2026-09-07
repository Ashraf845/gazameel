import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/auth";
import { createAdminClient, SUPABASE_UNCONFIGURED_AR } from "@/shared/lib/supabase/admin";

/** إدخال سؤال واحد أو استيراد CSV */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const contentType = request.headers.get("content-type") || "";

    const admin = createAdminClient();

    if (!admin) {
      return NextResponse.json(
        { error: SUPABASE_UNCONFIGURED_AR },
        { status: 503 }
      );
    }

    if (contentType.includes("text/csv") || contentType.includes("multipart")) {
      let text = "";
      if (contentType.includes("multipart")) {
        const form = await request.formData();
        const file = form.get("file") as File | null;
        if (!file) return NextResponse.json({ error: "ملف CSV مطلوب" }, { status: 400 });
        text = await file.text();
      } else {
        text = await request.text();
      }

      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        return NextResponse.json({ error: "CSV فارغ" }, { status: 400 });
      }

      const rows = lines.slice(1);
      let inserted = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const cols = splitCsv(rows[i]);
        const [
          course_code,
          topic,
          question,
          option_a,
          option_b,
          option_c,
          option_d,
          correct,
          explanation,
        ] = cols;

        if (!course_code || !question || !option_a || !correct) {
          errors.push(`صف ${i + 2}: ناقص`);
          continue;
        }

        const { data: course } = await admin
          .from("courses")
          .select("id")
          .eq("code", course_code.trim())
          .maybeSingle();
        if (!course) {
          errors.push(`صف ${i + 2}: مادة ${course_code} غير موجودة`);
          continue;
        }

        const c = correct.trim().toUpperCase();
        if (!["A", "B", "C", "D"].includes(c)) {
          errors.push(`صف ${i + 2}: correct يجب A-D`);
          continue;
        }

        const { error } = await admin.from("questions").insert({
          course_id: course.id,
          topic: topic || null,
          question,
          option_a,
          option_b: option_b || "",
          option_c: option_c || "",
          option_d: option_d || "",
          correct: c,
          explanation: explanation || null,
          active: true,
        });
        if (error) errors.push(`صف ${i + 2}: ${error.message}`);
        else inserted++;
      }

      return NextResponse.json({ ok: true, inserted, errors });
    }

    const body = await request.json();
    const { data: course } = await admin
      .from("courses")
      .select("id")
      .eq("code", body.course_code)
      .maybeSingle();
    if (!course) {
      return NextResponse.json({ error: "المادة غير موجودة" }, { status: 400 });
    }

    const { error } = await admin.from("questions").insert({
      course_id: course.id,
      topic: body.topic || null,
      question: body.question,
      option_a: body.option_a,
      option_b: body.option_b,
      option_c: body.option_c,
      option_d: body.option_d,
      correct: String(body.correct).toUpperCase(),
      explanation: body.explanation || null,
      daily_eligible: !!body.daily_eligible,
      active: true,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}

function splitCsv(line: string): string[] {
  const result: string[] = [];
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
