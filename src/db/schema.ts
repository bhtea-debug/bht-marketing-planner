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

// Assets - creative assets (images, videos) tied to a product or generic.
// Stored as external URLs (Cloudinary, Woo media, etc.) - we don't host files.
export const assets = sqliteTable('assets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  product_name: text('product_name'), // matches woo product name; null = generic/brand
  asset_type: text('asset_type', { enum: ['image', 'video'] }).notNull(),
  url: text('url').notNull(),
  thumbnail_url: text('thumbnail_url'),
  alt_text: text('alt_text'),
  tags: text('tags'), // comma-separated: "matcha,morning,detox"
  meta_image_hash: text('meta_image_hash'),
  meta_video_id: text('meta_video_id'),
  notes: text('notes'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Push logs - audit trail of every push to external platform
export const push_logs = sqliteTable('push_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  platform: text('platform', { enum: ['meta', 'getresponse'] }).notNull(),
  source_type: text('source_type'),
  source_ref: text('source_ref'),
  payload: text('payload'),
  response: text('response'),
  external_id: text('external_id'),
  external_url: text('external_url'),
  status: text('status', { enum: ['success', 'partial', 'failed'] }).notNull(),
  error: text('error'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type PushLog = typeof push_logs.$inferSelect;

// Brand profile - single-row store for visual identity that AI uses to write briefs
// Singleton: id always = 1
export const brand_profile = sqliteTable('brand_profile', {
  id: integer('id').primaryKey(),
  brand_voice: text('brand_voice'),                  // tone of voice description
  visual_mood: text('visual_mood'),                  // free-text mood/aesthetic
  color_palette: text('color_palette'),              // JSON: [{name, hex}]
  fonts: text('fonts'),                              // free-text font descriptions
  do_list: text('do_list'),                          // bullet do's
  dont_list: text('dont_list'),                      // bullet dont's
  composition_rules: text('composition_rules'),      // framing, props, lighting
  reference_image_urls: text('reference_image_urls'),// JSON: [url]
  inspiration_keywords: text('inspiration_keywords'),// comma-separated
  target_persona: text('target_persona'),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type BrandProfile = typeof brand_profile.$inferSelect;

// Month-plan drafts — full wizard state persisted between sessions.
// Lets the user save a generated plan, come back, edit, and only deploy
// after acceptance. payload = JSON of the entire wizard plan + per-week
// selections + deployment status.
export const month_plan_drafts = sqliteTable('month_plan_drafts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  month: text('month').notNull(),                   // "YYYY-MM"
  name: text('name'),                                // optional human label
  payload: text('payload').notNull(),                // JSON blob of wizard state
  weeks_count: integer('weeks_count').default(0),
  deployed_count: integer('deployed_count').default(0),
  status: text('status', { enum: ['draft', 'partial', 'deployed'] })
    .notNull()
    .default('draft'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type MonthPlanDraft = typeof month_plan_drafts.$inferSelect;

// Persistent AI knowledge base — facts, rules, and preferences the AI learned
// from user interactions (refine prompts, brand profile answers, manual entries).
// Fed into every week-plan generation so the AI doesn't repeat mistakes.
export const planning_knowledge = sqliteTable('planning_knowledge', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category', {
    enum: ['product', 'policy', 'preference', 'lesson', 'audience', 'channel', 'visual'],
  }).notNull(),
  content: text('content').notNull(),            // The actual insight/rule
  source: text('source').notNull().default('manual'), // 'manual' | 'refine' | 'brand_profile' | 'auto'
  active: integer('active').notNull().default(1), // 1 = active, 0 = disabled
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type PlanningKnowledge = typeof planning_knowledge.$inferSelect;

// Portfolio launch reviews — saved AI analyses of the whole launch portfolio.
// Stores the full review JSON, user comments for re-analysis, and version history.
export const portfolio_reviews = sqliteTable('portfolio_reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  review_json: text('review_json').notNull(),         // Full AI review JSON
  user_comments: text('user_comments'),                // User feedback for next re-analysis
  launch_count: integer('launch_count').default(0),    // How many launches were analyzed
  version: integer('version').notNull().default(1),    // Increments on re-analysis
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type PortfolioReview = typeof portfolio_reviews.$inferSelect;

// B2B lead campaigns — AI-generated ad campaigns targeting HoReCa (cafes,
// restaurants, shops) for wholesale/B2B lead generation via Meta Lead Ads.
export const b2b_campaigns = sqliteTable('b2b_campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  segment: text('segment').notNull(),               // "kawiarnie", "restauracje", "sklepy", "hotele"
  status: text('status', {
    enum: ['draft', 'active', 'paused', 'completed'],
  }).notNull().default('draft'),
  objective: text('objective'),                       // user-defined goal
  ai_campaign_json: text('ai_campaign_json'),         // full AI output: copy, targeting, creative, form, budget, follow-up
  user_notes: text('user_notes'),                     // user feedback for re-generation
  monthly_budget_pln: real('monthly_budget_pln'),
  leads_count: integer('leads_count').default(0),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type B2bCampaign = typeof b2b_campaigns.$inferSelect;
export type NewB2bCampaign = typeof b2b_campaigns.$inferInsert;
