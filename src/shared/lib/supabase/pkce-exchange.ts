import type { NextRequest } from "next/server";
import https from "node:https";

function projectRefFromUrl(supabaseUrl: string): string {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function parseCodeVerifier(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    if (raw.startsWith("base64-")) {
      const decoded = Buffer.from(raw.slice(7), "base64").toString("utf8");
      return JSON.parse(decoded) as string;
    }
    return raw;
  } catch {
    return null;
  }
}

export function getCodeVerifierFromRequest(
  request: NextRequest,
  supabaseUrl: string
): string | null {
  const ref = projectRefFromUrl(supabaseUrl);
  const raw = request.cookies.get(`sb-${ref}-auth-token-code-verifier`)?.value;
  return parseCodeVerifier(raw);
}

function httpsPostJson(
  url: string,
  headers: Record<string, string>,
  body: object
): Promise<unknown> {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(payload),
        },
        family: 4,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (!res.statusCode || res.statusCode >= 400) {
            reject(new Error(data || `HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error("Invalid JSON from Supabase"));
          }
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error("Supabase timeout"));
    });
    req.write(payload);
    req.end();
  });
}

export async function exchangePkceCode(
  request: NextRequest,
  supabaseUrl: string,
  anonKey: string,
  code: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  const codeVerifier = getCodeVerifierFromRequest(request, supabaseUrl);
  if (!codeVerifier) return null;

  const tokenUrl = `${supabaseUrl}/auth/v1/token?grant_type=pkce`;
  const headers = {
    "Content-Type": "application/json",
    apikey: anonKey,
  };
  const body = { auth_code: code, code_verifier: codeVerifier };

  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { access_token?: string; refresh_token?: string };
    if (!data.access_token || !data.refresh_token) return null;
    return { access_token: data.access_token, refresh_token: data.refresh_token };
  } catch {
    try {
      const data = (await httpsPostJson(tokenUrl, headers, body)) as {
        access_token?: string;
        refresh_token?: string;
      };
      if (!data.access_token || !data.refresh_token) return null;
      return { access_token: data.access_token, refresh_token: data.refresh_token };
    } catch {
      return null;
    }
  }
}
