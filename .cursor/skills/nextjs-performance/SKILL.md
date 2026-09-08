---
name: nextjs-performance
description: >-
  Enforces Gazameel Next.js performance rules: SSG/ISR and revalidate over
  force-dynamic, next/image, Server Components by default, no client useEffect for
  initial data, selective Supabase columns and pagination, small client leaves,
  and never exposing quiz answers. Use when writing or editing pages, components,
  data fetching, caching, images, fonts, API routes, Server Actions, or when the
  user mentions أداء, ISR, revalidate, next/image, bundle, or performance.
---

# Gazameel — Next.js & Performance

طبّق القواعد التالية عند أي صفحة أو جلب بيانات أو أصل. لا تضف مكتبات ثقيلة (TanStack Query، Zod، bundle-analyzer) إلا عند الحاجة الفعلية.

## في Gazameel (حتى لا تتعارض مع الهيكل)

- الصفحات العامة (`/`, `/hub`, `/calendar`, `/countdown`, `/contributors`): `export const revalidate = 60` — لا `force-dynamic`.
- الصفحات المرتبطة بالمستخدم (`/admin`, `/upload`, `/inbox`, `/progress`, `/telegram`): تبقى ديناميكية.
- المنطق يبقى في `src/features/`؛ الـ API في `src/app/api/(*)/` رفيع. **لا تستبدل** مسارات API الموجودة بـ Server Actions دفعة واحدة — Actions مسموحة للmutations الجديدة البسيطة.
- لا تُدخل `@tanstack/react-query` لمكتبة أو تقويم عام؛ الجلب على السيرفر.
- الخط: `globals.css` + رابط Cairo (البناء بدون شبكة). لا تُرجع `next/font/google` إلا إذا ضمنت البناء أوفلاين.
- صور المستخدم (Avatar Google): `next/image` مع `width`/`height` و`referrerPolicy="no-referrer"`.
- إجابات الكويز: لا SELECT على `questions.correct` من العميل — انظر `rls.sql` و`features/quiz`.
- تفاصيل قاعدة البيانات: `.cursor/skills/supabase-performance/SKILL.md`

## 1. Core Performance Principles

- Avoid Premature Optimization - Profile before optimizing.
- Optimize Judiciously - Document optimizations and their rationale.
- SSG/ISR Priority - Use Static Site Generation and Incremental Static Regeneration for static & dynamic-static hybrid pages.
- Revalidation over Dynamic Rendering - Prefer `revalidatePath()` and `revalidateTag()` over full dynamic rendering.

## 2. Image & Asset Optimization

- Always use `next/image` with explicit `width`/`height` (use `fill` only with a proper `sizes` attribute defined).
- Optimize images with appropriate formats and lazy loading.
- Use `priority` prop for above-the-fold images.
- Use `next/font` for fonts to prevent Layout Shift (CLS).

استثناء Gazameel للخطوط: رابط Cairo في `layout.tsx` مقصود حتى لا يفشل `next build` بدون شبكة. لا تغيّره بلا سبب.

## 3. Code Splitting & Lazy Loading

- Use `dynamic()` from `next/dynamic` for heavy client components.
- Implement lazy loading for non-critical components.
- Use Suspense boundaries strategically with fallback skeletons.
- Analyze bundle sizes using `@next/bundle-analyzer` when adding heavy packages.

لا تضف `@next/bundle-analyzer` إلا عند إضافة حزمة ثقيلة فعلًا.

## 4. Data Fetching & Caching Patterns

- Use **Server Components by default** for data fetching.
- Avoid `useEffect` for initial data fetching on the client side.
- For dynamic data that updates periodically, use time-based revalidation: `fetch(url, { next: { revalidate: 60 } })` instead of hardcoded `force-cache`.
- Always select specific required columns from Supabase (e.g., `select('id, title, url')`) instead of `select('*')`.
- Enforce pagination or explicit `.limit()` constraints on list queries.
- Use `React.Suspense` with meaningful fallbacks at data boundaries.

`useEffect` مسموح للأوث، الثيم، إبقاء الجلسة، والقوائم التي تتفاعل بعد إجراء المستخدم — ليس للجرد الأولي للمكتبة/التقويم.

## 5. Client Component Optimization

- Only mark components as `'use client'` when strictly necessary (state, effects, browser event handlers).
- Keep client components small and focused at the leaves of the component tree.
- Use `React.memo` only when profiler shows unnecessary re-renders.
- Use TanStack React Query for complex client-side caching and synchronization.

لا تثبّت TanStack Query بشكل وقائي. لوحة الأدمن والكويز تبقى عميلًا لأنها نماذج.

## 6. Server Actions, Mutations & Security

- Use Server Actions instead of API routes where possible.
- Validate inputs with Zod before processing any mutation.
- Use `revalidatePath()` after mutations instead of `router.refresh()`.
- Never expose sensitive table columns (e.g., quiz correct answers) in client-accessible API responses or public Supabase RLS policies.

في Gazameel: مسار API الحالي (`requireUser` / `requireAdmin` ثم `features/`) يبقى المصدر. أي mutation جديدة: تحقّق في `features/`؛ Zod اختياري عند تعقّد المدخلات — لا تضفه لمشروع فارغ منه. بعد موافقة ملف أو إضافة موعد: `revalidatePath("/hub")` و`/calendar` حسب الحاجة.

## أمثلة سريعة

```ts
// صفحة عامة
export const revalidate = 60;

// قائمة
.select("id, title, resource_type")
.range(from, from + pageSize - 1)

// كويز — للعميل
toPlayableQuestion(row) // بلا correct / explanation
```
