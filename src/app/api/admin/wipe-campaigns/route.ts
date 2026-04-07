// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

// POST /api/admin/wipe-campaigns
// Wipes all campaigns + tasks + budget_entries + kpi_entries.
// Preserves: channels, integrations, product_launches.
// Body: { confirm: "YES" }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.confirm !== 'YES') {
      return NextResponse.json(
        { error: 'pass { "confirm": "YES" } to wipe' },
        { status: 400 }
      );
    }

    const counts: any = {};
    // Order matters due to FK references
    for (const table of ['tasks', 'budget_entries', 'kpi_entries', 'campaigns']) {
      try {
        const before = await db.run(sql.raw(`SELECT COUNT(*) as c FROM ${table}`));
        const c = (before.rows?.[0]?.c ?? before[0]?.c) || 0;
        await db.run(sql.raw(`DELETE FROM ${table}`));
        counts[table] = Number(c);
      } catch (e: any) {
        counts[table] = `error: ${e.message}`;
      }
    }

    return NextResponse.json({ ok: true, deleted: counts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
