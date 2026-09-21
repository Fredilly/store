import { db } from "../../../lib/db";
import { isAuthConfigured } from "../../../lib/auth";

export async function GET() {
  try {
    if (!isAuthConfigured()) {
      return Response.json({ ok: false }, { status: 503 });
    }

    const row = await db().prepare("SELECT 1 AS ok").first<{ ok: number }>();
    if (Number(row?.ok ?? 0) !== 1) {
      return Response.json({ ok: false }, { status: 503 });
    }

    return Response.json(
      { ok: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
