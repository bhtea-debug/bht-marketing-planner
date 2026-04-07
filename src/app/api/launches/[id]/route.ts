// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { product_launches } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const allowed = [
      'name',
      'short_pitch',
      'description',
      'ingredients',
      'category',
      'price_pln',
      'target_audience',
      'status',
      'planned_launch_date',
      'ai_suggested_date',
      'ai_suggestion_notes',
      'notes',
    ];
    const patch: any = { updated_at: new Date().toISOString() };
    for (const k of allowed) if (k in body) patch[k] = body[k];
    const updated = await db
      .update(product_launches)
      .set(patch)
      .where(eq(product_launches.id, parseInt(id)))
      .returning();
    if (!updated.length) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ data: updated[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db
      .delete(product_launches)
      .where(eq(product_launches.id, parseInt(id)));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
