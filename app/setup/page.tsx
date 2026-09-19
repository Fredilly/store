import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import { getTenant } from "../../lib/tenant";

export default async function SetupPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) redirect("/login");

  const tenant = await getTenant(requestHeaders);
  if (tenant) redirect("/");

  return (
    <main className="authShell">
      <section className="authCard">
        <p className="eyebrow">Almost done</p>
        <h1>Name your school</h1>
        <p className="muted">
          This creates your private school workspace. You can change the name later.
        </p>

        <form action="/api/setup" method="post" className="form authForm">
          <label>
            School name
            <input
              name="school_name"
              autoComplete="organization"
              placeholder="Grace Academy"
              required
            />
          </label>
          <button type="submit">Create school</button>
        </form>
      </section>
    </main>
  );
}
