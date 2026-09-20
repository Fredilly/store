import { getAuth, isAuthConfigured } from "../../../lib/auth";

function loginEmailCookie(email: string) {
  return `login_email=${encodeURIComponent(email)}; Path=/login; Max-Age=300; SameSite=Lax; Secure; HttpOnly`;
}

function clearLoginEmailCookie() {
  return "login_email=; Path=/login; Max-Age=0; SameSite=Lax; Secure; HttpOnly";
}

function redirectTo(request: Request, path: string, cookies: string[] = []) {
  const headers = new Headers({
    Location: new URL(path, request.url).toString(),
    "Content-Type": "text/html; charset=utf-8",
    "Content-Disposition": "inline",
    "Cache-Control": "no-store",
  });

  for (const cookie of cookies) {
    headers.append("Set-Cookie", cookie);
  }

  return new Response(
    '<!doctype html><meta charset="utf-8"><title>Redirecting…</title><p>Redirecting…</p>',
    {
      status: 303,
      headers,
    }
  );
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  cookies: string[] = []
) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });

  for (const cookie of cookies) {
    headers.append("Set-Cookie", cookie);
  }

  return new Response(JSON.stringify(body), { status, headers });
}

export async function POST(request: Request) {
  const wantsJson =
    request.headers.get("x-school-ledger-client") === "fetch";

  if (!isAuthConfigured()) {
    return wantsJson
      ? jsonResponse({ error: "unavailable" }, 503)
      : redirectTo(request, "/login?error=unavailable");
  }

  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    return wantsJson
      ? jsonResponse({ error: "credentials" }, 401)
      : redirectTo(request, "/login?error=credentials", [
          loginEmailCookie(email),
        ]);
  }

  try {
    const response = await getAuth().api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    if (!response.ok) {
      return wantsJson
        ? jsonResponse({ error: "credentials" }, 401)
        : redirectTo(request, "/login?error=credentials", [
            loginEmailCookie(email),
          ]);
    }

    const getSetCookie = (
      response.headers as Headers & { getSetCookie?: () => string[] }
    ).getSetCookie;

    const authCookies =
      typeof getSetCookie === "function"
        ? getSetCookie.call(response.headers)
        : response.headers.get("set-cookie")
          ? [response.headers.get("set-cookie")!]
          : [];

    const cookies = [...authCookies, clearLoginEmailCookie()];

    return wantsJson
      ? jsonResponse({ ok: true }, 200, cookies)
      : redirectTo(request, "/", cookies);
  } catch {
    return wantsJson
      ? jsonResponse({ error: "credentials" }, 401)
      : redirectTo(request, "/login?error=credentials", [
          loginEmailCookie(email),
        ]);
  }
}
