import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/auth";
import { addQuestion, importQuestionsCsv } from "@/features/quiz/quiz";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("text/csv") || contentType.includes("multipart")) {
      let text = "";
      if (contentType.includes("multipart")) {
        const form = await request.formData();
        const file = form.get("file") as File | null;
        if (!file) {
          return NextResponse.json({ error: "ملف CSV مطلوب" }, { status: 400 });
        }
        text = await file.text();
      } else {
        text = await request.text();
      }
      const result = await importQuestionsCsv(text);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({
        ok: true,
        inserted: result.inserted,
        errors: result.errors,
      });
    }

    const body = await request.json();
    const result = await addQuestion(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}
