import { getAuth, isAuthConfigured } from "../../../lib/auth";

function redirectTo(request: Request, path: string, cookies: string[] = []) {
  const headers = new Headers({
    Location: new URL(path, request.url).toString(),
  });

  for (const cookie of cookies) {
    headers.append("Set-Cookie", cookie);
  }

  return new Response(null, {
    status: 303,
    headers,
  });
}

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return redirectTo(request, "/login?error=unavailable");
  }

  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    return redirectTo(request, "/login?error=credentials");
  }

  try {
    const response = await getAuth().api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    if (!response.ok) {
      return redirectTo(request, "/login?error=credentials");
    }

    const getSetCookie = (
      response.headers as Headers & { getSetCookie?: () => string[] }
    ).getSetCookie;

    const cookies =
      typeof getSetCookie === "function"
        ? getSetCookie.call(response.headers)
        : response.headers.get("set-cookie")
          ? [response.headers.get("set-cookie")!]
          : [];

    return redirectTo(request, "/", cookies);
  } catch {
    return redirectTo(request, "/login?error=credentials");
  }
}
