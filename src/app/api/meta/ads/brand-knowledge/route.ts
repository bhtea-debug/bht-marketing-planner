// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getMetaToken, metaGet, totalConversions, purchaseCount, purchaseValue } from '@/lib/meta-api';

// GET /api/meta/ads/brand-knowledge?accountId=act_123
// Builds a synthesized brand knowledge profile from ALL historical campaigns
// (active + paused + archived) so the AI has long-term context about the brand,
// audiences, products and what historically worked / failed.
export async function GET(req: NextRequest) {
  try {
    const auth = await getMetaToken();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const accountId = req.nextUrl.searchParams.get('accountId');
    if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

    // Pull EVERY campaign ever created on the account (no status filter)
    const campaignsRes = await metaGet(`${accountId}/campaigns`, auth.token, {
      fields:
        'id,name,status,effective_status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget',
      limit: 500,
    });
    const campaigns = campaignsRes.data || [];

    // Lifetime insights for every campaign
    const insightsRes = await metaGet(`${accountId}/insights`, auth.token, {
      level: 'campaign',
      fields:
        'campaign_id,campaign_name,spend,impressions,clicks,reach,frequency,ctr,cpc,cpm,actions,action_values',
      date_preset: 'maximum',
      limit: 500,
    });
    const insights = insightsRes.data || [];
    const insightMap: Record<string, any> = {};
    for (const i of insights) insightMap[i.campaign_id] = i;

    // Audience breakdowns lifetime (age + gender)
    let demographics: any[] = [];
    try {
      const demoRes = await metaGet(`${accountId}/insights`, auth.token, {
        level: 'account',
        fields: 'spend,impressions,clicks,actions,action_values',
        breakdowns: 'age,gender',
        date_preset: 'maximum',
        limit: 500,
      });
      demographics = demoRes.data || [];
    } catch {}

    // Placement breakdowns lifetime
    let placements: any[] = [];
    try {
      const plRes = await metaGet(`${accountId}/insights`, auth.token, {
        level: 'account',
        fields: 'spend,impressions,clicks,actions,action_values',
        breakdowns: 'publisher_platform,platform_position',
        date_preset: 'maximum',
        limit: 500,
      });
      placements = plRes.data || [];
    } catch {}

    // Country / region breakdown
    let regions: any[] = [];
    try {
      const regRes = await metaGet(`${accountId}/insights`, auth.token, {
        level: 'account',
        fields: 'spend,impressions,clicks,actions,action_values',
        breakdowns: 'country',
        date_preset: 'maximum',
        limit: 500,
      });
      regions = regRes.data || [];
    } catch {}

    // Only conversion-focused objectives have meaningful ROAS — used for
    // winner/loser detection. Awareness/traffic don't track purchases.
    const CONVERSION_OBJECTIVES = new Set([
      'OUTCOME_SALES',
      'OUTCOME_LEADS',
      'CONVERSIONS',
      'PRODUCT_CATALOG_SALES',
      'LEAD_GENERATION',
      'APP_INSTALLS',
    ]);

    // ----- Aggregate per-campaign metrics ------------------------------------
    const enriched = campaigns.map((c: any) => {
      const i = insightMap[c.id] || {};
      const spend = Number(i.spend || 0);
      const conv = totalConversions(i.actions);
      const revenue = purchaseValue(i.action_values, conv);
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective,
        createdTime: c.created_time,
        spend,
        impressions: Number(i.impressions || 0),
        clicks: Number(i.clicks || 0),
        ctr: Number(i.ctr || 0),
        cpc: Number(i.cpc || 0),
        conversions: conv,
        revenue,
        roas: spend > 0 ? revenue / spend : 0,
        isConversion: CONVERSION_OBJECTIVES.has(c.objective || ''),
      };
    });

    const totalSpend = enriched.reduce((s: number, c: any) => s + c.spend, 0);
    const totalRevenue = enriched.reduce((s: number, c: any) => s + c.revenue, 0);
    const totalConv = enriched.reduce((s: number, c: any) => s + c.conversions, 0);
    const totalImpr = enriched.reduce((s: number, c: any) => s + c.impressions, 0);
    const totalClicks = enriched.reduce((s: number, c: any) => s + c.clicks, 0);

    // Top winners and losers (by ROAS, requiring meaningful spend) — restricted
    // to conversion-objective campaigns where ROAS is actually meaningful.
    const meaningful = enriched.filter((c: any) => c.spend >= 50 && c.isConversion);
    const topWinners = [...meaningful].sort((a, b) => b.roas - a.roas).slice(0, 5);
    const topLosers = [...meaningful]
      .filter((c: any) => c.conversions === 0 || c.roas < 1)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    // Objective performance summary
    const byObjective: Record<string, any> = {};
    for (const c of enriched) {
      const k = c.objective || 'UNKNOWN';
      if (!byObjective[k]) byObjective[k] = { spend: 0, conv: 0, revenue: 0, count: 0 };
      byObjective[k].spend += c.spend;
      byObjective[k].conv += c.conversions;
      byObjective[k].revenue += c.revenue;
      byObjective[k].count += 1;
    }
    const objectivePerformance = Object.entries(byObjective).map(([k, v]: any) => ({
      objective: k,
      campaignCount: v.count,
      spend: Math.round(v.spend * 100) / 100,
      conversions: v.conv,
      revenue: Math.round(v.revenue * 100) / 100,
      roas: v.spend > 0 ? Math.round((v.revenue / v.spend) * 100) / 100 : 0,
    }));

    // Audience signals from demographics
    const demoAgg = demographics.map((d: any) => {
      const conv = totalConversions(d.actions);
      return {
        age: d.age,
        gender: d.gender,
        spend: Number(d.spend || 0),
        revenue: purchaseValue(d.action_values, conv),
        conversions: conv,
      };
    });
    demoAgg.sort((a, b) => b.revenue - a.revenue);
    const topAudiences = demoAgg.slice(0, 5);

    // Placements
    const placeAgg = placements.map((p: any) => {
      const conv = totalConversions(p.actions);
      const revenue = purchaseValue(p.action_values, conv);
      return {
        platform: p.publisher_platform,
        position: p.platform_position,
        spend: Number(p.spend || 0),
        revenue,
        roas: Number(p.spend) > 0 ? revenue / Number(p.spend) : 0,
      };
    });
    placeAgg.sort((a, b) => b.roas - a.roas);

    // Theme extraction from campaign names — naive keyword frequency
    const stop = new Set([
      'campaign',
      'kampania',
      'test',
      'new',
      'reklama',
      'ad',
      'ads',
      'fb',
      'ig',
      'meta',
      'and',
      'the',
      'for',
      'with',
      '&',
      '-',
      '|',
      '+',
    ]);
    const wordStats: Record<string, { count: number; spend: number; revenue: number }> = {};
    for (const c of enriched) {
      const tokens = (c.name || '')
        .toLowerCase()
        .split(/[\s_\-|/,()\[\]:]+/)
        .filter((w: string) => w && w.length > 2 && !stop.has(w) && !/^\d+$/.test(w));
      for (const t of tokens) {
        if (!wordStats[t]) wordStats[t] = { count: 0, spend: 0, revenue: 0 };
        wordStats[t].count += 1;
        wordStats[t].spend += c.spend;
        wordStats[t].revenue += c.revenue;
      }
    }
    const themes = Object.entries(wordStats)
      .map(([word, v]: any) => ({
        keyword: word,
        campaignCount: v.count,
        totalSpend: Math.round(v.spend * 100) / 100,
        totalRevenue: Math.round(v.revenue * 100) / 100,
        roas: v.spend > 0 ? Math.round((v.revenue / v.spend) * 100) / 100 : 0,
      }))
      .filter((t) => t.campaignCount >= 2)
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 25);

    // ----- Synthesized brand knowledge for the AI prompt context -------------
    const knowledge = {
      brand: 'Brown House & Tea',
      summary: {
        totalCampaigns: enriched.length,
        lifetimeSpend: Math.round(totalSpend * 100) / 100,
        lifetimeRevenue: Math.round(totalRevenue * 100) / 100,
        lifetimeConversions: totalConv,
        lifetimeImpressions: totalImpr,
        lifetimeClicks: totalClicks,
        lifetimeRoas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
        lifetimeCtr:
          totalImpr > 0 ? Math.round((totalClicks / totalImpr) * 10000) / 100 : 0,
      },
      bestPerformingObjectives: objectivePerformance
        .filter((o) => o.spend > 0)
        .sort((a, b) => b.roas - a.roas),
      topAudiences,
      topPlacements: placeAgg.slice(0, 5),
      regions,
      themes,
      topWinners,
      topLosers,
      // Free-form lessons synthesized from the data above (deterministic)
      lessons: buildLessons({
        objectivePerformance,
        topAudiences,
        themes,
        topWinners,
        topLosers,
        placeAgg,
      }),
    };

    return NextResponse.json({ data: knowledge });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function buildLessons(ctx: any): string[] {
  const lessons: string[] = [];
  const bestObj = [...ctx.objectivePerformance]
    .filter((o: any) => o.spend > 100)
    .sort((a: any, b: any) => b.roas - a.roas)[0];
  if (bestObj) {
    lessons.push(
      `Historycznie najlepiej konwertował cel "${bestObj.objective}" — ROAS ${bestObj.roas} przy wydatku ${bestObj.spend} zł na ${bestObj.campaignCount} kampaniach.`
    );
  }
  const worstObj = [...ctx.objectivePerformance]
    .filter((o: any) => o.spend > 100)
    .sort((a: any, b: any) => a.roas - b.roas)[0];
  if (worstObj && worstObj.roas < 1) {
    lessons.push(
      `Cel "${worstObj.objective}" nie zwracał się historycznie (ROAS ${worstObj.roas}) — unikać lub testować ostrożnie.`
    );
  }
  const topAud = ctx.topAudiences?.[0];
  if (topAud) {
    lessons.push(
      `Najwięcej przychodu generowała grupa ${topAud.gender || 'all'} ${topAud.age || ''} (${Math.round(
        topAud.revenue
      )} zł).`
    );
  }
  const winnerThemes = ctx.themes
    .filter((t: any) => t.roas >= 2 && t.totalSpend >= 100)
    .slice(0, 5)
    .map((t: any) => `"${t.keyword}" (ROAS ${t.roas})`);
  if (winnerThemes.length) {
    lessons.push(`Wygrywające motywy/produkty w nazwach kampanii: ${winnerThemes.join(', ')}.`);
  }
  const loserThemes = ctx.themes
    .filter((t: any) => t.roas < 1 && t.totalSpend >= 100)
    .slice(0, 5)
    .map((t: any) => `"${t.keyword}"`);
  if (loserThemes.length) {
    lessons.push(`Słabo radzące sobie motywy: ${loserThemes.join(', ')}.`);
  }
  const bestPlace = ctx.placeAgg?.find((p: any) => p.spend > 50);
  if (bestPlace) {
    lessons.push(
      `Najlepszy placement historycznie: ${bestPlace.platform} / ${bestPlace.position} (ROAS ${
        Math.round(bestPlace.roas * 100) / 100
      }).`
    );
  }
  if (ctx.topWinners?.length) {
    lessons.push(
      `Top historyczna kampania: "${ctx.topWinners[0].name}" — ROAS ${
        Math.round(ctx.topWinners[0].roas * 100) / 100
      }.`
    );
  }
  return lessons;
}
