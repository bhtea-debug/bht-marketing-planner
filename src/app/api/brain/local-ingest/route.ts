// @ts-nocheck
/**
 * POST /api/brain/local-ingest — ingest LOCAL strategic content into brain_cache.
 * For content NOT in remote Brain — uploaded MD files with channel-specific personas,
 * SKU lists, sales data, etc.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { brain_cache } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const maxDuration = 60;

async function upsertCache(kind: string, key: string, payload: any) {
  const now = new Date().toISOString();
  const existing = await db
    .select()
    .from(brain_cache)
    .where(and(eq(brain_cache.kind, kind), eq(brain_cache.key, key)));
  if (existing.length > 0) {
    await db
      .update(brain_cache)
      .set({ payload_json: JSON.stringify(payload), fetched_at: now })
      .where(eq(brain_cache.id, existing[0].id));
    return 'updated';
  } else {
    await db.insert(brain_cache).values({
      kind, key, payload_json: JSON.stringify(payload), fetched_at: now,
    });
    return 'inserted';
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sections = Array.isArray(body.sections) ? body.sections : [];
    if (!sections.length) {
      return NextResponse.json({ error: 'No sections provided' }, { status: 400 });
    }
    const results: Array<{ key: string; status: string }> = [];
    for (const s of sections) {
      if (!s.module_slug || !s.section_slug || !s.title || !s.content) continue;
      const key = `${s.module_slug}/${s.section_slug}`;
      const payload = {
        module_slug: s.module_slug,
        slug: s.section_slug,
        title: s.title,
        content: s.content,
        category: s.category || 'local-ingest',
        source: 'local-upload',
      };
      const status = await upsertCache('section', key, payload);
      results.push({ key, status });
    }
    return NextResponse.json({ ok: true, count: results.length, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const all = await db.select().from(brain_cache).where(eq(brain_cache.kind, 'section'));
    const local = all
      .map((c: any) => {
        try {
          const p = JSON.parse(c.payload_json);
          return p?.source === 'local-upload' ? { key: c.key, title: p.title, category: p.category, len: p.content?.length, fetched_at: c.fetched_at } : null;
        } catch { return null; }
      })
      .filter(Boolean);
    return NextResponse.json({ count: local.length, local });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
