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

    // Filter: keep only "Brown House & Tea" PLN account
    const all = data.data || [];
    const filtered = all.filter((a: any) => {
      const name = (a.name || '').toLowerCase();
      const isBHT = name.includes('brown house') && name.includes('tea');
      const isPLN = (a.currency || '').toUpperCase() === 'PLN';
      return isBHT && isPLN;
    });
    return NextResponse.json({ data: filtered.length ? filtered : all.filter((a: any) => (a.currency || '').toUpperCase() === 'PLN') });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
