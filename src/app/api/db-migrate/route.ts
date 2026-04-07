// @ts-nocheck

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Create integrations table if not exists
    await db.run(sql`CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_expires_at TEXT,
      platform_user_id TEXT,
      platform_user_name TEXT,
      platform_data TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create product_launches table if not exists
    await db.run(sql`CREATE TABLE IF NOT EXISTS product_launches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    // Verify tables exist
    const tables = await db.all(sql`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('integrations','product_launches')`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed',
      tables: tables
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
