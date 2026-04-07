// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaigns, channels, tasks } from '@/db/schema';

// POST /api/planner/month-plan/save
// Body: { plan: <generated plan JSON>, month: 'YYYY-MM' }
// Converts each week into a draft Campaign in the planner DB and creates
// linked calendar Tasks for each linked_calendar_tasks entry.
export async function POST(req: NextRequest) {
  try {
    const { plan, month } = await req.json();
    if (!plan || !plan.weeks) {
      return NextResponse.json({ error: 'plan.weeks required' }, { status: 400 });
    }

    // Map channel name → id (create if missing)
    const existingChannels = (await db.select().from(channels)) as any[];
    const channelByName: Record<string, number> = {};
    for (const c of existingChannels) {
      channelByName[c.name.toLowerCase()] = c.id;
    }

    async function ensureChannel(name: string): Promise<number> {
      const key = name.toLowerCase();
      if (channelByName[key]) return channelByName[key];
      const inserted = await db
        .insert(channels)
        .values({
          name,
          color: '#8B4513',
          icon: 'megaphone',
        })
        .returning();
      const id = inserted[0]?.id;
      channelByName[key] = id;
      return id;
    }

    // ISO week → Monday of that week in the target year
    function isoWeekToMonday(year: number, week: number): Date {
      const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
      const dow = simple.getUTCDay() || 7;
      const monday = new Date(simple);
      if (dow <= 4) monday.setUTCDate(simple.getUTCDate() - dow + 1);
      else monday.setUTCDate(simple.getUTCDate() + 8 - dow);
      return monday;
    }

    const [yStr] = (month || '').split('-');
    const year = Number(yStr) || new Date().getUTCFullYear();

    const created: any[] = [];

    for (const w of plan.weeks) {
      const monday = isoWeekToMonday(year, w.isoWeek);
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);
      const startDate = monday.toISOString().slice(0, 10);
      const endDate = sunday.toISOString().slice(0, 10);

      // Create one campaign per channel block in the week
      for (const ch of w.channels || []) {
        const channelName = (ch.channel || 'meta_paid').replace(/_/g, ' ');
        const channelId = await ensureChannel(channelName);

        const campName = `${w.label || w.theme || `Tydz ${w.isoWeek}`} — ${ch.format || ch.channel}`;
        const desc = [
          `Motyw: ${w.theme || ''}`,
          `Hero: ${(w.hero_products || []).map((p: any) => p.name).join(', ')}`,
          `Promo: ${w.promo?.type || 'brak'} ${w.promo?.value || ''}`.trim(),
          `Hook: ${ch.creative_hook || ''}`,
          `CTA: ${ch.cta || ''}`,
          `Audience: ${ch.audience || ''}`,
          `Cel Meta: ${ch.objective || ''}`,
          `KPI: ${ch.expected_kpi || ''}`,
          `Rationale: ${w.rationale || ''}`,
        ]
          .filter(Boolean)
          .join('\n');

        const inserted = await db
          .insert(campaigns)
          .values({
            name: campName,
            description: desc,
            channel_id: channelId,
            status: 'draft',
            start_date: startDate,
            end_date: endDate,
            budget_planned: Number(ch.budget_pln || 0),
            budget_spent: 0,
          })
          .returning();

        const campaignId = inserted[0]?.id;
        created.push(inserted[0]);

        // Create linked calendar tasks for this week (only once per week — link to first campaign)
        if (campaignId && w.linked_calendar_tasks?.length) {
          for (const taskTitle of w.linked_calendar_tasks) {
            try {
              await db.insert(tasks).values({
                campaign_id: campaignId,
                channel_id: channelId,
                title: taskTitle,
                description: `Auto-generated z planu ${month}`,
                status: 'todo',
                priority: 'medium',
                scheduled_date: startDate,
              });
            } catch (e) {
              console.warn('[save] task insert failed', e);
            }
          }
        }
      }
    }

    return NextResponse.json({
      data: {
        createdCount: created.length,
        campaigns: created,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
