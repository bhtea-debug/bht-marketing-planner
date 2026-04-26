// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { product_launches } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function ensureTable() {
  await db.run(sql`CREATE TABLE IF NOT EXISTS product_launches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    launch_type TEXT NOT NULL DEFAULT 'single',
    name TEXT NOT NULL,
    short_pitch TEXT,
    description TEXT,
    ingredients TEXT,
    category TEXT,
    price_pln REAL,
    target_audience TEXT,
    status TEXT NOT NULL DEFAULT 'idea',
    planned_launch_date TEXT,
    ai_suggested_date TEXT,
    ai_suggestion_notes TEXT,
    ai_suggestion_json TEXT,
    user_notes TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  // Idempotent column adds for already-created tables
  const cols = ['launch_type TEXT NOT NULL DEFAULT \'single\'', 'ai_suggestion_json TEXT', 'user_notes TEXT'];
  for (const col of cols) {
    try { await db.run(sql.raw(`ALTER TABLE product_launches ADD COLUMN ${col}`)); } catch {}
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureTable();
    const status = req.nextUrl.searchParams.get('status');
    let q = db.select().from(product_launches);
    if (status) q = q.where(eq(product_launches.status, status));
    const rows = await q;
    return NextResponse.json({ data: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }
    const inserted = await db
      .insert(product_launches)
      .values({
        launch_type: body.launch_type === 'product_line' ? 'product_line' : 'single',
        name: body.name,
        short_pitch: body.short_pitch || null,
        description: body.description || null,
        ingredients: body.ingredients || null,
        category: body.category || null,
        price_pln: body.price_pln ?? null,
        target_audience: body.target_audience || null,
        status: body.status || 'idea',
        planned_launch_date: body.planned_launch_date || null,
        ai_suggested_date: body.ai_suggested_date || null,
        ai_suggestion_notes: body.ai_suggestion_notes || null,
        ai_suggestion_json: body.ai_suggestion_json
          ? typeof body.ai_suggestion_json === 'string'
            ? body.ai_suggestion_json
            : JSON.stringify(body.ai_suggestion_json)
          : null,
        user_notes: body.user_notes || null,
        notes: body.notes || null,
        target_channels: body.target_channels ? (typeof body.target_channels === 'string' ? body.target_channels : JSON.stringify(body.target_channels)) : null,
        channel_rationale: body.channel_rationale || null,
      })
      .returning();
    return NextResponse.json({ data: inserted[0] }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
