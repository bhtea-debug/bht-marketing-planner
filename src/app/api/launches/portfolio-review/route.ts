// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { product_launches, campaigns, brand_profile, planning_knowledge, portfolio_reviews } from '@/db/schema';
import { gte, eq, desc } from 'drizzle-orm';
import { buildWooSalesContext } from '@/lib/woo-api';
import { getWooProducts } from '@/lib/woo-api';
import { ensurePortfolioReviews } from '@/lib/ensure-tables';

// GET /api/launches/portfolio-review — load latest saved review
export async function GET() {
  try {
    await ensurePortfolioReviews();
    const rows = await db.select().from(portfolio_reviews).orderBy(desc(portfolio_reviews.updated_at)).limit(1);
    if (!rows.length) return NextResponse.json({ data: null });
    const row = rows[0];
    let review = null;
    try { review = JSON.parse(row.review_json); } catch {}
    return NextResponse.json({
      data: {
        id: row.id,
        review,
        user_comments: row.user_comments || '',
        launch_count: row.launch_count,
        version: row.version,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/launches/portfolio-review
// Body: { user_comments?: string }
// Analyzes ALL planned launches together, saves result, returns review
export async function POST(req: NextRequest) {
  try {
    await ensurePortfolioReviews();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const userComments: string = body.user_comments || '';

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    // Fetch all launches
    let allLaunches: any[] = [];
    try { allLaunches = await db.select().from(product_launches); } catch {}

    const activeLaunches = allLaunches.filter(l => !['launched', 'cancelled'].includes(l.status));
    if (activeLaunches.length < 2) {
      return NextResponse.json({ error: 'Potrzebujesz minimum 2 aktywnych launchy do analizy portfolio' }, { status: 400 });
    }

    // Existing campaigns
    let upcomingCampaigns: any[] = [];
    try { upcomingCampaigns = await db.select().from(campaigns).where(gte(campaigns.start_date, todayIso)); } catch {}

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
    try { knowledgeEntries = await db.select().from(planning_knowledge).where(eq(planning_knowledge.active, 1)); } catch {}

    // Full product catalog
    let fullCatalog: any[] = [];
    try { fullCatalog = await getWooProducts().catch(() => []); } catch {}

    // Previous review for context
    let previousReview: any = null;
    try {
      const prevRows = await db.select().from(portfolio_reviews).orderBy(desc(portfolio_reviews.updated_at)).limit(1);
      if (prevRows.length) {
        try { previousReview = JSON.parse(prevRows[0].review_json); } catch {}
      }
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
KROK 6: PRODUKTY UZUPEŁNIAJĄCE (SUGESTIE)
═══════════════════════════════════════════
Na bazie CAŁEJ analizy zaproponuj 2-5 NOWYCH produktów/linii, które:
- Wypełniają LUKI w portfolio (brakująca kategoria, sezon bez launchu)
- Wzmacniają istniejące launche (akcesoria, complementary products)
- Wykorzystują wolne sloty w kalendarzu
- Pasują do narracji marki i brand profile
- Są realistyczne dla premium e-commerce z herbatą

Dla każdej sugestii podaj:
- Konkretną nazwę produktu/linii (kreatywną, w stylu marki)
- Kategorię i krótki pitch
- Sugerowany miesiąc launchu (i dlaczego właśnie wtedy)
- Jak wpisuje się w portfolio (jaką lukę wypełnia, co wzmacnia)
- Priorytet: "must_have" (pilna luka), "nice_to_have" (wzmocnienie), "future" (długoterminowo)

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
  "calendar_gaps": ["<miesiące bez launchy — czy warto je wypełnić>"],
  "suggested_products": [
    {
      "name": "<kreatywna nazwa produktu/linii>",
      "category": "<kategoria: matcha|herbata_owocowa|herbata_czarna|herbata_zielona|cold_brew|akcesoria|herbata_deserowa|herbata_funkcjonalna|zestaw|limitowana_edycja>",
      "short_pitch": "<1-2 zdania: co to, dla kogo, czym się wyróżnia>",
      "suggested_month": "<YYYY-MM>",
      "month_rationale": "<dlaczego ten miesiąc — sezon, luka, synergia>",
      "portfolio_fit": "<jaką lukę wypełnia, co wzmacnia w istniejącym portfolio>",
      "priority": "must_have|nice_to_have|future",
      "estimated_price_range_pln": [null, null]
    }
  ]
}`;

    let userPrompt = `DZIŚ JEST ${todayIso}.

Przeanalizuj całe portfolio launchy Brown House & Tea i zaproponuj optymalny układ w czasie.

AKTYWNE LAUNCHE DO PRZEANALIZOWANIA:
${JSON.stringify(context.activeLaunches, null, 2)}

PEŁNY KONTEKST:
${JSON.stringify(context, null, 2)}

Patrz na CAŁOŚĆ — nie na każdy launch osobno. Zaproponuj reshuffl jeśli trzeba. Zwróć JSON.`;

    // Inject user comments and previous review for re-analysis
    if (userComments.trim()) {
      userPrompt += `\n\n═══════════════════════════════════════════
UWAGI WŁAŚCICIELA (PRIORYTET NAJWYŻSZY):
═══════════════════════════════════════════
${userComments}

Właściciel dał Ci feedback do poprzedniej analizy. UWZGLĘDNIJ te uwagi w nowej propozycji. Wyjaśnij w rationale co zmieniłeś i dlaczego na podstawie tych uwag.`;
    }

    if (previousReview && userComments.trim()) {
      userPrompt += `\n\nPOPRZEDNIA ANALIZA (do porównania):
${JSON.stringify(previousReview, null, 2)}

Porównaj swoją nową propozycję z poprzednią i wyraźnie opisz CO SIĘ ZMIENIŁO i DLACZEGO.`;
    }

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

    // Save to DB — find existing or create new
    const now = new Date().toISOString();
    let savedId: number;
    let version = 1;

    const existing = await db.select().from(portfolio_reviews).orderBy(desc(portfolio_reviews.updated_at)).limit(1);
    if (existing.length) {
      version = (existing[0].version || 0) + 1;
      await db.update(portfolio_reviews).set({
        review_json: JSON.stringify(parsed),
        user_comments: userComments || existing[0].user_comments || null,
        launch_count: activeLaunches.length,
        version,
        updated_at: now,
      }).where(eq(portfolio_reviews.id, existing[0].id));
      savedId = existing[0].id;
    } else {
      const ins = await db.insert(portfolio_reviews).values({
        review_json: JSON.stringify(parsed),
        user_comments: userComments || null,
        launch_count: activeLaunches.length,
        version: 1,
        created_at: now,
        updated_at: now,
      });
      savedId = Number(ins.lastInsertRowid);
    }

    return NextResponse.json({
      data: {
        id: savedId,
        review: parsed,
        launchCount: activeLaunches.length,
        version,
        user_comments: userComments,
      },
    });
  } catch (e: any) {
    console.error('[portfolio-review]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
