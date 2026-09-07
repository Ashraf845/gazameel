---
name: theme-contrast
description: >-
  Enforces Gazameel (and dual theme) text/background contrast: never white or
  near-white text on light backgrounds. Use when writing or editing UI, Tailwind
  classes, CSS, pages, components, light/dark theme, or when the user mentions
  contrast, readability, نص أبيض, خلفية فاتحة, or invisible text.
---

# Theme contrast — لا نص أبيض على خلفية فاتحة

## القاعدة (حرفيًا من المستخدم)

اوعك تكتب نص بالابيض ع خلفية فاتحة لانها مشكلة

## إلزامي في Gazameel

المنصة تدعم **دارك** و**لايت**. أي لون ثابت يفترض خلفية داكنة سيكسر الوضع الفاتح.

### افعل

- استخدم توكنات الثيم فقط:
  - نص أساسي: `text-[var(--text-primary)]`
  - نص ثانوي: `text-[var(--text-secondary)]`
  - حدود: `border-[var(--border)]`
  - خلفية سطح: `bg-[var(--bg-surface)]` / `bg-[var(--bg-primary)]`
  - تمييز: `text-[var(--accent-gold)]`
  - نص فوق زر ذهبي: `text-[var(--accent-gold-text-on)]`
- بعد أي UI جديد: تحقق بصريًا من **الوضع الفاتح** و**الداكن**.

### لا تفعل

- `text-white` / `text-white/50` … على محتوى الصفحة
- `border-white/*` أو `bg-white/10` كافتراض للثيم الداكن فقط
- ألوان قديمة ثابتة مثل `#7dcea0` أو أخضر الثيم السابق

### استثناء ضيق

`text-white` مسموح فقط فوق خلفية داكنة/ملونة ثابتة التباين في **كلا** الوضعين (نادر). الأفضل: `text-[var(--accent-gold-text-on)]` فوق الذهب.
