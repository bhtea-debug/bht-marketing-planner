// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const channelId = searchParams.get('channel_id');
    const campaignId = searchParams.get('campaign_id');
    const status = searchParams.get('status');

    let query = db.select().from(tasks);
    const filters: any[] = [];

    if (date) {
      filters.push(gte(tasks.scheduled_date, date));
    }

    if (channelId) {
      filters.push(eq(tasks.channel_id, parseInt(channelId)));
    }

    if (campaignId) {
      filters.push(eq(tasks.campaign_id, parseInt(campaignId)));
    }

    if (status) {
      filters.push(eq(tasks.status, status));
    }

    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    const result = await query;
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      channel_id,
      campaign_id,
      scheduled_date,
      priority,
      status,
    } = body;

    if (!title || !channel_id || !campaign_id) {
      return NextResponse.json(
        { error: 'Title, channel_id, and campaign_id are required' },
        { status: 400 }
      );
    }

    const newTask = await db
      .insert(tasks)
      .values({
        title,
        description: description || null,
        channel_id,
        campaign_id,
        scheduled_date: scheduled_date || null,
        priority: priority || 'medium',
        status: status || 'todo',
      })
      .returning();

    return NextResponse.json(newTask[0], { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
