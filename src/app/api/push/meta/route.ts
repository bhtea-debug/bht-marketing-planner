// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { assets, push_logs } from '@/db/schema';
import { sql, like, or } from 'drizzle-orm';
import { getMetaToken, metaPost, metaGet } from '@/lib/meta-api';
import { ensureAssetsAndPushLogs } from '@/lib/ensure-tables';

// POST /api/push/meta
// Body:
// {
//   tile: {
//     headline: string,           // ad headline / primary text
//     body?: string,              // longer body (optional)
//     cta?: "SHOP_NOW"|"LEARN_MORE"|"SIGN_UP"|...
//     link_url: string,           // landing page
//     audience_hint?: string,     // raw text from AI plan ("Retargeting 30d")
//     budget_pln: number,         // weekly budget in PLN
//     creative_format: "single_image"|"carousel"|"video",
//     hero_products: string[],    // product names from week tile
//     campaign_name: string,
//     adset_name: string,
//     ad_name: string,
//     start_date?: string,        // YYYY-MM-DD
//     end_date?: string,
//   },
//   ad_account_id?: string,       // act_xxx; default: first ad account in platformData
//   page_id?: string,             // facebook page id; default: first in platformData
//   status?: "PAUSED"|"ACTIVE",   // default PAUSED for safety
//   source_ref?: string,          // for audit log
// }
//
// Side effects:
// - creates Campaign + AdSet + AdCreative + Ad on Meta
// - logs result to push_logs
//
// Returns: { campaign_id, adset_id, creative_id, ad_id, manage_url, log_id }
export async function POST(req: NextRequest) {
  let logRow: any = null;
  let payload: any = null;
  try {
    await ensureAssetsAndPushLogs();
    payload = await req.json();
    const tile = payload.tile;
    if (!tile?.headline || !tile?.budget_pln || !tile?.link_url) {
      return NextResponse.json(
        { error: 'tile.headline, tile.budget_pln, tile.link_url required' },
        { status: 400 }
      );
    }

    const auth = await getMetaToken();
    if (auth.error) {
      return NextResponse.json({ error: auth.error, hint: 'Connect Meta in /integrations' }, { status: 401 });
    }
    const token = auth.token;
    const platformData = auth.platformData || {};

    // Resolve ad account
    const adAccountId =
      payload.ad_account_id ||
      platformData.adAccountId ||
      platformData.ad_account_id ||
      (Array.isArray(platformData.adAccounts) && platformData.adAccounts[0]?.id) ||
      (Array.isArray(platformData.ad_accounts) && platformData.ad_accounts[0]?.account_id);
    if (!adAccountId) {
      return NextResponse.json(
        { error: 'No ad account id. Pass ad_account_id in body or set in Meta integration.' },
        { status: 400 }
      );
    }
    const actId = String(adAccountId).startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    // Resolve page id
    const pageId =
      payload.page_id ||
      platformData.pageId ||
      platformData.page_id ||
      (Array.isArray(platformData.pages) && platformData.pages[0]?.id);
    if (!pageId) {
      return NextResponse.json(
        { error: 'No page id. Pass page_id in body or set in Meta integration.' },
        { status: 400 }
      );
    }

    const status = payload.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';

    // ============= 1. CREATE CAMPAIGN =============
    const campaignRes = await metaPost(`${actId}/campaigns`, token, {
      name: tile.campaign_name || `[BHT Planner] ${tile.headline.slice(0, 60)}`,
      objective: 'OUTCOME_SALES',
      status,
      special_ad_categories: [],
      buying_type: 'AUCTION',
    });
    const campaignId = campaignRes.id;

    // ============= 2. CREATE ADSET =============
    // Budget: weekly PLN -> daily PLN cents
    const dailyBudgetCents = Math.max(
      100, // min 1 PLN/day
      Math.round((tile.budget_pln * 100) / 7)
    );

    // Audience: try to fuzzy-match audience_hint to a saved Custom Audience
    let targeting: any = {
      geo_locations: { countries: ['PL'] },
      age_min: 25,
      age_max: 55,
    };
    let matchedAudience: any = null;
    if (tile.audience_hint) {
      try {
        const audRes = await metaGet(`${actId}/customaudiences`, token, {
          fields: 'id,name,subtype',
          limit: 100,
        });
        const list = audRes.data || [];
        const hint = tile.audience_hint.toLowerCase();
        // Match by keywords
        const keywords = ['retarget', 'lookalike', 'site visitor', 'engager', 'purchaser', 'warm'];
        const hitKeyword = keywords.find((k) => hint.includes(k.replace(' ', '')) || hint.includes(k));
        if (hitKeyword) {
          matchedAudience = list.find((a: any) =>
            a.name.toLowerCase().includes(hitKeyword)
          );
        }
        if (!matchedAudience) {
          // Try direct name fuzzy match
          matchedAudience = list.find((a: any) =>
            hint.includes(a.name.toLowerCase().slice(0, 8))
          );
        }
      } catch (e) {
        // ignore - fall back to broad
      }
    }
    if (matchedAudience) {
      targeting.custom_audiences = [{ id: matchedAudience.id }];
    }

    // Optimization goal must match objective
    const adsetBody: any = {
      name: tile.adset_name || `${tile.campaign_name || 'BHT'} - adset`,
      campaign_id: campaignId,
      daily_budget: dailyBudgetCents,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'OFFSITE_CONVERSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      targeting,
      status,
      promoted_object: {
        pixel_id: platformData.pixel_id || platformData.pixelId || undefined,
        custom_event_type: 'PURCHASE',
      },
    };
    // If no pixel, fall back to LINK_CLICKS optimization (doesn't need pixel)
    if (!adsetBody.promoted_object.pixel_id) {
      adsetBody.optimization_goal = 'LINK_CLICKS';
      delete adsetBody.promoted_object;
    }
    if (tile.start_date) adsetBody.start_time = tile.start_date;
    if (tile.end_date) adsetBody.end_time = tile.end_date;

    const adsetRes = await metaPost(`${actId}/adsets`, token, adsetBody);
    const adsetId = adsetRes.id;

    // ============= 3. RESOLVE CREATIVE ASSETS =============
    // Look up assets matching hero products. Use first matching image/video.
    let chosenAssets: any[] = [];
    if (Array.isArray(tile.hero_products) && tile.hero_products.length) {
      for (const product of tile.hero_products) {
        const matches = await db
          .select()
          .from(assets)
          .where(like(assets.product_name, `%${product.split(' ').slice(0, 3).join(' ')}%`));
        if (matches.length) chosenAssets.push(...matches.slice(0, 1));
      }
    }
    // Fallback: any asset
    if (chosenAssets.length === 0) {
      chosenAssets = await db.select().from(assets).limit(1);
    }
    if (chosenAssets.length === 0) {
      throw new Error(
        'Brak creatives w bibliotece. Dodaj przynajmniej jedno zdjęcie/wideo pod /assets, najlepiej z product_name pasującym do hero produktu.'
      );
    }

    // Upload first asset to Meta if not yet cached
    const firstAsset = chosenAssets[0];
    let imageHash: string | null = firstAsset.meta_image_hash || null;
    let videoId: string | null = firstAsset.meta_video_id || null;

    if (firstAsset.asset_type === 'image' && !imageHash) {
      const imgUpload = await metaPost(`${actId}/adimages`, token, {
        url: firstAsset.url,
      });
      // Response shape: { images: { "<filename>": { hash: "..." } } }
      const imgs = imgUpload.images || {};
      const firstKey = Object.keys(imgs)[0];
      if (firstKey) imageHash = imgs[firstKey].hash;
      if (imageHash) {
        await db.run(
          sql`UPDATE assets SET meta_image_hash = ${imageHash} WHERE id = ${firstAsset.id}`
        );
      }
    } else if (firstAsset.asset_type === 'video' && !videoId) {
      const vidUpload = await metaPost(`${actId}/advideos`, token, {
        file_url: firstAsset.url,
      });
      videoId = vidUpload.id;
      if (videoId) {
        await db.run(
          sql`UPDATE assets SET meta_video_id = ${videoId} WHERE id = ${firstAsset.id}`
        );
      }
    }

    // ============= 4. CREATE AD CREATIVE =============
    const cta = tile.cta || 'SHOP_NOW';
    let creativeSpec: any;
    if (firstAsset.asset_type === 'image' && imageHash) {
      creativeSpec = {
        link_data: {
          message: tile.body || tile.headline,
          link: tile.link_url,
          image_hash: imageHash,
          name: tile.headline.slice(0, 40),
          call_to_action: { type: cta, value: { link: tile.link_url } },
        },
      };
    } else if (firstAsset.asset_type === 'video' && videoId) {
      creativeSpec = {
        video_data: {
          video_id: videoId,
          message: tile.body || tile.headline,
          title: tile.headline.slice(0, 40),
          call_to_action: { type: cta, value: { link: tile.link_url } },
        },
      };
    } else {
      throw new Error('Could not resolve image_hash or video_id from asset');
    }

    const creativeRes = await metaPost(`${actId}/adcreatives`, token, {
      name: `${tile.ad_name || tile.headline.slice(0, 40)} - creative`,
      object_story_spec: {
        page_id: pageId,
        ...creativeSpec,
      },
    });
    const creativeId = creativeRes.id;

    // ============= 5. CREATE AD =============
    const adRes = await metaPost(`${actId}/ads`, token, {
      name: tile.ad_name || tile.headline.slice(0, 60),
      adset_id: adsetId,
      creative: { creative_id: creativeId },
      status,
    });
    const adId = adRes.id;

    const manageUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${actId.replace('act_', '')}&selected_campaign_ids=${campaignId}`;

    // Log success
    const logIns = await db
      .insert(push_logs)
      .values({
        platform: 'meta',
        source_type: payload.source_type || 'month_plan_tile',
        source_ref: payload.source_ref || null,
        payload: JSON.stringify(payload),
        response: JSON.stringify({ campaignId, adsetId, creativeId, adId }),
        external_id: campaignId,
        external_url: manageUrl,
        status: 'success',
      })
      .returning();
    logRow = logIns[0];

    return NextResponse.json({
      data: {
        campaign_id: campaignId,
        adset_id: adsetId,
        creative_id: creativeId,
        ad_id: adId,
        manage_url: manageUrl,
        status,
        matched_audience: matchedAudience?.name || null,
        used_asset_id: firstAsset.id,
        log_id: logRow?.id || null,
      },
    });
  } catch (e: any) {
    console.error('[push/meta] error:', e);
    try {
      await db.insert(push_logs).values({
        platform: 'meta',
        source_type: payload?.source_type || 'month_plan_tile',
        source_ref: payload?.source_ref || null,
        payload: payload ? JSON.stringify(payload) : null,
        response: null,
        external_id: null,
        external_url: null,
        status: 'failed',
        error: e.message?.slice(0, 2000),
      });
    } catch {}
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
