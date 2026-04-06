// @ts-nocheck

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const metric = searchParams.get('metric') || 'reach,impressions';
    const period = searchParams.get('period') || 'last_7d';

    // Fetch Meta integration from DB
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

    // Check if token is expired
    if (
      integration.token_expires_at &&
      new Date(integration.token_expires_at) < new Date()
    ) {
      return NextResponse.json(
        { error: 'Integration token has expired' },
        { status: 401 }
      );
    }

    const accessToken = integration.access_token;
    let platformData: Record<string, any> = {};

    if (integration.platform_data) {
      try {
        platformData = JSON.parse(integration.platform_data);
      } catch (e) {
        console.error('Failed to parse platform data:', e);
      }
    }

    const insights: Record<string, any> = {
      pages: [],
      instagram: [],
      adAccounts: [],
    };

    // Fetch page insights
    const pages = platformData.pages || [];
    for (const page of pages) {
      try {
        const pageInsightsUrl = `https://graph.facebook.com/v21.0/${page.id}/insights?metric=${metric}&period=${period}&access_token=${accessToken}`;
        const pageInsightsResponse = await fetch(pageInsightsUrl);

        if (pageInsightsResponse.ok) {
          const pageInsightsData = await pageInsightsResponse.json();
          insights.pages.push({
            pageId: page.id,
            pageName: page.name,
            metrics: pageInsightsData.data || [],
          });
        }
      } catch (err) {
        console.error(`Failed to fetch insights for page ${page.id}:`, err);
      }
    }

    // Fetch Instagram insights
    const instagramAccounts = platformData.instagramAccounts || {};
    for (const [pageId, igAccount] of Object.entries(instagramAccounts)) {
      try {
        if (igAccount && igAccount.id) {
          const igInsightsUrl = `https://graph.facebook.com/v21.0/${igAccount.id}/insights?metric=impressions,profile_views,follower_count&period=${period}&access_token=${accessToken}`;
          const igInsightsResponse = await fetch(igInsightsUrl);

          if (igInsightsResponse.ok) {
            const igInsightsData = await igInsightsResponse.json();
            insights.instagram.push({
              accountId: igAccount.id,
              pageId,
              metrics: igInsightsData.data || [],
            });
          }
        }
      } catch (err) {
        console.error(`Failed to fetch Instagram insights for ${pageId}:`, err);
      }
    }

    // Try to fetch ad account insights if available
    try {
      const adAccountsUrl = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name&access_token=${accessToken}`;
      const adAccountsResponse = await fetch(adAccountsUrl);

      if (adAccountsResponse.ok) {
        const adAccountsData = await adAccountsResponse.json();
        const adAccounts = adAccountsData.data || [];

        for (const adAccount of adAccounts) {
          try {
            const adInsightsUrl = `https://graph.facebook.com/v21.0/act_${adAccount.id}/insights?fields=${metric}&date_preset=${period}&access_token=${accessToken}`;
            const adInsightsResponse = await fetch(adInsightsUrl);

            if (adInsightsResponse.ok) {
              const adInsightsData = await adInsightsResponse.json();
              insights.adAccounts.push({
                accountId: adAccount.id,
                accountName: adAccount.name,
                metrics: adInsightsData.data || [],
              });
            }
          } catch (err) {
            console.error(
              `Failed to fetch ad account insights for ${adAccount.id}:`,
              err
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch ad accounts:', err);
    }

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Failed to fetch Meta insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
