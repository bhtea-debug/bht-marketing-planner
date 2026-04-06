// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import {
  getMetaToken,
  metaGet,
  metaPost,
  periodToDatePreset,
  sumActions,
  purchaseValue,
} from '@/lib/meta-api';

// GET /api/meta/ads/campaigns?accountId=act_123&period=30
export async function GET(req: NextRequest) {
  try {
    const auth = await getMetaToken();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const accountId = req.nextUrl.searchParams.get('accountId');
    const period = req.nextUrl.searchParams.get('period') || '30';
    if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

    const datePreset = periodToDatePreset(period);

    // Fetch campaigns
    const campaignsRes = await metaGet(`${accountId}/campaigns`, auth.token, {
      fields:
        'id,name,status,effective_status,objective,daily_budget,lifetime_budget,buying_type,start_time,stop_time,created_time,updated_time,special_ad_categories',
      limit: 100,
    });
    const campaigns = campaignsRes.data || [];

    // Fetch insights for all campaigns in one batch call
    const insightsRes = await metaGet(`${accountId}/insights`, auth.token, {
      level: 'campaign',
      fields:
        'campaign_id,campaign_name,spend,impressions,clicks,reach,frequency,cpc,cpm,ctr,actions,action_values,inline_link_clicks',
      date_preset: datePreset,
      limit: 200,
    });
    const insights = insightsRes.data || [];
    const insightMap: Record<string, any> = {};
    for (const i of insights) insightMap[i.campaign_id] = i;

    // Combine
    const enriched = campaigns.map((c: any) => {
      const i = insightMap[c.id] || {};
      const conversions = sumActions(i.actions, [
        'purchase',
        'omni_purchase',
        'offsite_conversion.fb_pixel_purchase',
        'lead',
        'complete_registration',
      ]);
      const revenue = purchaseValue(i.action_values);
      const spend = Number(i.spend || 0);
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        effectiveStatus: c.effective_status,
        objective: c.objective,
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        startTime: c.start_time,
        stopTime: c.stop_time,
        spend,
        impressions: Number(i.impressions || 0),
        clicks: Number(i.clicks || 0),
        reach: Number(i.reach || 0),
        frequency: Number(i.frequency || 0),
        cpc: Number(i.cpc || 0),
        cpm: Number(i.cpm || 0),
        ctr: Number(i.ctr || 0),
        conversions,
        revenue,
        roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
      };
    });

    // Sort by spend desc
    enriched.sort((a: any, b: any) => b.spend - a.spend);

    // Hide inactive/old campaigns by default; allow ?includeInactive=true to show them
    const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true';
    const visible = includeInactive
      ? enriched
      : enriched.filter((c: any) => c.status === 'ACTIVE' || c.effectiveStatus === 'ACTIVE');

    // Account-level totals (computed across visible campaigns)
    const totals = visible.reduce(
      (acc: any, c: any) => {
        acc.spend += c.spend;
        acc.impressions += c.impressions;
        acc.clicks += c.clicks;
        acc.conversions += c.conversions;
        acc.revenue += c.revenue;
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
    );
    totals.cpc = totals.clicks ? Math.round((totals.spend / totals.clicks) * 100) / 100 : 0;
    totals.ctr = totals.impressions
      ? Math.round((totals.clicks / totals.impressions) * 10000) / 100
      : 0;
    totals.roas = totals.spend ? Math.round((totals.revenue / totals.spend) * 100) / 100 : 0;

    return NextResponse.json({
      data: {
        campaigns: visible,
        totals,
        hiddenCount: enriched.length - visible.length,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/meta/ads/campaigns  body: {accountId, name, objective, status, dailyBudget, specialAdCategories}
export async function POST(req: NextRequest) {
  try {
    const auth = await getMetaToken();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { accountId, name, objective, status, dailyBudget, specialAdCategories } = body;
    if (!accountId || !name || !objective)
      return NextResponse.json({ error: 'accountId, name, objective required' }, { status: 400 });

    const payload: Record<string, any> = {
      name,
      objective,
      status: status || 'PAUSED',
      special_ad_categories: specialAdCategories || [],
    };
    if (dailyBudget) payload.daily_budget = Math.round(Number(dailyBudget) * 100);

    const result = await metaPost(`${accountId}/campaigns`, auth.token, payload);
    return NextResponse.json({ data: result });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
