// @ts-nocheck
/**
 * GET /api/brain/strategy — returns consolidated strategy view from local cache.
 * Optional ?module=<slug> filter.
 */
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { brain_cache } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const moduleFilter = url.searchParams.get('module');

  const modulesIndex = await db
    .select()
    .from(brain_cache)
    .where(eq(brain_cache.kind, 'modules_index'));

  const modules = modulesIndex.length ? JSON.parse(modulesIndex[0].payload_json) : [];

  const sections = await db.select().from(brain_cache).where(eq(brain_cache.kind, 'section'));

  const result = sections
    .map((s: any) => {
      try {
        return { ...JSON.parse(s.payload_json), _key: s.key, _fetched_at: s.fetched_at };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((s: any) => !moduleFilter || s.module_slug === moduleFilter);

  return NextResponse.json({
    modules,
    sections: result,
    count: result.length,
  });
}
