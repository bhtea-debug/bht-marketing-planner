// @ts-nocheck

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Map UI period ('7'|'30'|'90') to {days, datePreset, prevDatePreset}
function periodToConfig(periodParam: string | null) {
  const days = periodParam === '7' ? 7 : periodParam === '90' ? 90 : 30;
  const datePreset = days === 7 ? 'last_7d' : days === 90 ? 'last_90d' : 'last_30d';
  // For previous-period comparison we use a custom time_range
  const now = new Date();
  const untilCurrent = Math.floor(now.getTime() / 1000);
  const sinceCurrent = untilCurrent - days * 86400;
  const untilPrev = sinceCurrent;
  const sincePrev = untilPrev - days * 86400;
  return { days, datePreset, sinceCurrent, untilCurrent, sincePrev, untilPrev };
}

function pct(curr: number, prev: number): number {
  if (!prev) return 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function sumDaily(metricEntry: any): number {
  if (!metricEntry || !Array.isArray(metricEntry.values)) return 0;
  return metricEntry.values.reduce((acc: number, v: any) => acc + (Number(v.value) || 0), 0);
}

function lastDaily(metricEntry: any): number {
  if (!metricEntry || !Array.isArray(metricEntry.values)) return 0;
  const v = metricEntry.values[metricEntry.values.length - 1];
  return Number(v?.value) || 0;
}

async function fetchPageInsights(
  pageId: string,
  pageToken: string,
  since: number,
  until: number
) {
  const metrics = 'page_impressions,page_impressions_unique,page_post_engagements';
  const url = `https://graph.facebook.com/v21.0/${pageId}/insights?metric=${metrics}&period=day&since=${since}&until=${until}&access_token=${pageToken}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const data = j.data || [];
    const find = (name: string) => data.find((m: any) => m.name === name);
    return {
      impressions: sumDaily(find('page_impressions')),
      reach: sumDaily(find('page_impressions_unique')),
      engagement: sumDaily(find('page_post_engagements')),
    };
  } catch {
    return null;
  }
}

async function fetchPageFans(pageId: string, pageToken: string) {
  try {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=fan_count,followers_count&access_token=${pageToken}`
    );
    if (!r.ok) return 0;
    const j = await r.json();
    return Number(j.fan_count || j.followers_count || 0);
  } catch {
    return 0;
  }
}

async function fetchIgInsights(
  igId: string,
  token: string,
  since: number,
  until: number
) {
  // IG account-level insights: reach + profile_views with period=day, follower_count is lifetime
  const url = `https://graph.facebook.com/v21.0/${igId}/insights?metric=reach,profile_views&period=day&since=${since}&until=${until}&access_token=${token}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const data = j.data || [];
    const find = (name: string) => data.find((m: any) => m.name === name);
    return {
      reach: sumDaily(find('reach')),
      profileVisits: sumDaily(find('profile_views')),
    };
  } catch {
    return null;
  }
}

async function fetchIgProfile(igId: string, token: string) {
  try {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/${igId}?fields=followers_count,media_count&access_token=${token}`
    );
    if (!r.ok) return { followers: 0 };
    const j = await r.json();
    return { followers: Number(j.followers_count || 0) };
  } catch {
    return { followers: 0 };
  }
}

async function fetchAdInsights(
  accountId: string,
  token: string,
  datePreset: string
) {
  // accountId from /me/adaccounts is already prefixed with 'act_'
  const url = `https://graph.facebook.com/v21.0/${accountId}/insights?fields=spend,impressions,clicks,cpc,ctr&date_preset=${datePreset}&access_token=${token}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    const row = (j.data && j.data[0]) || {};
    return {
      spend: Number(row.spend || 0),
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      cpc: Number(row.cpc || 0),
      ctr: Number(row.ctr || 0),
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const period = request.nextUrl.searchParams.get('period');
    const cfg = periodToConfig(period);

    const metaIntegration = await db
      .select()
      .from(integrations)
      .where(eq(integrations.platform, 'meta'))
      .limit(1);

    if (metaIntegration.length === 0) {
      return NextResponse.json(
        { error: 'Meta integration not connected' },
        { status: 401 }
      );
    }

    const integration = metaIntegration[0];

    if (
      integration.token_expires_at &&
      new Date(integration.token_expires_at) < new Date()
    ) {
      return NextResponse.json(
        { error: 'Integration token has expired' },
        { status: 401 }
      );
    }

    const userToken = integration.access_token;
    let platformData: Record<string, any> = {};
    if (integration.platform_data) {
      try {
        platformData = JSON.parse(integration.platform_data);
      } catch (e) {
        console.error('Failed to parse platform data:', e);
      }
    }

    const pages = platformData.pages || [];
    const instagramAccounts = platformData.instagramAccounts || {};

    // ---- Facebook aggregate ----
    let fbCurr = { impressions: 0, reach: 0, engagement: 0 };
    let fbPrev = { impressions: 0, reach: 0, engagement: 0 };
    let pageLikes = 0;

    for (const p of pages) {
      const pageToken = p.access_token || userToken;
      const [c, prev, fans] = await Promise.all([
        fetchPageInsights(p.id, pageToken, cfg.sinceCurrent, cfg.untilCurrent),
        fetchPageInsights(p.id, pageToken, cfg.sincePrev, cfg.untilPrev),
        fetchPageFans(p.id, pageToken),
      ]);
      if (c) {
        fbCurr.impressions += c.impressions;
        fbCurr.reach += c.reach;
        fbCurr.engagement += c.engagement;
      }
      if (prev) {
        fbPrev.impressions += prev.impressions;
        fbPrev.reach += prev.reach;
        fbPrev.engagement += prev.engagement;
      }
      pageLikes += fans;
    }

    const facebook = {
      pageLikes,
      pageLikesChange: 0,
      postReach: fbCurr.reach,
      postReachChange: pct(fbCurr.reach, fbPrev.reach),
      engagement: fbCurr.engagement,
      engagementChange: pct(fbCurr.engagement, fbPrev.engagement),
      impressions: fbCurr.impressions,
      impressionsChange: pct(fbCurr.impressions, fbPrev.impressions),
    };

    // ---- Instagram aggregate ----
    let igCurr = { reach: 0, profileVisits: 0 };
    let igPrev = { reach: 0, profileVisits: 0 };
    let igFollowers = 0;

    for (const [pageId, igAcc] of Object.entries<any>(instagramAccounts)) {
      if (!igAcc?.id) continue;
      // IG insights need a token tied to the parent page (page token works)
      const parentPage = pages.find((p: any) => p.id === pageId);
      const tok = parentPage?.access_token || userToken;
      const [c, prev, prof] = await Promise.all([
        fetchIgInsights(igAcc.id, tok, cfg.sinceCurrent, cfg.untilCurrent),
        fetchIgInsights(igAcc.id, tok, cfg.sincePrev, cfg.untilPrev),
        fetchIgProfile(igAcc.id, tok),
      ]);
      if (c) {
        igCurr.reach += c.reach;
        igCurr.profileVisits += c.profileVisits;
      }
      if (prev) {
        igPrev.reach += prev.reach;
        igPrev.profileVisits += prev.profileVisits;
      }
      igFollowers += prof.followers;
    }

    const instagram = {
      followers: igFollowers,
      followersChange: 0,
      reach: igCurr.reach,
      reachChange: pct(igCurr.reach, igPrev.reach),
      profileVisits: igCurr.profileVisits,
      profileVisitsChange: pct(igCurr.profileVisits, igPrev.profileVisits),
      impressions: igCurr.reach, // IG impressions metric is deprecated; use reach as proxy
      impressionsChange: pct(igCurr.reach, igPrev.reach),
      topPosts: [],
    };

    // ---- Ads aggregate ----
    let ads = {
      spend: 0,
      spendChange: 0,
      cpc: 0,
      cpcChange: 0,
      ctr: 0,
      ctrChange: 0,
      conversions: 0,
      conversionsChange: 0,
      roas: 0,
      roasChange: 0,
      budgetUsed: 0,
      budgetLimit: 0,
    };

    try {
      const adAccountsRes = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&access_token=${userToken}`
      );
      if (adAccountsRes.ok) {
        const adAccountsData = await adAccountsRes.json();
        const accounts = adAccountsData.data || [];
        let totalSpend = 0,
          totalImpressions = 0,
          totalClicks = 0;
        for (const acc of accounts) {
          const ins = await fetchAdInsights(acc.id, userToken, cfg.datePreset);
          if (ins) {
            totalSpend += ins.spend;
            totalImpressions += ins.impressions;
            totalClicks += ins.clicks;
          }
        }
        ads.spend = Math.round(totalSpend * 100) / 100;
        ads.budgetUsed = ads.spend;
        ads.cpc = totalClicks ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0;
        ads.ctr = totalImpressions
          ? Math.round((totalClicks / totalImpressions) * 10000) / 100
          : 0;
      }
    } catch (err) {
      console.error('Failed to fetch ad insights:', err);
    }

    return NextResponse.json({ data: { facebook, instagram, ads } });
  } catch (error) {
    console.error('Failed to fetch Meta insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
