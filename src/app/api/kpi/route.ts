// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { kpi_entries } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channel_id');
    const campaignId = searchParams.get('campaign_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const metricName = searchParams.get('metric_name');

    let query = db.select().from(kpi_entries);
    const filters: any[] = [];

    if (channelId) {
      filters.push(eq(kpi_entries.channel_id, parseInt(channelId)));
    }

    if (campaignId) {
      filters.push(eq(kpi_entries.campaign_id, parseInt(campaignId)));
    }

    if (dateFrom) {
      filters.push(gte(kpi_entries.date, dateFrom));
    }

    if (dateTo) {
      filters.push(lte(kpi_entries.date, dateTo));
    }

    if (metricName) {
      filters.push(eq(kpi_entries.metric_name, metricName));
    }

    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    const result = await query;
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching KPI entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel_id, campaign_id, metric_name, metric_value, date } = body;

    if (!channel_id || !metric_name || metric_value === undefined) {
      return NextResponse.json(
        { error: 'channel_id, metric_name, and metric_value are required' },
        { status: 400 }
      );
    }

    const newEntry = await db
      .insert(kpi_entries)
      .values({
        channel_id,
        campaign_id: campaign_id || null,
        metric_name,
        metric_value,
        date: date || new Date().toISOString().split('T')[0],
      })
      .returning();

    return NextResponse.json(newEntry[0], { status: 201 });
  } catch (error) {
    console.error('Error creating KPI entry:', error);
    return NextResponse.json(
      { error: 'Failed to create KPI entry' },
      { status: 500 }
    );
  }
}
