// @ts-nocheck

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq } from 'drizzle-orm';

function maskAccessToken(token: string | null): string {
  if (!token) return null;
  if (token.length <= 4) return '****';
  return '****' + token.slice(-4);
}

export async function GET(request: NextRequest) {
  try {
    const allIntegrations = await db.select().from(integrations);

    const maskedIntegrations = allIntegrations.map((integration) => ({
      ...integration,
      access_token: maskAccessToken(integration.access_token),
      refresh_token: maskAccessToken(integration.refresh_token),
    }));

    return NextResponse.json(maskedIntegrations);
  } catch (error) {
    console.error('Failed to fetch integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform');

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform parameter is required' },
        { status: 400 }
      );
    }

    const validPlatforms = ['meta', 'getresponse'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      );
    }

    await db.delete(integrations).where(eq(integrations.platform, platform));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete integration:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}
