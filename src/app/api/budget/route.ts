// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { budget_entries } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const channelId = searchParams.get('channel_id');
    const campaignId = searchParams.get('campaign_id');
    const category = searchParams.get('category');

    let query = db.select().from(budget_entries);
    const filters: any[] = [];

    if (month) {
      filters.push(eq(budget_entries.month, month));
    }

    if (channelId) {
      filters.push(eq(budget_entries.channel_id, parseInt(channelId)));
    }

    if (campaignId) {
      filters.push(eq(budget_entries.campaign_id, parseInt(campaignId)));
    }

    if (category) {
      filters.push(eq(budget_entries.category, category));
    }

    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    const result = await query;
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching budget entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel_id, campaign_id, month, planned_amount, actual_amount, category, notes } =
      body;

    if (!channel_id || !campaign_id || !month) {
      return NextResponse.json(
        { error: 'channel_id, campaign_id, and month are required' },
        { status: 400 }
      );
    }

    const newEntry = await db
      .insert(budget_entries)
      .values({
        channel_id,
        campaign_id,
        month,
        planned_amount: planned_amount || 0,
        actual_amount: actual_amount || 0,
        category: category || 'other',
        notes: notes || null,
      })
      .returning();

    return NextResponse.json(newEntry[0], { status: 201 });
  } catch (error) {
    console.error('Error creating budget entry:', error);
    return NextResponse.json(
      { error: 'Failed to create budget entry' },
      { status: 500 }
    );
  }
}
