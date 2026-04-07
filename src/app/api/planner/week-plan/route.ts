// @ts-nocheck
export const maxDuration = 120; // single week LLM call ~20-50s
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { campaigns, channels, product_launches, brand_profile } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { ensureAssetsAndPushLogs } from '@/lib/ensure-tables';
import {
  getMetaToken,
  metaGet,
  totalConversions,
  purchaseValue,
} from '@/lib/meta-api';
import { buildWooSalesContext } from '@/lib/woo-api';
import { loadMarketingSkill } from '@/lib/marketing-skill';

// POST /api/planner/week-plan
// Body: { month: 'YYYY-MM', isoWeek: number, accountId?: 'act_xxx' }
// Generates a SINGLE week of the marketing plan. Designed to be called
// sequentially by the wizard so the user sees progress.
export async function POST(req: NextRequest) {
  try {
    const { month, isoWeek, accountId } = await req.json();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month required as YYYY-MM' }, { status: 400 });
    }
    if (!isoWeek || typeof isoWeek !== 'number') {
      return NextResponse.json({ error: 'isoWeek (number) required' }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const [yStr, mStr] = month.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd = new Date(Date.UTC(y, m, 0));
    const startIso = monthStart.toISOString().slice(0, 10);
    const endIso = monthEnd.toISOString().slice(0, 10);

    function isoWeekNum(d: Date): number {
      const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const dayNum = t.getUTCDay() || 7;
      t.setUTCDate(t.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
      return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    }

    function isoWeekMonday(year: number, week: number): Date {
      const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
      const dow = simple.getUTCDay() || 7;
      const monday = new Date(simple);
      monday.setUTCDate(simple.getUTCDate() - dow + 1);
      return monday;
    }
    function fmt(d: Date) {
      return d.toISOString().slice(0, 10);
    }

    const weekMonday = isoWeekMonday(y, isoWeek);
    const weekSunday = new Date(weekMonday);
    weekSunday.setUTCDate(weekMonday.getUTCDate() + 6);
    const weekStartIso = fmt(weekMonday);
    const weekEndIso = fmt(weekSunday);

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const daysUntilStart = Math.max(
      0,
      Math.round((weekMonday.getTime() - today.getTime()) / 86400000)
    );

    // Easter for the year
    function easterSunday(year: number): Date {
      const a = year % 19;
      const b = Math.floor(year / 100);
      const c = year % 100;
      const d2 = Math.floor(b / 4);
      const e = b % 4;
      const f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d2 - g + 15) % 30;
      const i = Math.floor(c / 4);
      const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const mm = Math.floor((a + 11 * h + 22 * l) / 451);
      const month0 = Math.floor((h + l - 7 * mm + 114) / 31);
      const day = ((h + l - 7 * mm + 114) % 31) + 1;
      return new Date(Date.UTC(year, month0 - 1, day));
    }
    const easter = easterSunday(y);
    const easterMonday = new Date(easter);
    easterMonday.setUTCDate(easter.getUTCDate() + 1);
    const allHolidays: Array<{ date: string; name: string }> = [
      { date: `${y}-01-01`, name: 'Nowy Rok' },
      { date: `${y}-01-06`, name: 'Trzech Króli' },
      { date: fmt(easter), name: 'Wielkanoc' },
      { date: fmt(easterMonday), name: 'Poniedziałek Wielkanocny' },
      { date: `${y}-05-01`, name: 'Święto Pracy' },
      { date: `${y}-05-03`, name: 'Konstytucji 3 Maja' },
      { date: `${y}-05-26`, name: 'Dzień Matki' },
      { date: `${y}-06-01`, name: 'Dzień Dziecka' },
      { date: `${y}-06-23`, name: 'Dzień Ojca' },
      { date: `${y}-08-15`, name: 'Wniebowzięcie NMP' },
      { date: `${y}-11-01`, name: 'Wszystkich Świętych' },
      { date: `${y}-11-11`, name: 'Niepodległości' },
      { date: `${y}-12-24`, name: 'Wigilia' },
      { date: `${y}-12-25`, name: 'Boże Narodzenie' },
      { date: `${y}-12-26`, name: 'Drugi dzień świąt' },
      { date: `${y}-12-31`, name: 'Sylwester' },
      { date: `${y}-02-14`, name: 'Walentynki' },
      { date: `${y}-04-22`, name: 'Dzień Ziemi' },
      { date: `${y}-11-27`, name: 'Black Friday (orientacyjnie)' },
    ];
    const holidaysInWeek = allHolidays.filter((h) => {
      const dh = new Date(h.date);
      return dh >= weekMonday && dh <= weekSunday;
    });

    // ----- Existing campaigns just for awareness (compact) ------
    const channelRows = (await db.select().from(channels).catch(() => [])) as any[];
    const channelMap: Record<number, string> = {};
    for (const c of channelRows) channelMap[c.id] = c.name;

    let weekCampaigns: any[] = [];
    try {
      const all = await db
        .select()
        .from(campaigns)
        .where(and(gte(campaigns.start_date, startIso), lte(campaigns.start_date, endIso)));
      weekCampaigns = all.filter(
        (c: any) => c.start_date && isoWeekNum(new Date(c.start_date)) === isoWeek
      );
    } catch {}

    // ----- Compact Meta context (winners/losers only) ------
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
      console.warn('[week-plan] meta context failed', e);
    }

    // ----- Live Woo commerce context ------
    const commerce = await buildWooSalesContext(30).catch(() => null);

    // ----- Launches relevant to this week's pre-launch window ------
    let relevantLaunches: any[] = [];
    try {
      const all = await db.select().from(product_launches);
      relevantLaunches = all
        .filter((l: any) => {
          const d = l.planned_launch_date || l.ai_suggested_date;
          if (!d) return false;
          if (l.status === 'launched' || l.status === 'cancelled') return false;
          const dd = new Date(d);
          const preStart = new Date(dd);
          preStart.setUTCDate(dd.getUTCDate() - 14);
          // overlaps this week?
          return preStart <= weekSunday && dd >= weekMonday;
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

    // ----- Brand profile ------
    let brandProfile: any = null;
    try {
      await ensureAssetsAndPushLogs();
      const bpRows = await db
        .select()
        .from(brand_profile)
        .where(eq(brand_profile.id, 1))
        .limit(1);
      brandProfile = bpRows[0] || null;
    } catch {}
    function parseMaybe(s: any) {
      if (!s) return null;
      if (typeof s !== 'string') return s;
      try { return JSON.parse(s); } catch { return s; }
    }
    const brandForPrompt = brandProfile
      ? {
          brand_voice: brandProfile.brand_voice,
          visual_mood: brandProfile.visual_mood,
          color_palette: parseMaybe(brandProfile.color_palette),
          fonts: brandProfile.fonts,
          do_list: brandProfile.do_list,
          dont_list: brandProfile.dont_list,
          composition_rules: brandProfile.composition_rules,
          inspiration_keywords: brandProfile.inspiration_keywords,
          target_persona: brandProfile.target_persona,
          reference_image_urls: parseMaybe(brandProfile.reference_image_urls),
        }
      : null;

    // ----- Build payload (small) ------
    const userPayload = {
      month,
      today: todayIso,
      week: {
        isoWeek,
        startDate: weekStartIso,
        endDate: weekEndIso,
        daysUntilStart,
      },
      holidaysInWeek,
      existingCampaignsThisWeek: weekCampaigns.map((c: any) => ({
        name: c.name,
        channel: channelMap[c.channel_id] || null,
        budgetPlanned: Number(c.budget_planned || 0),
        status: c.status,
      })),
      meta: metaContext,
      commerce: commerce && commerce.configured ? commerce : null,
      relevantLaunches,
      brandProfile: brandForPrompt,
      configuredAOV: Number(process.env.META_AVG_ORDER_VALUE || 120),
    };

    // ----- LLM call ------
    const skill = loadMarketingSkill();
    const client = new Anthropic({ apiKey });

    const resp = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 6000,
      system: skill,
      messages: [
        {
          role: 'user',
          content: `Wygeneruj plan marketingowy DLA POJEDYNCZEGO TYGODNIA ISO ${isoWeek} (${weekStartIso} → ${weekEndIso}) miesiąca ${month}.

DZIŚ JEST ${todayIso}. Tydzień startuje za ${daysUntilStart} dni.
Święta w tym tygodniu: ${holidaysInWeek.length ? holidaysInWeek.map((h) => `${h.name} ${h.date}`).join(', ') : 'brak'}.

ZWRÓĆ JEDEN OBIEKT JSON (NIE tablicę, NIE wrapper "weeks") opisujący ten tydzień, w schemacie:
{
  "isoWeek": ${isoWeek},
  "label": "Tydzień ${isoWeek} (${weekStartIso} – ${weekEndIso})",
  "dateRange": "${weekStartIso} – ${weekEndIso}",
  "start_date": "${weekStartIso}",
  "end_date": "${weekEndIso}",
  "theme": "krótki temat tygodnia",
  "rationale": "1-2 zdania uzasadnienia (sezon, dane, święta, launche)",
  "hero_products": [{ "name": "...", "why": "..." }],
  "promo": { "type": "none|percent|bundle|gift|free_shipping", "value": "...", "mechanics": "..." },
  "weekly_budget_pln": 0,
  "designer_summary": "2-3 zdania syntezy wizualnej dla całego tygodnia (mood + paleta + kluczowy obiekt)",
  "channels": [
    {
      "channel": "meta_ads_prospecting | meta_ads_retargeting | instagram_organic | facebook_organic | email | tiktok | influencer | content_blog",
      "format": "single_image | carousel | reels | story | newsletter | post | ...",
      "objective": "...",
      "creative_hook": "...",
      "headline": "...",
      "body": "...",
      "cta": "...",
      "audience": "...",
      "expected_kpi": "...",
      "budget_pln": 0,
      "visual_brief": {
        "scene": "co dokładnie pokazujemy w kadrze (1-2 zdania, sensorycznie)",
        "props": ["lista", "rekwizytów"],
        "lighting": "opis światła (kierunek, ciepło, godzina dnia)",
        "palette": ["#hex1", "#hex2", "#hex3"],
        "composition": "framing, hierarchia, krzywa wzroku",
        "mood_keywords": ["3-5", "krótkich", "kotwic"],
        "do": "co MUSI być (1 zdanie)",
        "dont": "czego NIE robić (1 zdanie)",
        "reference_note": "do której referencji z brandProfile się odnosisz"
      }
    }
  ],
  "linked_calendar_tasks": ["...", "..."]
}

Briefy wizualne MUSZĄ wynikać z brandProfile (visual_mood, color_palette, do_list, dont_list, composition_rules, inspiration_keywords). Jeśli brandProfile = null, użyj defaultowej estetyki Brown House & Tea: ciepłe naturalne światło z lewej, papier handmade, drewno orzechowe, szkło borokrzemowe, tony piaskowe (#f5f1ea, #e8dbc4, #8b6f4e, #3d2817), bez sztucznego białego światła ani kolorów neonowych.

Zwróć WYŁĄCZNIE valid JSON jednego obiektu tygodnia, bez markdown, bez prozy, bez code fences. Dane wejściowe:\n\n${JSON.stringify(
            userPayload,
            null,
            2
          )}`,
        },
      ],
    });

    const text = resp.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');

    function extractJson(raw: string): string {
      let s = raw.trim();
      s = s.replace(/```json/gi, '').replace(/```/g, '').trim();
      const first = s.indexOf('{');
      const last = s.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) {
        s = s.slice(first, last + 1);
      }
      return s;
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(extractJson(text));
    } catch (e: any) {
      return NextResponse.json(
        {
          error: 'LLM returned non-JSON',
          parseError: e.message,
          raw: text.slice(0, 4000),
        },
        { status: 502 }
      );
    }

    // Defensive: if model wrapped in {weeks:[...]}, unwrap.
    if (parsed && parsed.weeks && Array.isArray(parsed.weeks) && parsed.weeks[0]) {
      parsed = parsed.weeks[0];
    }

    return NextResponse.json({
      data: {
        week: parsed,
        debug: {
          isoWeek,
          weekStartIso,
          weekEndIso,
          metaConfigured: metaContext.configured,
          commerceConfigured: Boolean(commerce && commerce.configured),
          launchesInWindow: relevantLaunches.length,
          existingCampaignsThisWeek: weekCampaigns.length,
        },
      },
    });
  } catch (e: any) {
    console.error('[week-plan]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
