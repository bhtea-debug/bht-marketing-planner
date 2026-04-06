// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getMetaToken, metaGet } from '@/lib/meta-api';

// GET /api/meta/ads/debug?accountId=act_xxx&campaignId=120238479654920252
// Returns raw insights including action_values + purchase_roas for one campaign
export async function GET(req: NextRequest) {
  const auth = await getMetaToken();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const accountId = req.nextUrl.searchParams.get('accountId');
  const campaignId = req.nextUrl.searchParams.get('campaignId');
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 });

  const params: Record<string, any> = {
    level: 'campaign',
    fields:
      'campaign_id,campaign_name,spend,impressions,clicks,actions,action_values,purchase_roas,website_purchase_roas,mobile_app_purchase_roas',
    date_preset: 'last_30d',
    limit: 200,
  };
  if (campaignId) params.filtering = JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: [campaignId] }]);
  const insights = await metaGet(`${accountId}/insights`, auth.token, params);
  const acc = await metaGet(accountId, auth.token, { fields: 'id,name,currency,timezone_name' });
  return NextResponse.json({ account: acc, insights });
}
