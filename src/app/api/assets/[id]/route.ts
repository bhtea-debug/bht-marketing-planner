// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const allowed = [
      'product_name',
      'asset_type',
      'url',
      'thumbnail_url',
      'alt_text',
      'tags',
      'meta_image_hash',
      'meta_video_id',
      'notes',
    ];
    const patch: any = {};
    for (const k of allowed) if (k in body) patch[k] = body[k];
    const updated = await db
      .update(assets)
      .set(patch)
      .where(eq(assets.id, parseInt(id)))
      .returning();
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
    await db.delete(assets).where(eq(assets.id, parseInt(id)));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
