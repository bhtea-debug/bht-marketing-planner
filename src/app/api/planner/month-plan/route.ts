// @ts-nocheck
export const maxDuration = 300; // 5 min for LLM call
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

// POST /api/planner/month-plan
// Body: { month: 'YYYY-MM', accountId: 'act_xxx' }
// Builds full context (gaps + history + Woo + planner) and asks the LLM,
// primed with the marketing-planner skill, to return a structured monthly plan.
export async function POST(req: NextRequest) {
  try {
    const { month, accountId } = await req.json();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month required as YYYY-MM' }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured in env' },
        { status: 500 }
      );
    }

    // ----- 1. Compute month boundaries + ISO week numbers ------------------
    const [yStr, mStr] = month.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd = new Date(Date.UTC(y, m, 0));
    const startIso = monthStart.toISOString().slice(0, 10);
    const endIso = monthEnd.toISOString().slice(0, 10);

    function isoWeek(d: Date): number {
      const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const dayNum = t.getUTCDay() || 7;
      t.setUTCDate(t.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
      return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    }

    const weeksInMonth: number[] = [];
    for (
      let d = new Date(monthStart);
      d <= monthEnd;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const w = isoWeek(d);
      if (!weeksInMonth.includes(w)) weeksInMonth.push(w);
    }

    // Today + current ISO week, used to disqualify past weeks
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const currentIsoWeek = isoWeek(today);
    const pastWeeks = weeksInMonth.filter((w) => w < currentIsoWeek);
    const futureWeeks = weeksInMonth.filter((w) => w >= currentIsoWeek);

    // Computus — accurate Easter Sunday for any year (Anonymous Gregorian algo)
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
      const month0 = Math.floor((h + l - 7 * mm + 114) / 31); // 3=Mar, 4=Apr
      const day = ((h + l - 7 * mm + 114) % 31) + 1;
      return new Date(Date.UTC(year, month0 - 1, day));
    }
    function fmt(d: Date) {
      return d.toISOString().slice(0, 10);
    }
    const easter = easterSunday(y);
    const easterMonday = new Date(easter);
    easterMonday.setUTCDate(easter.getUTCDate() + 1);
    // Polish public/cultural holidays for context — only those in this month
    const allHolidays: Array<{ date: string; name: string }> = [
      { date: `${y}-01-01`, name: 'Nowy Rok' },
      { date: `${y}-01-06`, name: 'Trzech Króli' },
      { date: fmt(easter), name: 'Wielkanoc' },
      { date: fmt(easterMonday), name: 'Poniedziałek Wielkanocny' },
      { date: `${y}-05-01`, name: 'Święto Pracy' },
      { date: `${y}-05-03`, name: 'Święto Konstytucji 3 Maja' },
      { date: `${y}-05-26`, name: 'Dzień Matki' },
      { date: `${y}-06-01`, name: 'Dzień Dziecka' },
      { date: `${y}-06-23`, name: 'Dzień Ojca' },
      { date: `${y}-08-15`, name: 'Wniebowzięcie NMP' },
      { date: `${y}-11-01`, name: 'Wszystkich Świętych' },
      { date: `${y}-11-11`, name: 'Święto Niepodległości' },
      { date: `${y}-12-24`, name: 'Wigilia' },
      { date: `${y}-12-25`, name: 'Boże Narodzenie' },
      { date: `${y}-12-26`, name: 'Drugi dzień świąt' },
      { date: `${y}-12-31`, name: 'Sylwester' },
      // Cultural / commerce dates
      { date: `${y}-02-14`, name: 'Walentynki' },
      { date: `${y}-04-22`, name: 'Dzień Ziemi' },
      { date: `${y}-11-27`, name: 'Black Friday (orientacyjnie)' },
    ];
    const holidaysThisMonth = allHolidays.filter((h) => {
      const dh = new Date(h.date);
      return dh >= monthStart && dh <= monthEnd;
    });

    // Lead-time map per future week: how many days from today until that week starts
    function isoWeekMonday(year: number, week: number): Date {
      const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
      const dow = simple.getUTCDay() || 7;
      const monday = new Date(simple);
      monday.setUTCDate(simple.getUTCDate() - dow + 1);
      return monday;
    }
    const futureWeeksWithLeadTime = futureWeeks.map((w) => {
      const monday = isoWeekMonday(y, w);
      const diffMs = monday.getTime() - today.getTime();
      const days = Math.max(0, Math.round(diffMs / 86400000));
      return { isoWeek: w, mondayDate: fmt(monday), daysUntilStart: days };
    });

    // ----- 2. Existing planner state for this month ------------------------
    const channelRows = (await db.select().from(channels).catch(() => [])) as any[];
    const channelMap: Record<number, string> = {};
    for (const c of channelRows) channelMap[c.id] = c.name;

    let monthCampaigns: any[] = [];
    try {
      monthCampaigns = await db
        .select()
        .from(campaigns)
        .where(and(gte(campaigns.start_date, startIso), lte(campaigns.start_date, endIso)));
    } catch {}

    const plannedWeeks = new Set(
      monthCampaigns
        .map((c: any) => (c.start_date ? isoWeek(new Date(c.start_date)) : null))
        .filter(Boolean)
    );
    const gapWeeks = weeksInMonth.filter((w) => !plannedWeeks.has(w));

    // ----- 3. Meta historical signals (cheap subset) -----------------------
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
            fields:
              'campaign_id,campaign_name,spend,actions,action_values,ctr,cpc',
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
              conv,
              revenue: rev,
              roas: sp > 0 ? rev / sp : 0,
              isConv: CONV.has(c.objective || ''),
            };
          })
          .filter((c: any) => c.isConv && c.spend >= 50);

        const winners = [...enriched].sort((a, b) => b.roas - a.roas).slice(0, 5);
        const losers = [...enriched]
          .filter((c) => c.roas < 1)
          .sort((a, b) => b.spend - a.spend)
          .slice(0, 5);

        const totalSpend = enriched.reduce((s, c) => s + c.spend, 0);
        const totalRev = enriched.reduce((s, c) => s + c.revenue, 0);

        metaContext = {
          configured: true,
          totalLifetimeSpend: Math.round(totalSpend),
          totalLifetimeRevenue: Math.round(totalRev),
          lifetimeRoas: totalSpend > 0 ? Number((totalRev / totalSpend).toFixed(2)) : 0,
          activeCampaigns: camps
            .filter((c: any) => c.effective_status === 'ACTIVE')
            .map((c: any) => c.name),
          winners: winners.map((w: any) => ({
            name: w.name,
            objective: w.objective,
            roas: Number(w.roas.toFixed(2)),
            spend: Math.round(w.spend),
          })),
          losers: losers.map((l: any) => ({
            name: l.name,
            objective: l.objective,
            roas: Number(l.roas.toFixed(2)),
            spend: Math.round(l.spend),
          })),
        };
      }
    } catch (e) {
      console.warn('[month-plan] meta context failed', e);
    }

    // ----- 4. Live Woo commerce context ------------------------------------
    const commerce = await buildWooSalesContext(30).catch(() => null);

    // ----- 4b. Upcoming product launches relevant to this month ------------
    let upcomingLaunches: any[] = [];
    try {
      const all = await db.select().from(product_launches);
      upcomingLaunches = all
        .filter((l: any) => {
          const d = l.planned_launch_date || l.ai_suggested_date;
          if (!d) return false;
          if (l.status === 'launched' || l.status === 'cancelled') return false;
          const dd = new Date(d);
          // launches whose pre-launch window (-14d) overlaps this month or
          // whose actual date falls in this month
          const preStart = new Date(dd);
          preStart.setUTCDate(dd.getUTCDate() - 14);
          return preStart <= monthEnd && dd >= monthStart;
        })
        .map((l: any) => {
          const d = l.planned_launch_date || l.ai_suggested_date;
          return {
            id: l.id,
            name: l.name,
            short_pitch: l.short_pitch,
            category: l.category,
            price_pln: l.price_pln,
            target_audience: l.target_audience,
            launchDate: d,
            launchIsoWeek: d ? isoWeek(new Date(d)) : null,
            status: l.status,
            isSuggestedByAI: !l.planned_launch_date && !!l.ai_suggested_date,
          };
        });
    } catch {}

    // ----- 5. Build the user message for the LLM --------------------------
    const userPayload = {
      month,
      today: todayIso,
      currentIsoWeek,
      iso_weeks_in_month: weeksInMonth,
      pastWeeks,
      futureWeeks,
      futureWeeksLeadTime: futureWeeksWithLeadTime,
      holidays: holidaysThisMonth,
      existingPlan: {
        plannedWeeks: [...plannedWeeks],
        gapWeeks: gapWeeks.filter((w) => w >= currentIsoWeek),
        pastGapWeeks: gapWeeks.filter((w) => w < currentIsoWeek),
        existingCampaigns: monthCampaigns.map((c: any) => ({
          name: c.name,
          channel: channelMap[c.channel_id] || null,
          startDate: c.start_date,
          endDate: c.end_date,
          budgetPlanned: Number(c.budget_planned || 0),
          status: c.status,
        })),
      },
      meta: metaContext,
      commerce: commerce && commerce.configured ? commerce : null,
      upcomingLaunches,
      configuredAOV: Number(process.env.META_AVG_ORDER_VALUE || 120),
    };

    // ----- 6. Load brand profile (visual identity) for graphic briefs ------
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

    userPayload.brandProfile = brandForPrompt;

    // ----- 7. Call Claude with marketing skill as system prompt ------------
    const skill = loadMarketingSkill();
    const client = new Anthropic({ apiKey });

    const resp = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 16000,
      system: skill,
      messages: [
        {
          role: 'user',
          content: `Wygeneruj plan marketingowy dla miesiąca ${month}.

DZIŚ JEST ${todayIso} (tydzień ISO ${currentIsoWeek}). Tygodnie ${pastWeeks.join(', ') || '(brak)'} JUŻ MINĘŁY — NIE planuj dla nich nic. Planuj tylko dla tygodni ${futureWeeks.join(', ')}.

Święta w tym miesiącu (jedyne źródło prawdy o datach): ${
              holidaysThisMonth.length
                ? holidaysThisMonth.map((h) => `${h.name} ${h.date}`).join(', ')
                : 'brak istotnych świąt'
            }.

WAŻNE - ROZSZERZONA STRUKTURA WYJŚCIA:
Każdy blok kanału (channel item) w każdym tygodniu MUSI zawierać OPRÓCZ standardowych pól (channel, format, headline, cta, audience, kpi, budget) DODATKOWO pole "visual_brief" — szczegółowy brief wizualny dla grafika, w formacie:
{
  "scene": "co dokładnie pokazujemy w kadrze (1-2 zdania, sensorycznie)",
  "props": ["lista", "rekwizytów"],
  "lighting": "opis światła (kierunek, ciepło, godzina dnia)",
  "palette": ["#hex1", "#hex2", "#hex3"],
  "composition": "framing, hierarchia, krzywa wzroku",
  "mood_keywords": ["3-5", "krótkich", "kotwic emocjonalnych"],
  "do": "co MUSI być (1 zdanie)",
  "dont": "czego absolutnie NIE robić (1 zdanie)",
  "reference_note": "do której z 'reference_image_urls' albo 'inspiration_keywords' z brandProfile się odnosisz"
}

Briefy MUSZĄ wynikać z brandProfile (visual_mood, color_palette, do_list, dont_list, composition_rules, inspiration_keywords). Jeśli brandProfile = null, użyj defaultowej estetyki Brown House & Tea: ciepłe naturalne światło z lewej, papier handmade, drewno orzechowe, szkło borokrzemowe, tony piaskowe (#f5f1ea, #e8dbc4, #8b6f4e, #3d2817), nie używać sztucznego białego światła ani kolorów neonowych.

Każdy tydzień ma też zawierać pole "designer_summary" — 2-3 zdania syntezy wizualnej dla całego tygodnia, żeby grafik wiedział jaki "wygląd tygodnia" ma utrzymać.

Zwróć WYŁĄCZNIE valid JSON wg schematu z systemu (rozszerzonego o powyższe pola), bez markdown, bez prozy, bez code fences. Dane wejściowe (zwróć uwagę na brandProfile w środku):\n\n${JSON.stringify(
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

    // Robust JSON extraction: strip fences anywhere, then carve out the
    // outermost {...} block so a stray prefix/suffix can't break parsing.
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

    return NextResponse.json({
      data: {
        plan: parsed,
        debug: {
          weeksInMonth,
          gapWeeks,
          existingCampaignCount: monthCampaigns.length,
          metaConfigured: metaContext.configured,
          commerceConfigured: Boolean(commerce && commerce.configured),
        },
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
