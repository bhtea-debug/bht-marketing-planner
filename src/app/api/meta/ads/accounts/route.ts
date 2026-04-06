// @ts-nocheck
import { NextResponse } from 'next/server';
import { getMetaToken, metaGet } from '@/lib/meta-api';

export async function GET() {
  try {
    const auth = await getMetaToken();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const data = await metaGet('me/adaccounts', auth.token, {
      fields:
        'id,name,account_id,account_status,currency,timezone_name,amount_spent,balance,spend_cap,business_country_code',
      limit: 50,
    });

    return NextResponse.json({ data: data.data || [] });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
