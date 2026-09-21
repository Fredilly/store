import { getAuth } from "../../../lib/auth";

function redirectWithError(request: Request, error: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("mode", "signup");
  url.searchParams.set("error", error);
  return Response.redirect(url, 303);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirmPassword = String(form.get("confirm_password") ?? "");

  if (!name || !email.includes("@") || password.length < 8) {
    return redirectWithError(request, "signup");
  }

  if (password !== confirmPassword) {
    return redirectWithError(request, "passwords");
  }

  try {
    const result = await getAuth().api.signUpEmail({
      body: { name, email, password },
      headers: request.headers,
      returnHeaders: true,
    });

    const response = Response.redirect(new URL("/", request.url), 303);
    const setCookie = result.headers.get("set-cookie");
    if (setCookie) response.headers.append("set-cookie", setCookie);
    return response;
  } catch {
    return redirectWithError(request, "signup");
  }
}
