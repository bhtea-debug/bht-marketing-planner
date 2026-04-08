// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { month_plan_drafts } from '@/db/schema';
import { sql, desc, eq } from 'drizzle-orm';
import { ensurePlanDrafts } from '@/lib/ensure-tables';

// GET /api/planner/drafts            -> list all drafts (newest first)
// GET /api/planner/drafts?month=YYYY-MM -> list drafts for that month
export async function GET(req: NextRequest) {
  try {
    await ensurePlanDrafts();
    const url = new URL(req.url);
    const month = url.searchParams.get('month');
    const rows = month
      ? await db
          .select()
          .from(month_plan_drafts)
          .where(eq(month_plan_drafts.month, month))
          .orderBy(desc(month_plan_drafts.updated_at))
      : await db
          .select()
          .from(month_plan_drafts)
          .orderBy(desc(month_plan_drafts.updated_at))
          .limit(50);

    // Don't return the full payload in the list view — too heavy.
    const compact = rows.map((r: any) => ({
      id: r.id,
      month: r.month,
      name: r.name,
      weeks_count: r.weeks_count,
      deployed_count: r.deployed_count,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
    return NextResponse.json({ data: compact });
  } catch (e: any) {
    console.error('[drafts:list]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/planner/drafts
// Body: { id?, month, name?, payload, weeks_count?, deployed_count?, status? }
// If id is provided -> update; otherwise -> insert.
export async function POST(req: NextRequest) {
  try {
    await ensurePlanDrafts();
    const body = await req.json();
    const { id, month, name, payload, weeks_count, deployed_count, status } = body || {};
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month required as YYYY-MM' }, { status: 400 });
    }
    if (payload === undefined || payload === null) {
      return NextResponse.json({ error: 'payload required' }, { status: 400 });
    }
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const now = new Date().toISOString();

    if (id) {
      await db
        .update(month_plan_drafts)
        .set({
          month,
          name: name ?? null,
          payload: payloadStr,
          weeks_count: Number(weeks_count || 0),
          deployed_count: Number(deployed_count || 0),
          status: status || 'draft',
          updated_at: now,
        })
        .where(eq(month_plan_drafts.id, Number(id)));
      return NextResponse.json({ data: { id: Number(id), updated: true } });
    }

    const inserted = await db
      .insert(month_plan_drafts)
      .values({
        month,
        name: name ?? null,
        payload: payloadStr,
        weeks_count: Number(weeks_count || 0),
        deployed_count: Number(deployed_count || 0),
        status: status || 'draft',
        created_at: now,
        updated_at: now,
      })
      .returning({ id: month_plan_drafts.id });

    return NextResponse.json({ data: { id: inserted[0]?.id, created: true } });
  } catch (e: any) {
    console.error('[drafts:upsert]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
