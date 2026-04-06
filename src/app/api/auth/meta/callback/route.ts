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

    const META_APP_ID = process.env.META_APP_ID;
    const META_APP_SECRET = process.env.META_APP_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!META_APP_ID || !META_APP_SECRET || !appUrl) {
      return NextResponse.redirect(
        `${appUrl}/integrations?error=missing_config`
      );
    }

    const REDIRECT_URI = `${appUrl}/api/auth/meta/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch(
      'https://graph.facebook.com/v21.0/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: META_APP_ID,
          client_secret: META_APP_SECRET,
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
    let accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('No access token in response');
      return NextResponse.redirect(
        `${appUrl}/integrations?error=no_access_token`
      );
    }

    // Exchange short-lived token for long-lived token
    const longLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${accessToken}`
    );

    if (longLivedTokenResponse.ok) {
      const longLivedData = await longLivedTokenResponse.json();
      if (longLivedData.access_token) {
        accessToken = longLivedData.access_token;
      }
    }

    // Fetch user info
    const userResponse = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${accessToken}`
    );

    if (!userResponse.ok) {
      console.error('User info fetch failed:', await userResponse.text());
      return NextResponse.redirect(
        `${appUrl}/integrations?error=user_info_failed`
      );
    }

    const userData = await userResponse.json();
    const userId = userData.id;
    const userName = userData.name;

    // Fetch pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
    );

    let pages = [];
    let instagramAccounts: Record<string, any> = {};

    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();
      pages = pagesData.data || [];

      // Fetch Instagram accounts for each page
      for (const page of pages) {
        try {
          const igResponse = await fetch(
            `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
          );

          if (igResponse.ok) {
            const igData = await igResponse.json();
            if (igData.instagram_business_account) {
              instagramAccounts[page.id] = igData.instagram_business_account;
            }
          }
        } catch (err) {
          console.error(`Failed to fetch Instagram account for page ${page.id}:`, err);
        }
      }
    }

    const platformData = JSON.stringify({
      userId,
      userName,
      pages,
      instagramAccounts,
      fetchedAt: new Date().toISOString(),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 60); // 60 days for long-lived tokens

    // Check if Meta integration already exists
    const existingIntegration = await db
      .select()
      .from(integrations)
      .where(eq(integrations.platform, 'meta'))
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
        .where(eq(integrations.platform, 'meta'));
    } else {
      // Insert new integration
      await db.insert(integrations).values({
        platform: 'meta',
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

    return NextResponse.redirect(`${appUrl}/integrations?connected=meta`);
  } catch (error) {
    console.error('Meta OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=callback_error`
    );
  }
}
