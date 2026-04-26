// @ts-nocheck
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { product_launches } from '@/db/schema';

// ISO week helpers (Monday-start)
function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return '';
  // Thursday in current week determines the year
  const thu = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  thu.setUTCDate(thu.getUTCDate() + 3 - ((thu.getUTCDay() + 6) % 7));
  const yearStart = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+thu - +yearStart) / 86400000 + 1) / 7);
  return `${thu.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z').getTime();
  const db = new Date(b + 'T00:00:00Z').getTime();
  return Math.abs(Math.round((da - db) / 86400000));
}

const MAX_PER_WEEK = 1;       // recommend at most 1 launch per ISO week
const PROXIMITY_DAYS = 10;    // warn if two launches are within 10 days

export async function GET() {
  try {
    const all = await db.select().from(product_launches);
    const dated = all
      .filter((l: any) => l.planned_launch_date && l.status !== 'cancelled')
      .map((l: any) => ({
        id: l.id,
        name: l.name,
        category: l.category || null,
        status: l.status,
        date: l.planned_launch_date as string,
        week: isoWeekKey(l.planned_launch_date as string),
      }))
      .filter((x) => x.week);

    // 1. Same-week clashes
    const weekBuckets: Record<string, typeof dated> = {};
    for (const x of dated) {
      (weekBuckets[x.week] ||= []).push(x);
    }
    const sameWeek = Object.entries(weekBuckets)
      .filter(([, arr]) => arr.length > MAX_PER_WEEK)
      .map(([week, arr]) => ({
        kind: 'same_week' as const,
        severity: 'warning' as const,
        week,
        count: arr.length,
        launch_ids: arr.map((a) => a.id),
        message: `${arr.length} launche w tym samym tygodniu (${week}): ${arr.map((a) => a.name).join(', ')}`,
      }));

    // 2. Proximity (< PROXIMITY_DAYS apart but different weeks)
    const proximity: any[] = [];
    const sorted = [...dated].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].week === sorted[j].week) continue;
        const dist = daysBetween(sorted[i].date, sorted[j].date);
        if (dist > PROXIMITY_DAYS) break;
        proximity.push({
          kind: 'proximity',
          severity: 'info',
          launch_ids: [sorted[i].id, sorted[j].id],
          days_apart: dist,
          message: `"${sorted[i].name}" i "${sorted[j].name}" oddalone o ${dist} dni — rozważ większy odstęp`,
        });
      }
    }

    // 3. Same-category clashes within 30 days
    const sameCategory: any[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (!sorted[i].category || sorted[i].category !== sorted[j].category) continue;
        const dist = daysBetween(sorted[i].date, sorted[j].date);
        if (dist > 30) break;
        sameCategory.push({
          kind: 'same_category',
          severity: 'warning',
          launch_ids: [sorted[i].id, sorted[j].id],
          category: sorted[i].category,
          days_apart: dist,
          message: `Dwa launche z kategorii "${sorted[i].category}" oddalone o ${dist} dni — ryzyko kanibalizacji`,
        });
      }
    }

    // 4. Missing date (informational)
    const undated = all
      .filter((l: any) => !l.planned_launch_date && !['cancelled', 'launched'].includes(l.status))
      .map((l: any) => ({ id: l.id, name: l.name, status: l.status }));

    const conflicts = [...sameWeek, ...sameCategory, ...proximity];
    return NextResponse.json({
      summary: {
        total: conflicts.length,
        warnings: conflicts.filter((c) => c.severity === 'warning').length,
        info: conflicts.filter((c) => c.severity === 'info').length,
        undated_count: undated.length,
      },
      conflicts,
      undated,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
