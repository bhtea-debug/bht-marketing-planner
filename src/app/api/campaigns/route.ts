// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const channelId = searchParams.get('channel_id');

    let query = db.select().from(campaigns);
    const filters: any[] = [];

    if (status) {
      filters.push(eq(campaigns.status, status));
    }

    if (channelId) {
      filters.push(eq(campaigns.channel_id, parseInt(channelId)));
    }

    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    const result = await query;
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      channel_id,
      status,
      start_date,
      end_date,
      budget_planned,
      budget_spent,
    } = body;

    if (!name || !channel_id) {
      return NextResponse.json(
        { error: 'Name and channel_id are required' },
        { status: 400 }
      );
    }

    const newCampaign = await db
      .insert(campaigns)
      .values({
        name,
        description: description || null,
        channel_id,
        status: status || 'draft',
        start_date: start_date || null,
        end_date: end_date || null,
        budget_planned: budget_planned || 0,
        budget_spent: budget_spent || 0,
      })
      .returning();

    return NextResponse.json(newCampaign[0], { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
