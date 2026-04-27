// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { planning_knowledge } from '@/db/schema';

/**
 * POST /api/launches/proposal-feedback
 * Body: { proposal: any, channel: string, critique: string, category?: string }
 *
 * Saves user's critique as a planning_knowledge entry so future AI generations
 * learn from it. The critique becomes a hard rule the model must respect.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const proposal = body.proposal || {};
    const channel = String(body.channel || '');
    const critique = String(body.critique || '').trim();
    const category = body.category || 'lesson';
    if (!critique) return NextResponse.json({ error: 'Brak krytyki' }, { status: 400 });

    const content = `KRYTYKA PROPOZYCJI: "${proposal.name || 'unnamed'}" (kanał ${channel}). User powiedział: ${critique}. Wniosek dla AI: nie powtarzać tego błędu w kolejnych propozycjach.`;

    await db.insert(planning_knowledge).values({
      category,
      content: content.slice(0, 1500),
      source: 'manual',
      active: 1,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
