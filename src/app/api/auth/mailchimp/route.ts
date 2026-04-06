// @ts-nocheck

import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const MAILCHIMP_CLIENT_ID = process.env.MAILCHIMP_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!MAILCHIMP_CLIENT_ID || !appUrl) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    const REDIRECT_URI = `${appUrl}/api/auth/mailchimp/callback`;

    const authUrl = `https://login.mailchimp.com/oauth2/authorize?response_type=code&client_id=${MAILCHIMP_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Mailchimp OAuth redirect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
