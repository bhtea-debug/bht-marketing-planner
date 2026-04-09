// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { product_launches, campaigns, brand_profile, planning_knowledge } from '@/db/schema';
import { gte, eq } from 'drizzle-orm';
import { buildWooSalesContext } from '@/lib/woo-api';
import { getWooProducts } from '@/lib/woo-api';

// POST /api/launches/portfolio-review
// Analyzes ALL planned launches together and suggests optimal timing reshuffles
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    // Fetch all launches
    let allLaunches: any[] = [];
    try {
      allLaunches = await db.select().from(product_launches);
    } catch {}

    const activeLaunches = allLaunches.filter(l => !['launched', 'cancelled'].includes(l.status));
    if (activeLaunches.length < 2) {
      return NextResponse.json({ error: 'Potrzebujesz minimum 2 aktywnych launchy do analizy portfolio' }, { status: 400 });
    }

    // Existing campaigns
    let upcomingCampaigns: any[] = [];
    try {
      upcomingCampaigns = await db.select().from(campaigns).where(gte(campaigns.start_date, todayIso));
    } catch {}

    // Commerce data
    const commerce = await buildWooSalesContext(30).catch(() => null);

    // Brand profile
    let brandData: any = null;
    try {
      const bpRows = await db.select().from(brand_profile).where(eq(brand_profile.id, 1)).limit(1);
      brandData = bpRows[0] || null;
    } catch {}

    // Planning knowledge
    let knowledgeEntries: any[] = [];
    try {
      knowledgeEntries = await db.select().from(planning_knowledge).where(eq(planning_knowledge.active, 1));
    } catch {}

    // Full product catalog
    let fullCatalog: any[] = [];
    try {
      fullCatalog = await getWooProducts().catch(() => []);
    } catch {}

    // Polish holidays
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const y = today.getUTCFullYear();
    function easterSunday(year: number): Date {
      const a = year % 19, b = Math.floor(year / 100), c = year % 100;
      const d2 = Math.floor(b / 4), e = b % 4;
      const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d2 - g + 15) % 30;
      const i = Math.floor(c / 4), k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const mm = Math.floor((a + 11 * h + 22 * l) / 451);
      const month0 = Math.floor((h + l - 7 * mm + 114) / 31);
      const day = ((h + l - 7 * mm + 114) % 31) + 1;
      return new Date(Date.UTC(year, month0 - 1, day));
    }
    const easter = easterSunday(y);
    const easterMonday = new Date(easter);
    easterMonday.setUTCDate(easter.getUTCDate() + 1);
    const holidays = [
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
    ].filter(h => new Date(h.date) >= today);

    const context = {
      today: todayIso,
      activeLaunches: activeLaunches.map(l => ({
        id: l.id,
        name: l.name,
        category: l.category || 'nieznana',
        short_pitch: l.short_pitch || null,
        description: l.description || null,
        target_audience: l.target_audience || null,
        price_pln: l.price_pln || null,
        status: l.status,
        currentDate: l.planned_launch_date || l.ai_suggested_date || null,
        launch_type: l.launch_type || 'single',
      })),
      alreadyLaunchedThisYear: allLaunches
        .filter(l => l.status === 'launched')
        .map(l => ({ name: l.name, category: l.category, date: l.planned_launch_date })),
      upcomingCampaigns: upcomingCampaigns.slice(0, 15).map(c => ({
        name: c.name, start: c.start_date, end: c.end_date,
      })),
      holidays,
      existingCatalog: fullCatalog.slice(0, 50).map((p: any) => ({
        name: p.name,
        category: p.categories?.[0]?.name || 'uncategorized',
        price: p.price,
      })),
      brandProfile: brandData ? {
        brand_name: brandData.brand_name,
        tone_of_voice: brandData.tone_of_voice,
        target_audience: brandData.target_audience,
        unique_selling_points: brandData.unique_selling_points,
      } : null,
      knowledgeEntries: knowledgeEntries.slice(0, 20).map(k => ({
        category: k.category, content: k.content,
      })),
      commerce: commerce?.configured ? {
        topProducts: commerce.topProducts?.slice(0, 10),
        slowProducts: commerce.slowProducts?.slice(0, 5),
      } : null,
    };

    const system = `Jesteś CHIEF PRODUCT STRATEGIST dla Brown House & Tea — polskiego premium e-commerce z herbatą.

Dostajesz WSZYSTKIE aktywne launche (planowane, w rozwoju, gotowe) i pełny kontekst: katalog sklepu, kampanie, święta, brand profile. Twoja rola: PRZEANALIZOWAĆ CAŁE PORTFOLIO LAUNCHY RAZEM i zaproponować OPTYMALNY UKŁAD W CZASIE.

NIE analizujesz każdego launchu osobno — patrzysz na CAŁOŚĆ jak dyrektor marketingu planujący cały rok.

═══════════════════════════════════════════
KROK 1: AUDYT OBECNEGO STANU
═══════════════════════════════════════════
- Jakie kategorie produktów mamy w sklepie (existingCatalog)?
- Jakie launche są zaplanowane i kiedy?
- Czy są konflikty: za dużo launchy w jednym miesiącu? Ta sama kategoria obok siebie? Przeładowanie marketingu?
- Jakie kampanie już biegną (upcomingCampaigns)?
- Jakie święta/okazje można wykorzystać lub trzeba unikać?

═══════════════════════════════════════════
KROK 2: STRATEGIA NARRACJI ROCZNEJ
═══════════════════════════════════════════
- Jaka HISTORIA wyłania się z tych launchy? (np. "od klasyki do eksperymentów", "sezonowe kolekcje", "matcha year")
- Czy ta historia jest spójna? Czy prowadzi klienta przez ciekawy arc?
- Jak launche budują na sobie? (np. "matcha ceremonial → matcha latte → akcesoria do matchy" to synergia)
- Czy jest różnorodność kategorii, czy przeładowanie jednej?

═══════════════════════════════════════════
KROK 3: TWARDE REGUŁY TIMING'U
═══════════════════════════════════════════
- MAX 2 launche / miesiąc
- MIN 21 dni między launchami
- Produkty z TEJ SAMEJ kategorii → min 6 tygodni
- Nie wciskaj launchu w tydzień z dużą kampanią
- Lead time: min 2-3 tygodnie od dziś
- Fazy launchu (tease/pre-order/launch/follow-up) nie powinny kolidować między produktami

═══════════════════════════════════════════
KROK 4: PROPOZYCJA RESHUFFLA
═══════════════════════════════════════════
Dla KAŻDEGO aktywnego launchu zaproponuj:
- Optymalną datę (może się zmienić vs obecna, może zostać)
- Dlaczego ta data (w kontekście CAŁEGO portfolio, nie w izolacji)
- Kolejność: który powinien być PIERWSZY, a który OSTATNI — i dlaczego
- Synergie: co powinno nastąpić po czym żeby się wzmacniało

═══════════════════════════════════════════
KROK 5: REKOMENDACJE GLOBALNE
═══════════════════════════════════════════
- Czy widać "dziurę" w kalendarzu bez launchy? Może warto coś dodać?
- Czy jakaś kategoria jest nadreprezentowana?
- Jak to wpływa na obciążenie zespołu marketingu (mały zespół, max 1 duży launch naraz)?
- Ryzyka: co może pójść nie tak z tym układem?

═══════════════════════════════════════════
OUTPUT — WYŁĄCZNIE VALID JSON
═══════════════════════════════════════════
Bez markdown, bez code fences.

{
  "portfolio_summary": "<3-5 zdań: obecny stan portfolio, co jest dobrze, co źle>",
  "year_narrative": "<2-3 zdania: jaka narracja wyłania się z launchy i czy jest dobra>",
  "current_issues": ["<lista problemów z obecnym układem>"],
  "proposed_timeline": [
    {
      "launch_id": <number>,
      "launch_name": "<string>",
      "current_date": "<YYYY-MM-DD or null>",
      "proposed_date": "<YYYY-MM-DD>",
      "change": "keep|move_earlier|move_later|new_date",
      "order_in_sequence": <1-based number>,
      "rationale": "<dlaczego ta data, w kontekście CAŁEGO portfolio>",
      "synergies": "<jak ten launch wzmacnia lub przygotowuje inne>"
    }
  ],
  "launch_sequence_rationale": "<dlaczego taka kolejność a nie inna — story arc>",
  "global_recommendations": ["<strategiczne rekomendacje dla całego roku>"],
  "team_load_analysis": "<analiza obciążenia zespołu — kiedy peak, kiedy luz>",
  "risks": ["<ryzyka i jak je mitygować>"],
  "calendar_gaps": ["<miesiące bez launchy — czy warto je wypełnić>"]
}`;

    const userPrompt = `DZIŚ JEST ${todayIso}.

Przeanalizuj całe portfolio launchy Brown House & Tea i zaproponuj optymalny układ w czasie.

AKTYWNE LAUNCHE DO PRZEANALIZOWANIA:
${JSON.stringify(context.activeLaunches, null, 2)}

PEŁNY KONTEKST:
${JSON.stringify(context, null, 2)}

Patrz na CAŁOŚĆ — nie na każdy launch osobno. Zaproponuj reshuffl jeśli trzeba. Zwróć JSON.`;

    const client = new Anthropic({ apiKey });

    function extractJson(raw: string): string {
      let s = raw.trim().replace(/```json/gi, '').replace(/```/g, '').trim();
      const first = s.indexOf('{');
      const last = s.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
      return s;
    }

    const r = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 16000,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = r.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
    let parsed: any = null;
    try {
      parsed = JSON.parse(extractJson(text));
    } catch (e: any) {
      // Retry with shorter output
      try {
        const r2 = await client.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 8000,
          system: system + '\n\nUWAGA: poprzednia próba się nie sparsowała. Skróć global_recommendations i risks do max 3 pozycji każdy. TYLKO VALID JSON.',
          messages: [{ role: 'user', content: userPrompt + '\n\nZwięźle — max 3 items per array. Tylko JSON.' }],
        });
        const text2 = r2.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
        parsed = JSON.parse(extractJson(text2));
      } catch (e2: any) {
        return NextResponse.json({ error: 'AI nie zwrócił poprawnego JSON', raw: text.slice(0, 3000) }, { status: 502 });
      }
    }

    return NextResponse.json({ data: { review: parsed, launchCount: activeLaunches.length } });
  } catch (e: any) {
    console.error('[portfolio-review]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
