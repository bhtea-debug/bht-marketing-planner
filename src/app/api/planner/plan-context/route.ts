// @ts-nocheck
export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { brand_profile, product_launches } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensureAssetsAndPushLogs } from '@/lib/ensure-tables';
import {
  getMetaToken,
  metaGet,
  totalConversions,
  purchaseValue,
} from '@/lib/meta-api';
import { buildWooSalesContext } from '@/lib/woo-api';

// POST /api/planner/plan-context
// Body: { month: 'YYYY-MM', accountId?: 'act_xxx' }
// Fetches Meta history, Woo commerce signals, brand profile, and upcoming
// launches ONCE so the wizard can pass them to each per-week call without
// re-fetching. This is the bulk of latency in the per-week endpoint.
export async function POST(req: NextRequest) {
  try {
    const { month, accountId } = await req.json();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month required as YYYY-MM' }, { status: 400 });
    }
    const [yStr, mStr] = month.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd = new Date(Date.UTC(y, m, 0));

    // ----- Meta history (cheap subset) -----
    let metaContext: any = { configured: false };
    try {
      const auth = await getMetaToken();
      if (!auth.error && accountId) {
        const [campRes, lifeRes] = await Promise.all([
          metaGet(`${accountId}/campaigns`, auth.token, {
            fields: 'id,name,objective,effective_status',
            limit: 200,
          }),
          metaGet(`${accountId}/insights`, auth.token, {
            level: 'campaign',
            fields: 'campaign_id,campaign_name,spend,actions,action_values,ctr,cpc',
            date_preset: 'maximum',
            limit: 200,
          }),
        ]);
        const camps = campRes.data || [];
        const insights = lifeRes.data || [];
        const map: Record<string, any> = {};
        for (const c of camps) map[c.id] = c;
        const CONV = new Set([
          'OUTCOME_SALES',
          'OUTCOME_LEADS',
          'CONVERSIONS',
          'PRODUCT_CATALOG_SALES',
          'LEAD_GENERATION',
        ]);
        const enriched = insights
          .map((i: any) => {
            const c = map[i.campaign_id] || {};
            const sp = Number(i.spend || 0);
            const conv = totalConversions(i.actions);
            const rev = purchaseValue(i.action_values, conv);
            return {
              name: i.campaign_name || c.name,
              objective: c.objective,
              spend: sp,
              roas: sp > 0 ? rev / sp : 0,
              isConv: CONV.has(c.objective || ''),
            };
          })
          .filter((c: any) => c.isConv && c.spend >= 50);
        const winners = [...enriched].sort((a, b) => b.roas - a.roas).slice(0, 3);
        const losers = [...enriched]
          .filter((c) => c.roas < 1)
          .sort((a, b) => b.spend - a.spend)
          .slice(0, 3);
        metaContext = {
          configured: true,
          winners: winners.map((w: any) => ({
            name: w.name,
            roas: Number(w.roas.toFixed(2)),
            spend: Math.round(w.spend),
          })),
          losers: losers.map((l: any) => ({
            name: l.name,
            roas: Number(l.roas.toFixed(2)),
            spend: Math.round(l.spend),
          })),
        };
      }
    } catch (e) {
      console.warn('[plan-context] meta failed', e);
    }

    // ----- Woo commerce -----
    const commerceRaw = await buildWooSalesContext(30).catch(() => null);
    const commerce =
      commerceRaw && commerceRaw.configured
        ? {
            topSellers: (commerceRaw.topSellers || commerceRaw.bestSellers || []).slice(0, 5),
            lowStock: (commerceRaw.lowStock || []).slice(0, 3),
            newProducts: (commerceRaw.newProducts || []).slice(0, 3),
          }
        : null;

    // ----- Launches (this month window) -----
    let launches: any[] = [];
    try {
      const all = await db.select().from(product_launches);
      launches = all
        .filter((l: any) => {
          const d = l.planned_launch_date || l.ai_suggested_date;
          if (!d) return false;
          if (l.status === 'launched' || l.status === 'cancelled') return false;
          const dd = new Date(d);
          const preStart = new Date(dd);
          preStart.setUTCDate(dd.getUTCDate() - 14);
          return preStart <= monthEnd && dd >= monthStart;
        })
        .map((l: any) => ({
          id: l.id,
          name: l.name,
          short_pitch: l.short_pitch,
          category: l.category,
          price_pln: l.price_pln,
          launchDate: l.planned_launch_date || l.ai_suggested_date,
          isSuggestedByAI: !l.planned_launch_date && !!l.ai_suggested_date,
        }));
    } catch {}

    // ----- Brand profile -----
    let brandForPrompt: any = null;
    try {
      await ensureAssetsAndPushLogs();
      const bpRows = await db
        .select()
        .from(brand_profile)
        .where(eq(brand_profile.id, 1))
        .limit(1);
      const bp = bpRows[0] || null;
      if (bp) {
        const parseMaybe = (s: any) => {
          if (!s) return null;
          if (typeof s !== 'string') return s;
          try { return JSON.parse(s); } catch { return s; }
        };
        brandForPrompt = {
          brand_voice: bp.brand_voice,
          visual_mood: bp.visual_mood,
          color_palette: parseMaybe(bp.color_palette),
          fonts: bp.fonts,
          do_list: bp.do_list,
          dont_list: bp.dont_list,
          composition_rules: bp.composition_rules,
          inspiration_keywords: bp.inspiration_keywords,
          target_persona: bp.target_persona,
          reference_image_urls: parseMaybe(bp.reference_image_urls),
        };
      }
    } catch {}

    return NextResponse.json({
      data: {
        meta: metaContext,
        commerce,
        launches,
        brandProfile: brandForPrompt,
        configuredAOV: Number(process.env.META_AVG_ORDER_VALUE || 120),
      },
    });
  } catch (e: any) {
    console.error('[plan-context]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
