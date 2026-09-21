import { db } from "./db";

export type PlatformSchoolRow = {
  orgId: string;
  schoolName: string;
  createdAt: string;
  ownerName: string;
  ownerEmail: string;
  staffCount: number;
  itemCount: number;
  stockMovementCount: number;
  saleCount: number;
  lastActivityAt: string | null;
  status: "Signed up" | "Added inventory" | "First sale" | "Active";
};

export async function platformSchoolOverview() {
  const database = db();

  const totals = await database
    .prepare(
      `SELECT
        COUNT(*) AS schools,
        SUM(CASE WHEN datetime(created_at) >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS newThisWeek
      FROM organizations
      WHERE id != 'org_default'`
    )
    .first<{ schools: number; newThisWeek: number }>();

  const rows = await database
    .prepare(
      `SELECT
        o.id AS orgId,
        o.name AS schoolName,
        o.created_at AS createdAt,
        COALESCE(owner.name, '—') AS ownerName,
        COALESCE(owner.email, '—') AS ownerEmail,
        (
          SELECT COUNT(*)
          FROM organization_members sm
          WHERE sm.organization_id = o.id
            AND sm.role = 'STAFF'
            AND sm.status = 'ACTIVE'
        ) AS staffCount,
        (
          SELECT COUNT(*)
          FROM products p
          WHERE p.organization_id = o.id
            AND p.active = 1
        ) AS itemCount,
        (
          SELECT COUNT(*)
          FROM stock_movements st
          WHERE st.organization_id = o.id
        ) AS stockMovementCount,
        (
          SELECT COUNT(*)
          FROM sales s
          WHERE s.organization_id = o.id
            AND s.status = 'COMPLETED'
        ) AS saleCount,
        (
          SELECT MAX(a.created_at)
          FROM audit_events a
          WHERE a.organization_id = o.id
        ) AS lastActivityAt
      FROM organizations o
      LEFT JOIN organization_members om
        ON om.organization_id = o.id
       AND om.role = 'OWNER'
       AND om.status = 'ACTIVE'
      LEFT JOIN "user" owner
        ON owner.id = om.user_id
      WHERE o.id != 'org_default'
      ORDER BY COALESCE(
        (SELECT MAX(a2.created_at) FROM audit_events a2 WHERE a2.organization_id = o.id),
        o.created_at
      ) DESC`
    )
    .all<{
      orgId: string;
      schoolName: string;
      createdAt: string;
      ownerName: string;
      ownerEmail: string;
      staffCount: number;
      itemCount: number;
      stockMovementCount: number;
      saleCount: number;
      lastActivityAt: string | null;
    }>();

  const schools: PlatformSchoolRow[] = (rows.results ?? []).map((row) => {
    const status: PlatformSchoolRow["status"] =
      row.saleCount >= 2
        ? "Active"
        : row.saleCount === 1
          ? "First sale"
          : row.stockMovementCount > 0
            ? "Added inventory"
            : "Signed up";

    return { ...row, status };
  });

  return {
    totalSchools: Number(totals?.schools ?? 0),
    newThisWeek: Number(totals?.newThisWeek ?? 0),
    schools,
  };
}
