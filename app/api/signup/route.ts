import { getAuth } from "../../../lib/auth";

function formCookie(name: string, value: string) {
  return `${name}=${encodeURIComponent(value)}; Path=/login; Max-Age=600; SameSite=Lax; Secure; HttpOnly`;
}

function clearFormCookie(name: string) {
  return `${name}=; Path=/login; Max-Age=0; SameSite=Lax; Secure; HttpOnly`;
}

function redirectWithError(
  request: Request,
  error: string,
  values: { name: string; email: string }
) {
  const url = new URL("/login", request.url);
  url.searchParams.set("mode", "signup");
  url.searchParams.set("error", error);

  const headers = new Headers({ Location: url.toString() });
  headers.append("Set-Cookie", formCookie("signup_name", values.name));
  headers.append("Set-Cookie", formCookie("login_email", values.email));

  return new Response(null, { status: 303, headers });
}

function errorCode(error: unknown) {
  const candidate = error as {
    body?: { code?: string };
    code?: string;
    message?: string;
    status?: string | number;
  };

  return {
    code: candidate.body?.code ?? candidate.code ?? "",
    message: candidate.message ?? "",
    status: candidate.status ?? "",
  };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirmPassword = String(form.get("confirm_password") ?? "");
  const values = { name, email };

  if (!name || !email.includes("@") || password.length < 8) {
    return redirectWithError(request, "signup", values);
  }

  if (password !== confirmPassword) {
    return redirectWithError(request, "passwords", values);
  }

  try {
    await getAuth().api.signUpEmail({
      body: { name, email, password },
      headers: request.headers,
    });

    // Do not report signup success until the exact submitted password
    // can authenticate the newly created account.
    const signInResponse = await getAuth().api.signInEmail({
      body: { email, password },
      asResponse: true,
    });

    if (!signInResponse.ok) {
      console.error("Signup credential verification failed", { email });
      return redirectWithError(request, "signup", values);
    }

    const headers = new Headers({
      Location: new URL("/", request.url).toString(),
    });

    const getSetCookie = (
      signInResponse.headers as Headers & { getSetCookie?: () => string[] }
    ).getSetCookie;

    const authCookies =
      typeof getSetCookie === "function"
        ? getSetCookie.call(signInResponse.headers)
        : signInResponse.headers.get("set-cookie")
          ? [signInResponse.headers.get("set-cookie")!]
          : [];

    for (const cookie of authCookies) headers.append("Set-Cookie", cookie);
    headers.append("Set-Cookie", clearFormCookie("signup_name"));
    headers.append("Set-Cookie", clearFormCookie("login_email"));

    return new Response(null, { status: 303, headers });
  } catch (error) {
    const details = errorCode(error);
    console.error("Signup failed", {
      code: details.code,
      status: details.status,
      message: details.message,
    });

    const alreadyExists =
      details.code === "USER_ALREADY_EXISTS" ||
      /already exists|already registered|user exists/i.test(details.message);

    return redirectWithError(
      request,
      alreadyExists ? "existing" : "signup",
      values
    );
  }
}
