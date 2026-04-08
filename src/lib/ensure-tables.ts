// @ts-nocheck
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function ensureAssetsAndPushLogs() {
  await db.run(sql`CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT,
    asset_type TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    alt_text TEXT,
    tags TEXT,
    meta_image_hash TEXT,
    meta_video_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.run(sql`CREATE TABLE IF NOT EXISTS brand_profile (
    id INTEGER PRIMARY KEY,
    brand_voice TEXT,
    visual_mood TEXT,
    color_palette TEXT,
    fonts TEXT,
    do_list TEXT,
    dont_list TEXT,
    composition_rules TEXT,
    reference_image_urls TEXT,
    inspiration_keywords TEXT,
    target_persona TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.run(sql`CREATE TABLE IF NOT EXISTS push_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    source_type TEXT,
    source_ref TEXT,
    payload TEXT,
    response TEXT,
    external_id TEXT,
    external_url TEXT,
    status TEXT NOT NULL,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
}

export async function ensurePlanDrafts() {
  await db.run(sql`CREATE TABLE IF NOT EXISTS month_plan_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,
    name TEXT,
    payload TEXT NOT NULL,
    weeks_count INTEGER DEFAULT 0,
    deployed_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_month_plan_drafts_month ON month_plan_drafts(month)`);
}
