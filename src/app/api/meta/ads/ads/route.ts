// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getMetaToken, metaPost } from '@/lib/meta-api';

// POST /api/meta/ads/ads
// body: { accountId, adsetId, name, pageId, message, link, imageUrl, callToActionType, status }
// Creates a creative + ad in one call
export async function POST(req: NextRequest) {
  try {
    const auth = await getMetaToken();
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const b = await req.json();
    if (!b.accountId || !b.adsetId || !b.name || !b.pageId || !b.message || !b.link)
      return NextResponse.json(
        { error: 'accountId, adsetId, name, pageId, message, link required' },
        { status: 400 }
      );

    // Step 1: create creative
    const objectStorySpec: Record<string, any> = {
      page_id: b.pageId,
      link_data: {
        message: b.message,
        link: b.link,
        ...(b.imageUrl ? { picture: b.imageUrl } : {}),
        ...(b.callToActionType
          ? {
              call_to_action: {
                type: b.callToActionType,
                value: { link: b.link },
              },
            }
          : {}),
      },
    };
    const creative = await metaPost(`${b.accountId}/adcreatives`, auth.token, {
      name: `${b.name} – creative`,
      object_story_spec: objectStorySpec,
    });

    // Step 2: create ad
    const ad = await metaPost(`${b.accountId}/ads`, auth.token, {
      name: b.name,
      adset_id: b.adsetId,
      creative: { creative_id: creative.id },
      status: b.status || 'PAUSED',
    });

    return NextResponse.json({ data: { creativeId: creative.id, adId: ad.id } });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
