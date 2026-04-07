// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { brand_profile } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { ensureAssetsAndPushLogs } from '@/lib/ensure-tables';

const ALLOWED = [
  'brand_voice',
  'visual_mood',
  'color_palette',
  'fonts',
  'do_list',
  'dont_list',
  'composition_rules',
  'reference_image_urls',
  'inspiration_keywords',
  'target_persona',
];

export async function GET() {
  try {
    await ensureAssetsAndPushLogs();
    const rows = await db
      .select()
      .from(brand_profile)
      .where(eq(brand_profile.id, 1))
      .limit(1);
    return NextResponse.json({ data: rows[0] || null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT - upsert singleton (id=1)
export async function PUT(req: NextRequest) {
  try {
    await ensureAssetsAndPushLogs();
    const body = await req.json();
    const patch: any = {};
    for (const k of ALLOWED) if (k in body) {
      const v = body[k];
      patch[k] = v && typeof v !== 'string' ? JSON.stringify(v) : v;
    }
    patch.updated_at = new Date().toISOString();

    const existing = await db
      .select()
      .from(brand_profile)
      .where(eq(brand_profile.id, 1))
      .limit(1);

    if (existing.length) {
      await db
        .update(brand_profile)
        .set(patch)
        .where(eq(brand_profile.id, 1));
    } else {
      await db.insert(brand_profile).values({ id: 1, ...patch });
    }
    const fresh = await db.select().from(brand_profile).where(eq(brand_profile.id, 1)).limit(1);
    return NextResponse.json({ data: fresh[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
