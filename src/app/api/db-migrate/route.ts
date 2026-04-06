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

    // Verify table exists
    const tables = await db.all(sql`SELECT name FROM sqlite_master WHERE type='table' AND name='integrations'`);
    
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
