// @ts-nocheck

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Fetch Mailchimp integration from DB
    const mailchimpIntegration = await db
      .select()
      .from(integrations)
      .where(eq(integrations.platform, 'mailchimp'))
      .limit(1);

    if (mailchimpIntegration.length === 0) {
      return NextResponse.json(
        { error: 'Mailchimp integration not connected' },
        { status: 401 }
      );
    }

    const integration = mailchimpIntegration[0];
    const accessToken = integration.access_token;

    let platformData: Record<string, any> = {};
    if (integration.platform_data) {
      try {
        platformData = JSON.parse(integration.platform_data);
      } catch (e) {
        console.error('Failed to parse platform data:', e);
      }
    }

    const dc = platformData.dc;
    const apiEndpoint = platformData.api_endpoint;

    if (!dc || !apiEndpoint) {
      return NextResponse.json(
        { error: 'Integration data incomplete' },
        { status: 400 }
      );
    }

    const stats: Record<string, any> = {
      campaigns: [],
      lists: [],
    };

    // Fetch campaigns
    try {
      const campaignsUrl = `${apiEndpoint}/3.0/campaigns?count=10&sort_field=send_time&sort_dir=DESC`;
      const campaignsResponse = await fetch(campaignsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        stats.campaigns = campaignsData.campaigns || [];
      } else {
        console.error('Campaigns fetch failed:', await campaignsResponse.text());
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    }

    // Fetch lists
    try {
      const listsUrl = `${apiEndpoint}/3.0/lists`;
      const listsResponse = await fetch(listsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (listsResponse.ok) {
        const listsData = await listsResponse.json();
        stats.lists = listsData.lists || [];
      } else {
        console.error('Lists fetch failed:', await listsResponse.text());
      }
    } catch (err) {
      console.error('Failed to fetch lists:', err);
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch Mailchimp stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
