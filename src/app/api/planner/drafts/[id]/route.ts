// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { month_plan_drafts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensurePlanDrafts } from '@/lib/ensure-tables';

// GET /api/planner/drafts/[id] -> full draft including payload
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensurePlanDrafts();
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const rows = await db
      .select()
      .from(month_plan_drafts)
      .where(eq(month_plan_drafts.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
    let payload: any = null;
    try {
      payload = JSON.parse(row.payload);
    } catch {
      payload = row.payload;
    }
    return NextResponse.json({
      data: {
        id: row.id,
        month: row.month,
        name: row.name,
        weeks_count: row.weeks_count,
        deployed_count: row.deployed_count,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        payload,
      },
    });
  } catch (e: any) {
    console.error('[drafts:get]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/planner/drafts/[id] -> update payload + counters
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensurePlanDrafts();
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const body = await req.json();
    const { name, payload, weeks_count, deployed_count, status } = body || {};
    const update: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) update.name = name;
    if (payload !== undefined) {
      update.payload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    }
    if (weeks_count !== undefined) update.weeks_count = Number(weeks_count || 0);
    if (deployed_count !== undefined) update.deployed_count = Number(deployed_count || 0);
    if (status !== undefined) update.status = status;
    await db.update(month_plan_drafts).set(update).where(eq(month_plan_drafts.id, id));
    return NextResponse.json({ data: { id, updated: true } });
  } catch (e: any) {
    console.error('[drafts:put]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/planner/drafts/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensurePlanDrafts();
    const id = Number(params.id);
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.delete(month_plan_drafts).where(eq(month_plan_drafts.id, id));
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (e: any) {
    console.error('[drafts:delete]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
