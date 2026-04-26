// @ts-nocheck
/**
 * POST /api/brain/sync — manual full sync of Brain content into local cache.
 * Read-only towards Brain; writes only to local brain_cache table.
 */
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { brain_cache } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import BrainClient from '@/lib/brain-client';

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
  } else {
    await db.insert(brain_cache).values({
      kind,
      key,
      payload_json: JSON.stringify(payload),
      fetched_at: now,
    });
  }
}

export async function POST() {
  try {
    const startedAt = Date.now();
    const modules = await BrainClient.listModules();
    await upsertCache('modules_index', '*', modules);

    let sectionsCount = 0;
    for (const mod of modules) {
      const sections = await BrainClient.listSections(mod.slug);
      await upsertCache('sections_index', mod.slug, sections);
      for (const sec of sections) {
        const full = await BrainClient.getSection(mod.slug, sec.slug);
        if (full) {
          await upsertCache('section', `${mod.slug}/${sec.slug}`, full);
          sectionsCount++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      modules: modules.length,
      sections: sectionsCount,
      duration_ms: Date.now() - startedAt,
      synced_at: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  // Quick status without sync
  const cnt = await db.select().from(brain_cache);
  const lastFetch = cnt
    .map((r: any) => r.fetched_at)
    .sort()
    .pop();
  return NextResponse.json({
    cached_entries: cnt.length,
    last_fetched_at: lastFetch || null,
  });
}
