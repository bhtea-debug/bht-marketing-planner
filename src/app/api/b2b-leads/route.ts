// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { b2b_campaigns } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { ensureB2bCampaigns } from '@/lib/ensure-tables';

// GET /api/b2b-leads — list all B2B campaigns
export async function GET() {
  try {
    await ensureB2bCampaigns();
    const rows = await db
      .select()
      .from(b2b_campaigns)
      .orderBy(desc(b2b_campaigns.updated_at))
      .limit(100);
    return NextResponse.json({ data: rows });
  } catch (e: any) {
    console.error('[b2b-leads:list]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/b2b-leads — create or update a B2B campaign
export async function POST(req: NextRequest) {
  try {
    await ensureB2bCampaigns();
    const body = await req.json();
    const { id, name, segment, objective, ai_campaign_json, user_notes, monthly_budget_pln, status, leads_count } = body;
    const now = new Date().toISOString();

    if (id) {
      await db.update(b2b_campaigns).set({
        name: name ?? undefined,
        segment: segment ?? undefined,
        objective: objective ?? undefined,
        ai_campaign_json: ai_campaign_json ? (typeof ai_campaign_json === 'string' ? ai_campaign_json : JSON.stringify(ai_campaign_json)) : undefined,
        user_notes: user_notes ?? undefined,
        monthly_budget_pln: monthly_budget_pln ?? undefined,
        status: status ?? undefined,
        leads_count: leads_count ?? undefined,
        updated_at: now,
      }).where(eq(b2b_campaigns.id, Number(id)));
      return NextResponse.json({ data: { id: Number(id), updated: true } });
    }

    if (!name || !segment) {
      return NextResponse.json({ error: 'name and segment are required' }, { status: 400 });
    }

    const inserted = await db.insert(b2b_campaigns).values({
      name,
      segment,
      objective: objective || null,
      ai_campaign_json: ai_campaign_json ? (typeof ai_campaign_json === 'string' ? ai_campaign_json : JSON.stringify(ai_campaign_json)) : null,
      user_notes: user_notes || null,
      monthly_budget_pln: monthly_budget_pln || null,
      status: status || 'draft',
      leads_count: leads_count || 0,
      created_at: now,
      updated_at: now,
    }).returning({ id: b2b_campaigns.id });

    return NextResponse.json({ data: { id: inserted[0]?.id, created: true } });
  } catch (e: any) {
    console.error('[b2b-leads:upsert]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/b2b-leads — delete a campaign
export async function DELETE(req: NextRequest) {
  try {
    await ensureB2bCampaigns();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.delete(b2b_campaigns).where(eq(b2b_campaigns.id, Number(id)));
    return NextResponse.json({ data: { deleted: true } });
  } catch (e: any) {
    console.error('[b2b-leads:delete]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
