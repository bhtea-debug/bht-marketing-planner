// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import {
  getMetaToken,
  metaGet,
  metaPost,
  metaDelete,
  periodToDatePreset,
  totalConversions,
  purchaseValue,
} from '@/lib/meta-api';

// GET /api/meta/ads/campaign/[id]?period=30 — full detail with adsets, ads, daily insights
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getMetaToken();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = params;
    const period = req.nextUrl.searchParams.get('period') || '30';
    const datePreset = periodToDatePreset(period);

    const [campaign, adsetsRes, adsRes, dailyRes, breakdownAge, breakdownPlacement] =
      await Promise.all([
        metaGet(id, auth.token, {
          fields:
            'id,name,status,effective_status,objective,daily_budget,lifetime_budget,buying_type,start_time,stop_time,created_time,special_ad_categories',
        }),
        metaGet(`${id}/adsets`, auth.token, {
          fields:
            'id,name,status,effective_status,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,targeting,start_time,end_time',
          limit: 50,
        }),
        metaGet(`${id}/ads`, auth.token, {
          fields: 'id,name,status,effective_status,creative,adset_id',
          limit: 100,
        }),
        metaGet(`${id}/insights`, auth.token, {
          fields:
            'spend,impressions,clicks,reach,frequency,cpc,cpm,ctr,actions,action_values',
          time_increment: 1,
          date_preset: datePreset,
          limit: 200,
        }),
        metaGet(`${id}/insights`, auth.token, {
          fields: 'spend,impressions,clicks,actions',
          breakdowns: 'age,gender',
          date_preset: datePreset,
          limit: 200,
        }).catch(() => ({ data: [] })),
        metaGet(`${id}/insights`, auth.token, {
          fields: 'spend,impressions,clicks,actions',
          breakdowns: 'publisher_platform,platform_position',
          date_preset: datePreset,
          limit: 200,
        }).catch(() => ({ data: [] })),
      ]);

    const daily = (dailyRes.data || []).map((d: any) => ({
      date: d.date_start,
      spend: Number(d.spend || 0),
      impressions: Number(d.impressions || 0),
      clicks: Number(d.clicks || 0),
      conversions: totalConversions(d.actions),
    }));

    const adsets = (adsetsRes.data || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      effectiveStatus: a.effective_status,
      dailyBudget: a.daily_budget ? Number(a.daily_budget) / 100 : null,
      lifetimeBudget: a.lifetime_budget ? Number(a.lifetime_budget) / 100 : null,
      optimizationGoal: a.optimization_goal,
      billingEvent: a.billing_event,
      targeting: a.targeting,
    }));

    const ads = (adsRes.data || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      effectiveStatus: a.effective_status,
      adsetId: a.adset_id,
      creativeId: a.creative?.id,
    }));

    return NextResponse.json({
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          effectiveStatus: campaign.effective_status,
          objective: campaign.objective,
          dailyBudget: campaign.daily_budget ? Number(campaign.daily_budget) / 100 : null,
          lifetimeBudget: campaign.lifetime_budget ? Number(campaign.lifetime_budget) / 100 : null,
          startTime: campaign.start_time,
          stopTime: campaign.stop_time,
        },
        adsets,
        ads,
        daily,
        breakdowns: {
          age: breakdownAge.data || [],
          placement: breakdownPlacement.data || [],
        },
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — update campaign (status, name, budget)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getMetaToken();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const body = await req.json();
    const payload: Record<string, any> = {};
    if (body.status) payload.status = body.status;
    if (body.name) payload.name = body.name;
    if (body.dailyBudget !== undefined && body.dailyBudget !== null)
      payload.daily_budget = Math.round(Number(body.dailyBudget) * 100);
    if (body.lifetimeBudget !== undefined && body.lifetimeBudget !== null)
      payload.lifetime_budget = Math.round(Number(body.lifetimeBudget) * 100);

    const result = await metaPost(params.id, auth.token, payload);
    return NextResponse.json({ data: result });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getMetaToken();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const result = await metaDelete(params.id, auth.token);
    return NextResponse.json({ data: result });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
