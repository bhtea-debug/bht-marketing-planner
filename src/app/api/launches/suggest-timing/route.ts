// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { product_launches, campaigns } from '@/db/schema';
import { gte } from 'drizzle-orm';
import { buildWooSalesContext } from '@/lib/woo-api';

// POST /api/launches/suggest-timing
// Body: { name, short_pitch, description, ingredients, category, price_pln,
//         target_audience, earliest_date?, notes? }
// Returns: { suggested_date, rationale, channel_plan, target_audience_refined,
//            pricing_check, hero_hooks[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Context: today, next 90d busy weeks (existing campaigns + other launches),
    // Polish holidays, Woo bestsellers (so we don't cannibalize)
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const horizonEnd = new Date(today);
    horizonEnd.setUTCDate(today.getUTCDate() + 120);

    // Existing campaigns in the next 120 days
    let upcomingCampaigns: any[] = [];
    try {
      upcomingCampaigns = await db
        .select()
        .from(campaigns)
        .where(gte(campaigns.start_date, todayIso));
    } catch {}

    // Other planned launches
    let otherLaunches: any[] = [];
    try {
      otherLaunches = await db.select().from(product_launches);
    } catch {}

    // Live commerce signals
    const commerce = await buildWooSalesContext(30).catch(() => null);

    // Polish holidays for the next 4 months (rough — pass dates)
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
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const y = today.getUTCFullYear();
    const easter = easterSunday(y);
    const easterMonday = new Date(easter);
    easterMonday.setUTCDate(easter.getUTCDate() + 1);
    const allHolidays = [
      { date: fmt(easter), name: 'Wielkanoc' },
      { date: fmt(easterMonday), name: 'Poniedziałek Wielkanocny' },
      { date: `${y}-05-01`, name: 'Święto Pracy' },
      { date: `${y}-05-03`, name: 'Konstytucja 3 Maja' },
      { date: `${y}-05-26`, name: 'Dzień Matki' },
      { date: `${y}-06-01`, name: 'Dzień Dziecka' },
      { date: `${y}-06-23`, name: 'Dzień Ojca' },
      { date: `${y}-08-15`, name: 'Wniebowzięcie NMP' },
      { date: `${y}-11-01`, name: 'Wszystkich Świętych' },
      { date: `${y}-11-11`, name: 'Niepodległości' },
      { date: `${y}-11-27`, name: 'Black Friday (orient.)' },
      { date: `${y}-12-24`, name: 'Wigilia' },
      { date: `${y}-12-25`, name: 'Boże Narodzenie' },
      { date: `${y}-04-22`, name: 'Dzień Ziemi' },
    ].filter((h) => {
      const d = new Date(h.date);
      return d >= today && d <= horizonEnd;
    });

    const launchType: 'single' | 'product_line' =
      body.launch_type === 'product_line' ? 'product_line' : 'single';

    const productInput = {
      launch_type: launchType,
      name: body.name,
      short_pitch: body.short_pitch || null,
      description: body.description || null,
      ingredients: body.ingredients || null,
      category: body.category || null,
      price_pln: body.price_pln ?? null,
      target_audience: body.target_audience || null,
      earliest_date: body.earliest_date || todayIso,
      notes: body.notes || null,
      user_notes: body.user_notes || null,
      previous_suggestion: body.previous_suggestion || null,
    };

    const context = {
      today: todayIso,
      horizonEnd: fmt(horizonEnd),
      upcomingCampaignsCount: upcomingCampaigns.length,
      upcomingCampaignsSample: upcomingCampaigns.slice(0, 20).map((c) => ({
        name: c.name,
        start: c.start_date,
        end: c.end_date,
      })),
      otherPlannedLaunches: otherLaunches.map((l) => ({
        name: l.name,
        plannedDate: l.planned_launch_date || l.ai_suggested_date,
        status: l.status,
      })),
      holidaysAhead: allHolidays,
      commerce: commerce && commerce.configured ? commerce : null,
    };

    const system = `Jesteś senior product launch strategist dla polskiego premium e-commerce z herbatą Brown House & Tea.

Dostajesz opis nowego produktu (lub CAŁEJ LINII produktowej) i kontekst rynku/kalendarza. Twoja rola:
0. Rozpoznaj typ launchu: "single" = jeden SKU, "product_line" = cała nowa linia/kolekcja (np. 4-5 smaków, nowa seria sezonowa). Dla product_line: plan jest szerszy, z większym tease/reveal, hero-product strategy, możliwy staggered reveal. Dla single: szybciej, ostrzej, jeden hero hook.
1. Zaproponuj OPTYMALNĄ datę launchu (YYYY-MM-DD) — uwzględnij sezonowość kategorii (cold brew → maj-czerwiec, gorące napary → październik-luty), święta z 'holidaysAhead' (synergia lub świadome unikanie), wolne sloty w kalendarzu, lead time produkcyjny (min 2-3 tygodnie od dziś, chyba że user_notes mówią inaczej).

⚠️ TWARDE REGUŁY SPACING'U LAUNCHY (OBOWIĄZKOWE):
- MAKSYMALNIE 2 launche w jednym miesiącu kalendarzowym. Jeśli dany miesiąc ma już 2+ launche w otherPlannedLaunches → PRZESUŃ na następny wolny miesiąc.
- MINIMUM 3 tygodnie (21 dni) odstępu między datą tego launchu a najbliższym innym launchem (zarówno przed jak i po).
- Jeśli sezonowość sugeruje dany miesiąc ale jest już pełny → wybierz najbliższy wolny slot PRZED lub PO, preferując wcześniejszy termin.
- W warnings[] ZAWSZE wymień konflikty kalendarzowe i wyjaśnij dlaczego wybrałeś tę datę zamiast "oczywistej" sezonowej.
- Policz launche per miesiąc z otherPlannedLaunches i napisz to w rationale (np. "Maj ma już 2 launche: X i Y, przesuwam na czerwiec").

📊 ANALIZA STRATEGICZNA ISTNIEJĄCYCH LAUNCHY (OBOWIĄZKOWA):
Zanim zaproponujesz datę, PRZEANALIZUJ otherPlannedLaunches i wyciągnij wnioski:
- Jakie KATEGORIE produktów już są zaplanowane? (matcha, herbata owocowa, akcesoria, cold brew, etc.)
- Czy nowy produkt jest z tej samej kategorii co istniejące launche? → Jeśli TAK, MUSI być w innym miesiącu (kanibalizacja kategorii).
- Czy audience się pokrywa? Dwa produkty skierowane do tej samej persony potrzebują min 4 tygodnie odstępu.
- Jak wygląda rozkład launchy w czasie? Czy jest "dziura" w kalendarzu którą warto wypełnić?
- Jakie kampanie (upcomingCampaigns) już zajmują uwagę marketingu w danym okresie?
- W rationale ZAWSZE opisz: ile launchy jest w każdym miesiącu, jakie kategorie, dlaczego wybrany slot jest optymalny strategicznie (nie tylko sezonowo).
- W warnings[] dodaj ostrzeżenia typu: "Maj przeładowany — 2 launche matchy, banofi jako deser konkuruje o tę samą uwagę" lub "Brak launchy w czerwcu — optymalny slot".

2. Doprecyzuj target audience na bazie opisu/składu/ceny — kim są ci ludzie, co lubią, gdzie ich szukać.
3. Sanity-check ceny — czy spójna z premium brandem, czy nie odstaje od kategorii. Jeśli brak ceny, zasugeruj widełki.
4. Zaproponuj plan launchu: tydzień -2 (tease), tydzień -1 (pre-order/reveal), tydzień launch (push), tydzień +1 (UGC + retargeting). Dla każdego tygodnia: kanały, format, hook.
5. JEŚLI W INPUT JEST user_notes — potraktuj je jako PRIORYTETOWE dopowiedzenia od właściciela (np. "lead time surowców 6 tygodni", "chcę unikać maja bo mam urlop", "rozważ wersję 20g obok 40g"). Zrewiduj propozycję zgodnie z tymi uwagami i opisz w rationale co zmieniło się vs previous_suggestion (jeśli było).
6. Zwróć WYŁĄCZNIE valid JSON. Bez markdown, bez code fences, bez prozy.

Schema:
{
  "suggested_date": "YYYY-MM-DD",
  "confidence": "high|medium|low",
  "rationale": "<2-3 zdania, dlaczego ta data>",
  "calendar_analysis": "<analiza istniejących launchy: ile per miesiąc, jakie kategorie, gdzie jest wolny slot, dlaczego ten a nie inny>",
  "target_audience_refined": "<konkretny opis persony, max 2 zdania>",
  "pricing_check": {
    "verdict": "ok|too_low|too_high|missing",
    "suggested_range_pln": [<min>, <max>],
    "comment": "<1 zdanie>"
  },
  "launch_plan": [
    {
      "phase": "tease|pre_order|launch|follow_up",
      "weeks_before_launch": <number, 0=launch week>,
      "channels": [
        { "channel": "meta_paid|instagram_organic|email|tiktok|content", "format": "...", "hook": "...", "cta": "..." }
      ]
    }
  ],
  "hero_hooks": ["<3-5 sensorycznych, polskich hook'ów copywriterskich>"],
  "warnings": ["<konflikty kalendarzowe, ryzyka, lead time za krótki, etc.>"]
}`;

    const client = new Anthropic({ apiKey });

    function extractJson(raw: string): string {
      let s = raw.trim().replace(/```json/gi, '').replace(/```/g, '').trim();
      const first = s.indexOf('{');
      const last = s.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
      return s;
    }

    const userPrompt = `DZIŚ JEST ${todayIso}. Zaproponuj optymalny launch dla tego produktu:\n\n${JSON.stringify(
      productInput,
      null,
      2
    )}\n\nKontekst kalendarza i rynku:\n\n${JSON.stringify(
      context,
      null,
      2
    )}\n\nZwróć tylko JSON wg schematu z systemu.`;

    async function callLLM(prompt: string, sys: string) {
      const r = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 16000,
        system: sys,
        messages: [{ role: 'user', content: prompt }],
      });
      return r.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n');
    }

    let text = await callLLM(userPrompt, system);
    let parsed: any = null;
    let parseError: string | null = null;
    try {
      parsed = JSON.parse(extractJson(text));
    } catch (e: any) {
      parseError = e.message;
    }

    // Retry with stricter, smaller schema if first attempt failed or got truncated
    if (!parsed) {
      const fallbackSystem = `${system}\n\nUWAGA: poprzednia próba zwróciła niepoprawny JSON (prawdopodobnie ucięty). TYM RAZEM: maks 3 fazy w launch_plan, maks 2 kanały na fazę, maks 3 hero_hooks, maks 2 warnings. ZWRÓĆ WYŁĄCZNIE valid JSON, bez prozy, bez markdown.`;
      const fallbackPrompt = `${userPrompt}\n\nWAŻNE: zwięzłe wartości, max 3 fazy launch_plan, max 2 kanały/fazę, max 3 hero_hooks. Tylko JSON.`;
      try {
        text = await callLLM(fallbackPrompt, fallbackSystem);
        parsed = JSON.parse(extractJson(text));
        parseError = null;
      } catch (e: any) {
        parseError = e.message;
      }
    }

    if (!parsed) {
      return NextResponse.json(
        { error: 'LLM returned non-JSON', parseError, raw: text.slice(0, 4000) },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: { suggestion: parsed, productInput, context } });
  } catch (e: any) {
    console.error('[suggest-timing]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
