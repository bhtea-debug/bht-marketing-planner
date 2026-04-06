// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import {
  getMetaToken,
  metaGet,
  periodToDatePreset,
  totalConversions,
  purchaseValue,
} from '@/lib/meta-api';

type Rec = {
  severity: 'critical' | 'warning' | 'info' | 'success';
  campaignId?: string;
  campaignName?: string;
  title: string;
  description: string;
  action?: string;
};

// GET /api/meta/ads/recommendations?accountId=act_123&period=30
export async function GET(req: NextRequest) {
  try {
    const auth = await getMetaToken();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const accountId = req.nextUrl.searchParams.get('accountId');
    const period = req.nextUrl.searchParams.get('period') || '30';
    if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

    const datePreset = periodToDatePreset(period);

    // Fetch current-period campaigns/insights AND lifetime ("learning") insights in parallel
    const [campaignsRes, insightsRes, lifetimeRes, lifetimeCampaignsRes] = await Promise.all([
      metaGet(`${accountId}/campaigns`, auth.token, {
        fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget',
        limit: 100,
      }),
      metaGet(`${accountId}/insights`, auth.token, {
        level: 'campaign',
        fields:
          'campaign_id,spend,impressions,clicks,reach,frequency,cpc,cpm,ctr,actions,action_values',
        date_preset: datePreset,
        limit: 200,
      }),
      metaGet(`${accountId}/insights`, auth.token, {
        level: 'campaign',
        fields:
          'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,actions,action_values',
        date_preset: 'maximum',
        limit: 500,
      }).catch(() => ({ data: [] })),
      metaGet(`${accountId}/campaigns`, auth.token, {
        fields: 'id,name,status,effective_status,objective',
        limit: 500,
      }).catch(() => ({ data: [] })),
    ]);

    const campaigns = campaignsRes.data || [];
    const insights = insightsRes.data || [];
    const insightMap: Record<string, any> = {};
    for (const i of insights) insightMap[i.campaign_id] = i;

    // Compute account-level averages for relative comparisons
    const totals = insights.reduce(
      (acc: any, i: any) => {
        acc.spend += Number(i.spend || 0);
        acc.clicks += Number(i.clicks || 0);
        acc.impressions += Number(i.impressions || 0);
        return acc;
      },
      { spend: 0, clicks: 0, impressions: 0 }
    );
    const avgCPC = totals.clicks ? totals.spend / totals.clicks : 0;
    const avgCTR = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0;

    const recs: Rec[] = [];

    for (const c of campaigns) {
      const i = insightMap[c.id] || {};
      const spend = Number(i.spend || 0);
      const clicks = Number(i.clicks || 0);
      const impressions = Number(i.impressions || 0);
      const cpc = Number(i.cpc || 0);
      const ctr = Number(i.ctr || 0);
      const frequency = Number(i.frequency || 0);
      const conversions = totalConversions(i.actions);
      const revenue = purchaseValue(i.action_values, conversions);
      const roas = spend > 0 ? revenue / spend : 0;

      // Rule 1: Active campaign with spend but zero conversions
      if (c.effective_status === 'ACTIVE' && spend > 50 && conversions === 0) {
        recs.push({
          severity: 'critical',
          campaignId: c.id,
          campaignName: c.name,
          title: 'Wydatek bez konwersji',
          description: `Kampania wydała ${spend.toFixed(2)} zł w wybranym okresie i nie zarejestrowała żadnej konwersji. Sprawdź konfigurację piksela, audience albo zaplanuj nowy creative test.`,
          action: 'pause_or_review',
        });
      }

      // Rule 2: CTR much below account average
      if (impressions > 1000 && avgCTR > 0 && ctr < avgCTR * 0.5) {
        recs.push({
          severity: 'warning',
          campaignId: c.id,
          campaignName: c.name,
          title: 'CTR znacznie poniżej średniej',
          description: `CTR wynosi ${ctr.toFixed(2)}% przy średniej konta ${avgCTR.toFixed(2)}%. Rozważ odświeżenie kreacji lub zmianę nagłówka.`,
          action: 'refresh_creative',
        });
      }

      // Rule 3: CPC much above average
      if (clicks > 50 && avgCPC > 0 && cpc > avgCPC * 1.5) {
        recs.push({
          severity: 'warning',
          campaignId: c.id,
          campaignName: c.name,
          title: 'CPC powyżej średniej',
          description: `CPC ${cpc.toFixed(2)} zł vs średnia ${avgCPC.toFixed(2)} zł. Zawęź targetowanie albo zmień optymalizację.`,
          action: 'narrow_targeting',
        });
      }

      // Rule 4: Frequency too high (ad fatigue)
      if (frequency > 4) {
        recs.push({
          severity: 'warning',
          campaignId: c.id,
          campaignName: c.name,
          title: 'Wysoka frekwencja — zmęczenie odbiorców',
          description: `Frekwencja ${frequency.toFixed(1)}. Audience widzi te same reklamy zbyt często — rozszerz grupę lub dodaj nowe kreacje.`,
          action: 'expand_audience',
        });
      }

      // Rule 5: Strong ROAS — scale
      if (roas > 3 && spend > 100) {
        recs.push({
          severity: 'success',
          campaignId: c.id,
          campaignName: c.name,
          title: 'Świetny ROAS — rozważ skalowanie',
          description: `ROAS ${roas.toFixed(2)}x przy wydatku ${spend.toFixed(2)} zł. Bezpieczne skalowanie: zwiększ budżet o 20% i obserwuj 3 dni.`,
          action: 'scale_up',
        });
      }

      // Rule 6: Paused but has good historical data
      if (c.effective_status === 'PAUSED' && spend > 0 && roas > 2) {
        recs.push({
          severity: 'info',
          campaignId: c.id,
          campaignName: c.name,
          title: 'Wstrzymana kampania z dobrym ROAS',
          description: `Ta wstrzymana kampania miała ROAS ${roas.toFixed(2)}x. Rozważ wznowienie z odświeżonym targetowaniem.`,
          action: 'consider_resume',
        });
      }
    }

    // Account-level recs
    if (avgCTR > 0 && avgCTR < 0.8) {
      recs.unshift({
        severity: 'warning',
        title: 'Niski CTR na poziomie konta',
        description: `Średni CTR konta to ${avgCTR.toFixed(2)}%. Branżowa średnia dla e-commerce to 1.0–1.5%. Czas na audyt kreacji.`,
      });
    }

    // ----- Historical learning from ALL past campaigns ---------------------
    const lifetime = lifetimeRes.data || [];
    const lifetimeCampaigns = lifetimeCampaignsRes.data || [];
    const ltCampMap: Record<string, any> = {};
    for (const c of lifetimeCampaigns) ltCampMap[c.id] = c;

    // Only conversion-focused objectives have meaningful ROAS.
    // Awareness/traffic/engagement campaigns don't track purchases by design,
    // so excluding them prevents nonsense "ROAS 0.00" labelling.
    const CONVERSION_OBJECTIVES = new Set([
      'OUTCOME_SALES',
      'OUTCOME_LEADS',
      'CONVERSIONS',
      'PRODUCT_CATALOG_SALES',
      'LEAD_GENERATION',
      'APP_INSTALLS',
    ]);

    const ltEnriched = lifetime
      .map((i: any) => {
        const c = ltCampMap[i.campaign_id] || {};
        const sp = Number(i.spend || 0);
        const conv = totalConversions(i.actions);
        const rev = purchaseValue(i.action_values, conv);
        return {
          id: i.campaign_id,
          name: i.campaign_name || c.name,
          objective: c.objective,
          spend: sp,
          ctr: Number(i.ctr || 0),
          cpc: Number(i.cpc || 0),
          conv,
          revenue: rev,
          roas: sp > 0 ? rev / sp : 0,
          isConversion: CONVERSION_OBJECTIVES.has(c.objective || ''),
        };
      });

    // Subset used for any ROAS-based reasoning (winners, losers, best objective)
    const ltConversion = ltEnriched.filter((c: any) => c.isConversion);

    // Best historical objective — computed silently for learningContext only
    // (NOT pushed into visible recommendations to avoid constant noise).
    const objStats: Record<string, { spend: number; rev: number; n: number }> = {};
    for (const c of ltConversion) {
      const k = c.objective || 'UNKNOWN';
      if (!objStats[k]) objStats[k] = { spend: 0, rev: 0, n: 0 };
      objStats[k].spend += c.spend;
      objStats[k].rev += c.revenue;
      objStats[k].n += 1;
    }
    const bestObjEntry = Object.entries(objStats)
      .filter(([, v]: any) => v.spend > 100)
      .map(([k, v]: any) => ({ obj: k, roas: v.rev / v.spend, spend: v.spend, n: v.n }))
      .sort((a, b) => b.roas - a.roas)[0];

    // Best historical campaign — silent (used as context for new-campaign AI)
    const topLifetime = [...ltConversion]
      .filter((c) => c.spend >= 100)
      .sort((a, b) => b.roas - a.roas)[0];

    // Historical losers — silent
    const ltLosers = ltConversion
      .filter((c) => c.spend > 200 && c.roas < 1)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 3);

    // Sort by severity
    const order = { critical: 0, warning: 1, info: 2, success: 3 };
    recs.sort((a, b) => order[a.severity] - order[b.severity]);

    return NextResponse.json({
      data: {
        recommendations: recs,
        accountAverages: { cpc: avgCPC, ctr: avgCTR, totalSpend: totals.spend },
        learningContext: {
          lifetimeCampaignsAnalyzed: ltEnriched.length,
          conversionCampaignsAnalyzed: ltConversion.length,
          bestObjective: bestObjEntry?.obj || null,
          bestObjectiveRoas: bestObjEntry?.roas || 0,
          topLifetimeCampaign: topLifetime?.name || null,
          topLifetimeRoas: topLifetime?.roas || 0,
          historicalLosers: ltLosers.map((c: any) => ({
            name: c.name,
            spend: c.spend,
            roas: c.roas,
          })),
        },
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
