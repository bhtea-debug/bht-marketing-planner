// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { product_launches } from '@/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/launches/:id/resuggest
// Body: { user_notes?: string, persist?: boolean }
// Loads the launch, calls /api/launches/suggest-timing with the saved
// product fields + previous_suggestion + user_notes, optionally persists
// the new suggestion + notes back onto the row.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const launchId = parseInt(id);

    const rows = await db
      .select()
      .from(product_launches)
      .where(eq(product_launches.id, launchId));
    if (!rows.length) {
      return NextResponse.json({ error: 'launch not found' }, { status: 404 });
    }
    const launch = rows[0];

    let previous: any = null;
    if (launch.ai_suggestion_json) {
      try {
        previous = JSON.parse(launch.ai_suggestion_json);
      } catch {}
    }

    const userNotes =
      typeof body.user_notes === 'string' && body.user_notes.trim()
        ? body.user_notes.trim()
        : launch.user_notes || null;

    // Call our own suggest-timing route (in-process via fetch is overkill;
    // import the handler logic directly would be cleaner, but to keep
    // surface area small we re-fetch the same origin).
    const origin = req.nextUrl.origin;
    const r = await fetch(`${origin}/api/launches/suggest-timing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        launch_type: launch.launch_type || 'single',
        name: launch.name,
        short_pitch: launch.short_pitch,
        description: launch.description,
        ingredients: launch.ingredients,
        category: launch.category,
        price_pln: launch.price_pln,
        target_audience: launch.target_audience,
        earliest_date: launch.planned_launch_date || null,
        notes: launch.notes,
        user_notes: userNotes,
        previous_suggestion: previous,
      }),
    });
    const json = await r.json();
    if (!r.ok || !json?.data?.suggestion) {
      return NextResponse.json(
        {
          error: json?.error || 'suggest-timing failed',
          parseError: json?.parseError || null,
          raw: json?.raw || null,
        },
        { status: r.status || 502 }
      );
    }

    const suggestion = json.data.suggestion;
    const persist = body.persist !== false;
    let updated = launch;
    if (persist) {
      const upd = await db
        .update(product_launches)
        .set({
          ai_suggestion_json: JSON.stringify(suggestion),
          ai_suggested_date: suggestion.suggested_date || launch.ai_suggested_date,
          ai_suggestion_notes: suggestion.rationale || launch.ai_suggestion_notes,
          user_notes: userNotes,
          updated_at: new Date().toISOString(),
        })
        .where(eq(product_launches.id, launchId))
        .returning();
      if (upd.length) updated = upd[0];
    }

    return NextResponse.json({
      data: { launch: updated, suggestion, previous },
    });
  } catch (e: any) {
    console.error('[resuggest]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
