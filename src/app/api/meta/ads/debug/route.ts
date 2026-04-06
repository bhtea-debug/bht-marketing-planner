// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getMetaToken, metaGet } from '@/lib/meta-api';

export async function GET(req: NextRequest) {
  const auth = await getMetaToken();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

  const insights = await metaGet(`${accountId}/insights`, auth.token, {
    level: 'campaign',
    fields:
      'campaign_id,campaign_name,spend,impressions,clicks,actions,action_values,purchase_roas,website_purchase_roas',
    date_preset: 'last_30d',
    limit: 200,
  });

  const summary = (insights.data || []).map((i: any) => {
    const purchases = (i.actions || []).find(
      (a: any) => a.action_type === 'omni_purchase' || a.action_type === 'purchase'
    );
    const purchaseValRaw = (i.action_values || []).find(
      (a: any) => a.action_type === 'omni_purchase' || a.action_type === 'purchase'
    );
    const roas = (i.purchase_roas || [])[0];
    const spend = Number(i.spend || 0);
    const purchaseCount = purchases ? Number(purchases.value) : 0;
    const rawRevenue = purchaseValRaw ? Number(purchaseValRaw.value) : 0;
    return {
      campaign: i.campaign_name,
      spend,
      purchases: purchaseCount,
      rawRevenue,
      rawAOV: purchaseCount ? +(rawRevenue / purchaseCount).toFixed(2) : 0,
      rawRoas: roas ? Number(roas.value) : 0,
      computedRoas: spend ? +(rawRevenue / spend).toFixed(2) : 0,
    };
  });

  return NextResponse.json({ summary });
}
