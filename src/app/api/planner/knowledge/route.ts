// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { planning_knowledge } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ensurePlanningKnowledge } from '@/lib/ensure-tables';

// GET /api/planner/knowledge        -> all active entries
// GET /api/planner/knowledge?all=1   -> including disabled
export async function GET(req: NextRequest) {
  try {
    await ensurePlanningKnowledge();
    const url = new URL(req.url);
    const showAll = url.searchParams.get('all') === '1';
    const rows = showAll
      ? await db.select().from(planning_knowledge).orderBy(desc(planning_knowledge.created_at))
      : await db
          .select()
          .from(planning_knowledge)
          .where(eq(planning_knowledge.active, 1))
          .orderBy(desc(planning_knowledge.created_at));
    return NextResponse.json({ data: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/planner/knowledge
// Body: { entries: [{ category, content, source? }] }
// or single: { category, content, source? }
export async function POST(req: NextRequest) {
  try {
    await ensurePlanningKnowledge();
    const body = await req.json();
    const entries = Array.isArray(body.entries) ? body.entries : [body];
    const now = new Date().toISOString();
    const inserted: any[] = [];
    for (const e of entries) {
      if (!e.category || !e.content) continue;
      const row = await db
        .insert(planning_knowledge)
        .values({
          category: e.category,
          content: e.content.trim(),
          source: e.source || 'manual',
          active: 1,
          created_at: now,
        })
        .returning({ id: planning_knowledge.id });
      inserted.push(row[0]);
    }
    return NextResponse.json({ data: { created: inserted.length, ids: inserted.map((r) => r.id) } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/planner/knowledge
// Body: { id } — soft-disable (set active=0) or { id, hard: true } — hard delete
export async function DELETE(req: NextRequest) {
  try {
    await ensurePlanningKnowledge();
    const { id, hard } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (hard) {
      await db.delete(planning_knowledge).where(eq(planning_knowledge.id, Number(id)));
    } else {
      await db.update(planning_knowledge).set({ active: 0 }).where(eq(planning_knowledge.id, Number(id)));
    }
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
