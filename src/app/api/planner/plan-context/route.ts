// @ts-nocheck
export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { brand_profile, product_launches, brain_cache, marketing_trends } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensureAssetsAndPushLogs } from '@/lib/ensure-tables';
import {
  getMetaToken,
  metaGet,
  totalConversions,
  purchaseValue,
} from '@/lib/meta-api';
import { buildWooSalesContext } from '@/lib/woo-api';
import { planning_knowledge } from '@/db/schema';
import { ensurePlanningKnowledge } from '@/lib/ensure-tables';

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
    // Also get the FULL product catalog so the AI knows every product by name,
    // price, category, and stock — not just the analytics slices.
    let fullCatalog: any[] = [];
    try {
      const { getWooProducts } = await import('@/lib/woo-api');
      const allProducts = await getWooProducts();
      fullCatalog = allProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        categories: p.categories,
        stock: p.stock,
        stockStatus: p.stockStatus,
        onSale: p.onSale,
      }));
    } catch (e) {
      console.warn('[plan-context] full catalog failed', e);
    }
    const commerce =
      commerceRaw && commerceRaw.configured
        ? {
            // FIX: key was topSellers but buildWooSalesContext returns topProducts
            topProducts: (commerceRaw.topProducts || []).slice(0, 10),
            slowProducts: (commerceRaw.slowProducts || []).slice(0, 10),
            lowStock: (commerceRaw.lowStock || []).slice(0, 15),
            onSale: (commerceRaw.onSale || []).slice(0, 20),
            totalCatalogSize: commerceRaw.totalCatalogSize,
            categoriesActive: commerceRaw.categoriesActive,
            orderCount: commerceRaw.orderCount,
            revenue: commerceRaw.revenue,
            averageOrderValue: commerceRaw.averageOrderValue,
            // FULL CATALOG — every published product in the store
            fullCatalog,
          }
        : null;

    // ----- Store policies (hardcoded for BHT) -----
    const storePolicies = {
      freeShippingThreshold: 129,
      freeShippingNote: 'Darmowa wysyłka od 129 PLN — to STANDARD, nie promocja. Nie komunikuj tego jako promo.',
      standardShippingCost: 14.99,
      returnDays: 14,
      paymentMethods: ['przelew', 'BLIK', 'karta', 'PayPo (odroczone)'],
      currency: 'PLN',
      notes: [
        'Darmowa wysyłka od 129 PLN to stały warunek — NIGDY nie proponuj free_shipping jako promo poniżej tego progu.',
        'Jeśli tworzysz promo free_shipping, próg musi być NIŻSZY niż 129 PLN — bo inaczej klient i tak ma darmową.',
        'Nie proponuj progu darmowej wysyłki wyższego niż 129 PLN — to pogarsza istniejącą ofertę.',
      ],
    };

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

    // ----- Planning knowledge (accumulated AI learnings) -----
    let knowledgeEntries: any[] = [];
    try {
      await ensurePlanningKnowledge();
      const rows = await db
        .select()
        .from(planning_knowledge)
        .where(eq(planning_knowledge.active, 1));
      knowledgeEntries = rows.map((r: any) => ({
        category: r.category,
        content: r.content,
      }));
    } catch (e) {
      console.warn('[plan-context] knowledge fetch failed', e);
    }

    // ----- Brain strategy (READ-ONLY from nudge-brain via brain_cache) -----
    let brainStrategy: any[] = [];
    try {
      const brainSections = await db
        .select()
        .from(brain_cache)
        .where(eq(brain_cache.kind, 'section'));
      brainStrategy = brainSections
        .map((c: any) => { try { return JSON.parse(c.payload_json); } catch { return null; } })
        .filter(Boolean)
        .map((s: any) => ({
          module: s.module_slug,
          title: s.title,
          category: s.category || null,
          excerpt: typeof s.content === 'string' ? s.content.slice(0, 1500) : '',
        }))
        .slice(0, 30); // cap for token budget
    } catch (e) {
      console.warn('[plan-context] brain fetch failed', e);
    }

    // ----- Live marketing trends (TikTok/IG/FB scanned weekly) -----
    let liveTrends: any[] = [];
    let trendsLastScanAt: string | null = null;
    try {
      const t = await db.select().from(marketing_trends).where(eq(marketing_trends.active, 1));
      liveTrends = t
        .map((row: any) => ({
          platform: row.platform,
          kind: row.kind,
          title: row.title,
          description: row.description,
          example: row.example,
          relevance_score: row.relevance_score,
          scanned_at: row.scanned_at,
        }))
        .sort((a: any, b: any) => (b.relevance_score || 0) - (a.relevance_score || 0))
        .slice(0, 30);
      trendsLastScanAt = liveTrends[0]?.scanned_at || null;
    } catch (e) {
      console.warn('[plan-context] trends fetch failed', e);
    }

    // ----- Existing tasks & campaigns for analysis -----
    let existingTasks: any[] = [];
    try {
      const { tasks: tasksTable, campaigns: campaignsTable } = await import('@/db/schema');
      const allTasks = await db.select().from(tasksTable);
      const allCampaigns = await db.select().from(campaignsTable);
      const campMap: Record<number, any> = {};
      for (const c of allCampaigns) campMap[c.id] = c;
      existingTasks = allTasks
        .filter((t: any) => {
          const camp = campMap[t.campaign_id];
          if (!camp) return false;
          // Only include tasks for the target month +/- 1 month
          const sd = camp.start_date || '';
          return sd.startsWith(month) || sd.startsWith(month.replace(/-\d+$/, ''));
        })
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          scheduled_date: t.scheduled_date,
          campaign: campMap[t.campaign_id]?.name || '?',
        }))
        .slice(0, 50); // cap for token budget
    } catch (e) {
      console.warn('[plan-context] tasks fetch failed', e);
    }

    return NextResponse.json({
      data: {
        meta: metaContext,
        commerce,
        launches,
        brandProfile: brandForPrompt,
        configuredAOV: Number(process.env.META_AVG_ORDER_VALUE || 120),
        storePolicies,
        knowledgeEntries,
        brainStrategy,
        liveTrends,
        trendsLastScanAt,
        existingTasks,
      },
    });
  } catch (e: any) {
    console.error('[plan-context]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
