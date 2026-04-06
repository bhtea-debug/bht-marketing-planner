// @ts-nocheck

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq } from 'drizzle-orm';

// POST - connect GetResponse with API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return NextResponse.json(
        { error: 'Podaj prawidłowy klucz API GetResponse' },
        { status: 400 }
      );
    }

    // Validate the API key by fetching account info
    const accountResponse = await fetch('https://api.getresponse.com/v3/accounts', {
      headers: {
        'X-Auth-Token': `api-key ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!accountResponse.ok) {
      const errText = await accountResponse.text();
      console.error('GetResponse API key validation failed:', errText);
      return NextResponse.json(
        { error: 'Nieprawidłowy klucz API. Sprawdź go w panelu GetResponse → Integracje → API.' },
        { status: 401 }
      );
    }

    const account = await accountResponse.json();
    const accountName = account.firstName
      ? `${account.firstName} ${account.lastName || ''}`.trim()
      : account.email || 'GetResponse User';
    const accountId = account.accountId || '';
    const accountEmail = account.email || '';

    // Fetch lists (campaigns in GR terminology) to store metadata
    let listsCount = 0;
    let totalContacts = 0;
    try {
      const listsResponse = await fetch('https://api.getresponse.com/v3/campaigns?perPage=100', {
        headers: {
          'X-Auth-Token': `api-key ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
      });
      if (listsResponse.ok) {
        const lists = await listsResponse.json();
        listsCount = lists.length;
        // Get total contacts from statistics
        const statsResponse = await fetch('https://api.getresponse.com/v3/accounts/billing', {
          headers: {
            'X-Auth-Token': `api-key ${apiKey.trim()}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (e) {
      console.error('Error fetching GR lists:', e);
    }

    const platformData = JSON.stringify({
      accountId,
      email: accountEmail,
      name: accountName,
      listsCount,
      fetchedAt: new Date().toISOString(),
    });

    // Check if GetResponse integration already exists
    const existing = await db
      .select()
      .from(integrations)
      .where(eq(integrations.platform, 'getresponse'))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(integrations)
        .set({
          access_token: apiKey.trim(),
          platform_user_id: accountId,
          platform_user_name: accountName,
          platform_data: platformData,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .where(eq(integrations.platform, 'getresponse'));
    } else {
      await db.insert(integrations).values({
        platform: 'getresponse',
        access_token: apiKey.trim(),
        refresh_token: null,
        token_expires_at: null,
        platform_user_id: accountId,
        platform_user_name: accountName,
        platform_data: platformData,
        status: 'active',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      accountName,
      accountEmail,
      listsCount,
    });
  } catch (error) {
    console.error('GetResponse connect error:', error);
    return NextResponse.json(
      { error: 'Błąd połączenia z GetResponse' },
      { status: 500 }
    );
  }
}
