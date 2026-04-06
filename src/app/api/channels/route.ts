// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { channels } from '@/db/schema';

export async function GET(request: NextRequest) {
  try {
    const result = await db.select().from(channels);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const newChannel = await db
      .insert(channels)
      .values({
        name,
        color: color || '#000000',
        icon: icon || null,
      })
      .returning();

    return NextResponse.json(newChannel[0], { status: 201 });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    );
  }
}
