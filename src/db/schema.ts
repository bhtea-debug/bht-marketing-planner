import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
} from 'drizzle-orm/sqlite-core';

// Channels table - represents marketing channels
export const channels = sqliteTable('channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(), // hex color code
  icon: text('icon'), // icon name or identifier
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Campaigns table - represents marketing campaigns
export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  channel_id: integer('channel_id')
    .notNull()
    .references(() => channels.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['draft', 'active', 'completed', 'paused'],
  })
    .notNull()
    .default('draft'),
  start_date: text('start_date'), // ISO 8601 format
  end_date: text('end_date'), // ISO 8601 format
  budget_planned: real('budget_planned').default(0),
  budget_spent: real('budget_spent').default(0),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Tasks table - represents individual tasks within campaigns
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaign_id: integer('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  channel_id: integer('channel_id')
    .notNull()
    .references(() => channels.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', {
    enum: ['todo', 'in_progress', 'done'],
  })
    .notNull()
    .default('todo'),
  priority: text('priority', {
    enum: ['low', 'medium', 'high'],
  })
    .notNull()
    .default('medium'),
  scheduled_date: text('scheduled_date'), // ISO 8601 format
  completed_at: text('completed_at'), // ISO 8601 format
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Budget entries table - tracks budget allocation by month and category
export const budget_entries = sqliteTable('budget_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaign_id: integer('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  channel_id: integer('channel_id')
    .notNull()
    .references(() => channels.id, { onDelete: 'cascade' }),
  month: text('month').notNull(), // YYYY-MM format
  planned_amount: real('planned_amount').default(0),
  actual_amount: real('actual_amount').default(0),
  category: text('category', {
    enum: ['content', 'ads', 'tools', 'influencers', 'other'],
  })
    .notNull()
    .default('other'),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// KPI entries table - tracks performance metrics
export const kpi_entries = sqliteTable('kpi_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channel_id: integer('channel_id')
    .notNull()
    .references(() => channels.id, { onDelete: 'cascade' }),
  campaign_id: integer('campaign_id').references(() => campaigns.id, {
    onDelete: 'cascade',
  }), // nullable - can track channel-wide metrics
  date: text('date').notNull(), // ISO 8601 format
  metric_name: text('metric_name', {
    enum: [
      'followers',
      'engagement_rate',
      'reach',
      'impressions',
      'clicks',
      'conversions',
      'open_rate',
      'ctr',
      'revenue',
    ],
  })
    .notNull(),
  metric_value: real('metric_value').notNull(),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Integrations table - stores OAuth tokens for connected platforms
export const integrations = sqliteTable('integrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  platform: text('platform', {
    enum: ['meta', 'google', 'getresponse', 'tiktok'],
  }).notNull(),
  access_token: text('access_token').notNull(),
  refresh_token: text('refresh_token'),
  token_expires_at: text('token_expires_at'),
  platform_user_id: text('platform_user_id'),
  platform_user_name: text('platform_user_name'),
  platform_data: text('platform_data'), // JSON: ad account IDs, page IDs, etc.
  status: text('status', {
    enum: ['active', 'expired', 'revoked'],
  }).notNull().default('active'),
  connected_at: text('connected_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Product launches table - upcoming new products that need their own
// launch campaign + space in the calendar. The AI planner reserves slots
// for these and the suggest-timing endpoint can recommend an optimal date.
export const product_launches = sqliteTable('product_launches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  launch_type: text('launch_type', { enum: ['single', 'product_line'] })
    .notNull()
    .default('single'),
  name: text('name').notNull(),
  short_pitch: text('short_pitch'),
  description: text('description'),
  ingredients: text('ingredients'),
  category: text('category'),
  price_pln: real('price_pln'),
  target_audience: text('target_audience'),
  status: text('status', {
    enum: ['idea', 'in_development', 'ready', 'launched', 'cancelled'],
  })
    .notNull()
    .default('idea'),
  planned_launch_date: text('planned_launch_date'),
  ai_suggested_date: text('ai_suggested_date'),
  ai_suggestion_notes: text('ai_suggestion_notes'),
  ai_suggestion_json: text('ai_suggestion_json'), // full saved suggestion
  user_notes: text('user_notes'), // user feedback for re-analysis
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type ProductLaunch = typeof product_launches.$inferSelect;
export type NewProductLaunch = typeof product_launches.$inferInsert;

// Type exports for TypeScript
export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type BudgetEntry = typeof budget_entries.$inferSelect;
export type NewBudgetEntry = typeof budget_entries.$inferInsert;

export type KpiEntry = typeof kpi_entries.$inferSelect;
export type NewKpiEntry = typeof kpi_entries.$inferInsert;

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
