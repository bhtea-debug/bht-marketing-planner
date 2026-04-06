// @ts-nocheck

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const grIntegration = await db
      .select()
      .from(integrations)
      .where(eq(integrations.platform, 'getresponse'))
      .limit(1);

    if (grIntegration.length === 0) {
      return NextResponse.json(
        { error: 'GetResponse nie jest połączone' },
        { status: 401 }
      );
    }

    const apiKey = grIntegration[0].access_token;
    const headers = {
      'X-Auth-Token': `api-key ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const stats: Record<string, any> = {
      account: null,
      campaigns: [],
      newsletters: [],
      contacts: { total: 0 },
      statistics: null,
    };

    // 1. Account info
    try {
      const res = await fetch('https://api.getresponse.com/v3/accounts', { headers });
      if (res.ok) stats.account = await res.json();
    } catch (e) {
      console.error('GR account fetch error:', e);
    }

    // 2. Campaigns (= listy kontaktów w GetResponse)
    try {
      const res = await fetch('https://api.getresponse.com/v3/campaigns?perPage=100&sort[name]=asc', { headers });
      if (res.ok) {
        const campaigns = await res.json();
        stats.campaigns = campaigns.map((c: any) => ({
          id: c.campaignId,
          name: c.name,
          contacts: c.contactsCount || 0,
          createdAt: c.createdOn,
          isDefault: c.isDefault || false,
        }));
        stats.contacts.total = campaigns.reduce((sum: number, c: any) => sum + (c.contactsCount || 0), 0);
      }
    } catch (e) {
      console.error('GR campaigns fetch error:', e);
    }

    // 3. Newsletters (ostatnie wysyłki)
    try {
      const res = await fetch(
        'https://api.getresponse.com/v3/newsletters?perPage=10&sort[sendOn]=desc&query[status]=sent',
        { headers }
      );
      if (res.ok) {
        const newsletters = await res.json();
        // For each newsletter, try to get stats
        const enrichedNewsletters = [];
        for (const nl of newsletters.slice(0, 10)) {
          let nlStats = null;
          try {
            const statsRes = await fetch(
              `https://api.getresponse.com/v3/newsletters/${nl.newsletterId}/statistics`,
              { headers }
            );
            if (statsRes.ok) nlStats = await statsRes.json();
          } catch (e) {}

          enrichedNewsletters.push({
            id: nl.newsletterId,
            name: nl.subject || nl.name,
            status: nl.status,
            sentAt: nl.sendOn,
            campaign: nl.campaign?.name || '',
            stats: nlStats ? {
              totalSent: nlStats.sent || 0,
              totalOpened: nlStats.totalOpened || 0,
              uniqueOpened: nlStats.uniqueOpened || 0,
              totalClicked: nlStats.totalClicked || 0,
              uniqueClicked: nlStats.uniqueClicked || 0,
              unsubscribed: nlStats.unsubscribed || 0,
              bounced: nlStats.bounced || 0,
              openRate: nlStats.sent > 0 ? ((nlStats.uniqueOpened || 0) / nlStats.sent * 100).toFixed(1) : '0',
              clickRate: nlStats.sent > 0 ? ((nlStats.uniqueClicked || 0) / nlStats.sent * 100).toFixed(1) : '0',
            } : null,
          });
        }
        stats.newsletters = enrichedNewsletters;
      }
    } catch (e) {
      console.error('GR newsletters fetch error:', e);
    }

    // 4. Aggregate email statistics
    try {
      if (stats.newsletters.length > 0) {
        const withStats = stats.newsletters.filter((nl: any) => nl.stats);
        if (withStats.length > 0) {
          const avgOpenRate = withStats.reduce((sum: number, nl: any) => sum + parseFloat(nl.stats.openRate), 0) / withStats.length;
          const avgClickRate = withStats.reduce((sum: number, nl: any) => sum + parseFloat(nl.stats.clickRate), 0) / withStats.length;
          const totalSent = withStats.reduce((sum: number, nl: any) => sum + nl.stats.totalSent, 0);
          const totalOpened = withStats.reduce((sum: number, nl: any) => sum + nl.stats.uniqueOpened, 0);
          const totalClicked = withStats.reduce((sum: number, nl: any) => sum + nl.stats.uniqueClicked, 0);

          stats.statistics = {
            averageOpenRate: avgOpenRate.toFixed(1),
            averageClickRate: avgClickRate.toFixed(1),
            totalSent,
            totalOpened,
            totalClicked,
            campaignsAnalyzed: withStats.length,
          };
        }
      }
    } catch (e) {
      console.error('GR stats aggregation error:', e);
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch GetResponse stats:', error);
    return NextResponse.json(
      { error: 'Błąd pobierania statystyk GetResponse' },
      { status: 500 }
    );
  }
}
