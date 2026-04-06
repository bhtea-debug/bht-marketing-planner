// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { budget_entries } from '@/db/schema';
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
    if (body.month !== undefined) updates.month = body.month;
    if (body.planned_amount !== undefined)
      updates.planned_amount = body.planned_amount;
    if (body.actual_amount !== undefined) updates.actual_amount = body.actual_amount;
    if (body.category !== undefined) updates.category = body.category;
    if (body.notes !== undefined) updates.notes = body.notes;

    const updated = await db
      .update(budget_entries)
      .set(updates)
      .where(eq(budget_entries.id, id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Budget entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating budget entry:', error);
    return NextResponse.json(
      { error: 'Failed to update budget entry' },
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
      .delete(budget_entries)
      .where(eq(budget_entries.id, id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Budget entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget entry' },
      { status: 500 }
    );
  }
}
