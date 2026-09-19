import { authCapabilities } from "../../../lib/auth";

export async function GET() {
  return Response.json(authCapabilities(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
