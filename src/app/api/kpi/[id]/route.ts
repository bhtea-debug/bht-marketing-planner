import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { kpi_entries } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();

    const updates: any = {};

    if (body.channel_id !== undefined) updates.channel_id = body.channel_id;
    if (body.campaign_id !== undefined) updates.campaign_id = body.campaign_id;
    if (body.metric_name !== undefined) updates.metric_name = body.metric_name;
    if (body.metric_value !== undefined) updates.metric_value = body.metric_value;
    if (body.date !== undefined) updates.date = body.date;

    const updated = await db
      .update(kpi_entries)
      .set(updates)
      .where(eq(kpi_entries.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'KPI entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating KPI entry:', error);
    return NextResponse.json(
      { error: 'Failed to update KPI entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const deleted = await db
      .delete(kpi_entries)
      .where(eq(kpi_entries.id, id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'KPI entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting KPI entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete KPI entry' },
      { status: 500 }
    );
  }
}
