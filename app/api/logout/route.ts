import { getAuth } from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const result = await getAuth().api.signOut({
      headers: request.headers,
      returnHeaders: true,
    });

    const response = Response.redirect(new URL("/login", request.url), 303);
    const setCookie = result.headers.get("set-cookie");
    if (setCookie) response.headers.append("set-cookie", setCookie);
    return response;
  } catch {
    return Response.redirect(new URL("/login?error=logout", request.url), 303);
  }
}
