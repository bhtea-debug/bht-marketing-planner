// @ts-nocheck

import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/db';
import { integrations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=${error}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=no_code`
      );
    }

    const MAILCHIMP_CLIENT_ID = process.env.MAILCHIMP_CLIENT_ID;
    const MAILCHIMP_CLIENT_SECRET = process.env.MAILCHIMP_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!MAILCHIMP_CLIENT_ID || !MAILCHIMP_CLIENT_SECRET || !appUrl) {
      return NextResponse.redirect(
        `${appUrl}/integrations?error=missing_config`
      );
    }

    const REDIRECT_URI = `${appUrl}/api/auth/mailchimp/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch(
      'https://login.mailchimp.com/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: MAILCHIMP_CLIENT_ID,
          client_secret: MAILCHIMP_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          code,
        }).toString(),
      }
    );

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(
        `${appUrl}/integrations?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('No access token in response');
      return NextResponse.redirect(
        `${appUrl}/integrations?error=no_access_token`
      );
    }

    // Fetch metadata to get datacenter and user info
    const metadataResponse = await fetch(
      'https://login.mailchimp.com/oauth2/metadata',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!metadataResponse.ok) {
      console.error('Metadata fetch failed:', await metadataResponse.text());
      return NextResponse.redirect(
        `${appUrl}/integrations?error=metadata_failed`
      );
    }

    const metadata = await metadataResponse.json();
    const dc = metadata.dc;
    const userId = metadata.user_id;
    const userName = metadata.login?.email || 'Mailchimp User';
    const apiEndpoint = `https://${dc}.api.mailchimp.com`;

    const platformData = JSON.stringify({
      dc,
      api_endpoint: apiEndpoint,
      user_id: userId,
      email: userName,
      fetchedAt: new Date().toISOString(),
    });

    // Mailchimp access tokens don't expire, but we'll set a far future date
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 10);

    // Check if Mailchimp integration already exists
    const existingIntegration = await db
      .select()
      .from(integrations)
      .where(eq(integrations.platform, 'mailchimp'))
      .limit(1);

    if (existingIntegration.length > 0) {
      // Update existing integration
      await db
        .update(integrations)
        .set({
          access_token: accessToken,
          platform_user_id: userId,
          platform_user_name: userName,
          platform_data: platformData,
          status: 'active',
          updated_at: new Date(),
          token_expires_at: expiresAt,
        })
        .where(eq(integrations.platform, 'mailchimp'));
    } else {
      // Insert new integration
      await db.insert(integrations).values({
        platform: 'mailchimp',
        access_token: accessToken,
        refresh_token: null,
        token_expires_at: expiresAt,
        platform_user_id: userId,
        platform_user_name: userName,
        platform_data: platformData,
        status: 'active',
        connected_at: new Date(),
        updated_at: new Date(),
      });
    }

    return NextResponse.redirect(
      `${appUrl}/integrations?connected=mailchimp`
    );
  } catch (error) {
    console.error('Mailchimp OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=callback_error`
    );
  }
}
