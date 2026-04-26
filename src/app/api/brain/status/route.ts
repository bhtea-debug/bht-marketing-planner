// @ts-nocheck
/**
 * GET /api/brain/status — checks connection to Brain (live ping) and reports cache state.
 */
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { brain_cache } from '@/db/schema';
import BrainClient from '@/lib/brain-client';

export async function GET() {
  const configured = !!process.env.BRAIN_API_BASE && !!process.env.BRAIN_INTER_TOKEN;

  let liveModules = 0;
  let liveOk = false;
  let liveError: string | undefined;
  if (configured) {
    const ping = await BrainClient.ping();
    liveOk = ping.ok;
    liveModules = ping.modules;
    liveError = ping.error;
  }

  const cached = await db.select().from(brain_cache);
  const lastFetch = cached
    .map((r: any) => r.fetched_at)
    .sort()
    .pop();

  return NextResponse.json({
    configured,
    live: { ok: liveOk, modules: liveModules, error: liveError },
    cache: { entries: cached.length, last_synced_at: lastFetch || null },
  });
}
