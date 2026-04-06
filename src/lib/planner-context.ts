// @ts-nocheck
// Silent planner context: pulls already-planned marketing campaigns and
// scheduled calendar tasks from the local DB so the AI can align paid Meta
// recommendations with what the team has already committed to do.
//
// This is read-only and never touches user-facing UI — it feeds the AI.

import { db } from '@/db';
import { campaigns, tasks, channels } from '@/db/schema';
import { gte, and, lte } from 'drizzle-orm';

export type PlannerContext = {
  upcomingCampaigns: {
    id: number;
    name: string;
    description: string | null;
    channel: string | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
    budgetPlanned: number;
  }[];
  upcomingTasks: {
    id: number;
    title: string;
    description: string | null;
    scheduledDate: string | null;
    campaignId: number | null;
    channel: string | null;
  }[];
  windowDays: number;
};

export async function buildPlannerContext(daysAhead = 60): Promise<PlannerContext> {
  const now = new Date();
  const horizon = new Date(Date.now() + daysAhead * 86400_000);
  const today = now.toISOString().slice(0, 10);
  const horizonIso = horizon.toISOString().slice(0, 10);

  const channelRows = await db.select().from(channels).catch(() => []);
  const channelMap: Record<number, string> = {};
  for (const c of channelRows as any[]) channelMap[c.id] = c.name;

  let upcomingCampaigns: any[] = [];
  try {
    upcomingCampaigns = await db
      .select()
      .from(campaigns)
      .where(and(gte(campaigns.start_date, today), lte(campaigns.start_date, horizonIso)));
  } catch {
    upcomingCampaigns = [];
  }

  let upcomingTasks: any[] = [];
  try {
    upcomingTasks = await db
      .select()
      .from(tasks)
      .where(and(gte(tasks.scheduled_date, today), lte(tasks.scheduled_date, horizonIso)));
  } catch {
    upcomingTasks = [];
  }

  return {
    windowDays: daysAhead,
    upcomingCampaigns: upcomingCampaigns.map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      channel: channelMap[c.channel_id] || null,
      status: c.status,
      startDate: c.start_date,
      endDate: c.end_date,
      budgetPlanned: Number(c.budget_planned || 0),
    })),
    upcomingTasks: upcomingTasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      scheduledDate: t.scheduled_date,
      campaignId: t.campaign_id,
      channel: channelMap[t.channel_id] || null,
    })),
  };
}
