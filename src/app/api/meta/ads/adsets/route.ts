// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getMetaToken, metaPost } from '@/lib/meta-api';

// POST /api/meta/ads/adsets
// body: { accountId, campaignId, name, dailyBudget, optimizationGoal, billingEvent, targeting, startTime, endTime, status }
export async function POST(req: NextRequest) {
  try {
    const auth = await getMetaToken();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const b = await req.json();
    if (!b.accountId || !b.campaignId || !b.name)
      return NextResponse.json({ error: 'accountId, campaignId, name required' }, { status: 400 });

    const payload: Record<string, any> = {
      name: b.name,
      campaign_id: b.campaignId,
      status: b.status || 'PAUSED',
      optimization_goal: b.optimizationGoal || 'LINK_CLICKS',
      billing_event: b.billingEvent || 'IMPRESSIONS',
      targeting: b.targeting || {
        geo_locations: { countries: ['PL'] },
        age_min: 18,
        age_max: 65,
      },
    };
    if (b.dailyBudget) payload.daily_budget = Math.round(Number(b.dailyBudget) * 100);
    if (b.lifetimeBudget) payload.lifetime_budget = Math.round(Number(b.lifetimeBudget) * 100);
    if (b.bidAmount) payload.bid_amount = Math.round(Number(b.bidAmount) * 100);
    if (b.startTime) payload.start_time = b.startTime;
    if (b.endTime) payload.end_time = b.endTime;

    const result = await metaPost(`${b.accountId}/adsets`, auth.token, payload);
    return NextResponse.json({ data: result });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
