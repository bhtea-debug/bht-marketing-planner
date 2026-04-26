// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { marketing_trends } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const platform = url.searchParams.get('platform');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

  let q = db.select().from(marketing_trends).where(eq(marketing_trends.active, 1)).orderBy(desc(marketing_trends.relevance_score)).limit(limit);
  const all = await q;
  const filtered = platform ? all.filter((t: any) => t.platform === platform || t.platform === 'cross') : all;

  const lastScan = filtered.length ? filtered.map((t: any) => t.scanned_at).sort().pop() : null;

  return NextResponse.json({
    count: filtered.length,
    last_scanned_at: lastScan,
    trends: filtered.map((t: any) => ({
      ...t,
      source_urls: t.source_urls ? (() => { try { return JSON.parse(t.source_urls); } catch { return []; } })() : [],
    })),
  });
}
