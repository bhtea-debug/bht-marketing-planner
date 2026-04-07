// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { eq, like, or } from 'drizzle-orm';
import { ensureAssetsAndPushLogs } from '@/lib/ensure-tables';

export async function GET(req: NextRequest) {
  try {
    await ensureAssetsAndPushLogs();
    const product = req.nextUrl.searchParams.get('product');
    const tag = req.nextUrl.searchParams.get('tag');
    let q = db.select().from(assets);
    if (product) q = q.where(like(assets.product_name, `%${product}%`));
    else if (tag) q = q.where(like(assets.tags, `%${tag}%`));
    const rows = await q;
    return NextResponse.json({ data: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureAssetsAndPushLogs();
    const body = await req.json();
    if (!body.url || !body.asset_type) {
      return NextResponse.json(
        { error: 'url and asset_type required' },
        { status: 400 }
      );
    }
    const inserted = await db
      .insert(assets)
      .values({
        product_name: body.product_name || null,
        asset_type: body.asset_type === 'video' ? 'video' : 'image',
        url: body.url,
        thumbnail_url: body.thumbnail_url || null,
        alt_text: body.alt_text || null,
        tags: body.tags || null,
        notes: body.notes || null,
      })
      .returning();
    return NextResponse.json({ data: inserted[0] }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
