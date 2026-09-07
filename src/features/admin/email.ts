const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_BATCH_SIZE = 100;

export type BroadcastEmailResult =
  | { ok: true; sent: number; failed: number }
  | { ok: false; sent: number; failed: number; error: string };

export async function sendBroadcastEmail(input: {
  messageId: string;
  recipients: string[];
  subject: string;
  text: string;
}): Promise<BroadcastEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BROADCAST_EMAIL_FROM?.trim();
  const recipients = [...new Set(input.recipients)]
    .map((email) => email.trim().toLowerCase())
    .filter((email) => EMAIL_PATTERN.test(email));

  if (!apiKey || !from) {
    return {
      ok: false,
      sent: 0,
      failed: recipients.length,
      error: "أضف RESEND_API_KEY وBROADCAST_EMAIL_FROM إلى Vercel.",
    };
  }

  let sent = 0;
  let failed = 0;
  let lastError = "";

  for (let index = 0; index < recipients.length; index += RESEND_BATCH_SIZE) {
    const chunk = recipients.slice(index, index + RESEND_BATCH_SIZE);
    try {
      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `gazameel-${input.messageId}-${index / RESEND_BATCH_SIZE}`,
        },
        body: JSON.stringify(
          chunk.map((email) => ({
            from,
            to: [email],
            subject: input.subject,
            text: input.text,
          }))
        ),
      });

      if (!response.ok) {
        failed += chunk.length;
        lastError = `Resend: ${response.status}`;
        continue;
      }
      sent += chunk.length;
    } catch {
      failed += chunk.length;
      lastError = "تعذّر الاتصال بخدمة البريد.";
    }
  }

  if (failed > 0) {
    return {
      ok: false,
      sent,
      failed,
      error: lastError || "تعذّر إرسال بعض الرسائل.",
    };
  }
  return { ok: true, sent, failed: 0 };
}
