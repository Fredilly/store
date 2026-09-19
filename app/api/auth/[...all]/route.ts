import { auth, isAuthConfigured } from "../../../../lib/auth";

function unavailable() {
  return Response.json(
    { error: "Authentication is not configured yet." },
    { status: 503 }
  );
}

export async function GET(request: Request) {
  if (!isAuthConfigured()) return unavailable();
  return auth.handler(request);
}

export async function POST(request: Request) {
  if (!isAuthConfigured()) return unavailable();
  return auth.handler(request);
}
