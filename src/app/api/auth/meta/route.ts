// @ts-nocheck

import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const META_APP_ID = process.env.META_APP_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!META_APP_ID || !appUrl) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    const REDIRECT_URI = `${appUrl}/api/auth/meta/callback`;
    const SCOPES = 'pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights,ads_read,ads_management,business_management';

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=code`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Meta OAuth redirect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
