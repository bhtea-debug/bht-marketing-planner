import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
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
