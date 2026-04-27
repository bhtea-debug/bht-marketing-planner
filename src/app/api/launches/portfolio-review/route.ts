// @ts-nocheck
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { product_launches, campaigns, brand_profile, planning_knowledge, portfolio_reviews, brain_cache } from '@/db/schema';
import { gte, eq, desc } from 'drizzle-orm';
import { buildWooSalesContext } from '@/lib/woo-api';
import { getWooProducts } from '@/lib/woo-api';
import { ensurePortfolioReviews } from '@/lib/ensure-tables';

// GET /api/launches/portfolio-review — load latest saved review (auto-invalidates if pipeline changed by >2 launches)
export async function GET() {
  try {
    await ensurePortfolioReviews();
    const rows = await db.select().from(portfolio_reviews).orderBy(desc(portfolio_reviews.updated_at)).limit(1);
    if (!rows.length) return NextResponse.json({ data: null });
    const row = rows[0];

    // Auto-invalidate stale cache: if current D2C/Allegro pipeline differs significantly from cached count, return null
    try {
      const allLaunchesNow = await db.select().from(product_launches);
      const currentD2C = allLaunchesNow.filter((l: any) => {
        if (['launched', 'cancelled'].includes(l.status)) return false;
        let chans: string[] = [];
        try { chans = l.target_channels ? JSON.parse(l.target_channels) : []; } catch {}
        if (chans.length === 0) return true;
        return chans.includes('d2c') || chans.includes('allegro');
      }).length;
      if (Math.abs(currentD2C - (row.launch_count || 0)) >= 2) {
        // Stale by 2+ launches — pretend no review so UI prompts regeneration
        return NextResponse.json({ data: null, stale: true, cachedCount: row.launch_count, currentCount: currentD2C });
      }
    } catch {}

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

    // Only D2C/Allegro launches enter marketing portfolio analysis (B2B/Rossmann/Eksport have separate processes)
    const activeLaunches = allLaunches.filter(l => {
      if (['launched', 'cancelled'].includes(l.status)) return false;
      let chans: string[] = [];
      try { chans = l.target_channels ? JSON.parse(l.target_channels) : []; } catch {}
      // Legacy launches without target_channels: assume D2C-eligible (backwards compat)
      if (chans.length === 0) return true;
      return chans.includes('d2c') || chans.includes('allegro');
    });
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
    // Brain — read-only company strategy from BH&T Brain knowledge base
    let brainSections: any[] = [];
    try {
    const cached = await db.select().from(brain_cache).where(eq(brain_cache.kind, 'section'));
    brainSections = cached
      .map((c: any) => { try { return JSON.parse(c.payload_json); } catch { return null; } })
      .filter(Boolean);
    } catch {}

    
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
      upcomingCampaigns: upcomingCampaigns.slice(0, 8).map(c => ({
        name: c.name, start: c.start_date, end: c.end_date,
      })),
      holidays,
      existingCatalog: fullCatalog.slice(0, 10).map((p: any) => ({
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
      knowledgeEntries: knowledgeEntries.slice(0, 8).map(k => ({
        category: k.category, content: k.content,
      })),
      brainStrategy: brainSections.slice(0, 10).map((s: any) => ({
        module: s.module_slug,
        title: s.title,
        category: s.category || null,
        excerpt: typeof s.content === 'string' ? s.content.slice(0, 1200) : '',
      })),
      commerce: commerce?.configured ? {
        topProducts: commerce.topProducts?.slice(0, 10),
        slowProducts: commerce.slowProducts?.slice(0, 5),
      } : null,
    };

    const system = `Jesteś CHIEF PRODUCT STRATEGIST dla Brown House & Tea — polskiego premium e-commerce z herbatą.

Dostajesz WSZYSTKIE aktywne launche (planowane, w rozwoju, gotowe) i pełny kontekst: katalog sklepu, kampanie, święta, brand profile. Twoja rola: PRZEANALIZOWAĆ PORTFOLIO LAUNCHY D2C/ALLEGRO RAZEM (tylko sklep i Allegro — Rossmann/B2B/Eksport mają własne procesy poza marketing plannerem) i zaproponować OPTYMALNY UKŁAD W CZASIE oraz NOWE PRODUKTY które wypełniają luki — KAŻDY z dopasowaniem do kanałów sprzedaży BHT.

═══════════════════════════════════════════
DOPASOWANIE PRODUKT → KANAŁ SPRZEDAŻY (KAŻDA propozycja MUSI mieć target_channels)
═══════════════════════════════════════════
BHT operuje na 7 kanałach — KAŻDY ma inny portfel:

1. **d2c** (sklep brownhouseandtea.pl) — 6% obrotu, NIE motor wzrostu, ale serce komunikacji. Pełna oferta 4-warstwowa: matcha hero (6 SKU) + funkcyjne wellness Core + smakowe Core + smakowe Extended. **Praktycznie KAŻDY launch tu trafia (90%+).** Wyjątek: produkty stricte B2B (1kg+ packaging).
2. **allegro** — komplementarny do D2C.
3. **rossmann_full** — 1820 sklepów. TRZY nogi portfolio: matcha hero (Premium Japan, Lattea, Focus, Crazy Good), funkcyjne wellness (Hydration, ZERO), smakowe premium (Strawberry Lemonade, Caramel Pear, Raspberry Rose). **NIE wchodzi:** niche premium gyokuro/single-origin, akcesoria, limited-edition prestige.
4. **rossmann_test** — test 100-200 sklepów dla nowych SKU.
5. **rossmann_amoya** — private label (Amo'ya, NIE BHT). Wydzielony.
6. **b2b_premium** — Hurt + HoReCa. Klient: kawiarnie, hotele, sklepy prezentowe. **Pasuje:** Matcha Lattea ZERO, iced lines, premium single-origin, akcesoria, zestawy prezentowe. **Słabo pasuje:** limited-edition single SKU.
7. **export** — DE/EU dystrybutorzy. Pilotaż 2026. Najmocniejsze: Matcha Premium Japan, single-origin, premium niche.
8. **other_chains** — Spar, Intermarche, Super-Pharm, Bio Planet (noga 2 dywersyfikacji).

REGUŁY DOPASOWANIA (zastosuj do KAŻDEJ propozycji w suggested_products):
- Funkcyjne wellness (Focus, Hydration, ZERO) → d2c + rossmann_full + b2b_premium (3 kanały)
- Premium niche (gyokuro, single-origin) → d2c + b2b_premium + export (NIE Rossmann)
- Smakowe owocowe → d2c + rossmann_full (jeśli premium pricing) + b2b_premium (sklepy prezentowe)
- Akcesoria (chasen, chawan) → d2c only (Rossmann nie sprzeda akcesoriów)
- Iced/cold brew → d2c + b2b_premium HoReCa (lato)
- Limited edition / advent → d2c + b2b_premium (zestawy prezentowe)
- Linie smakowe → rossmann_full (3 SKU jako noga) + d2c (pełna kolekcja)
- Zestawy → d2c + b2b_premium

LUKA W KANALE = silny sygnał. Jeśli Rossmann ma za mało SKU w "funkcyjnych wellness" — zaproponuj produkt funkcyjny pasujący do tej nogi.
PAMIĘTAJ: tylko launche z d2c lub allegro wchodzą do PLANU MARKETINGOWEGO. Pozostałe (rossmann/b2b/export) są tracked ale nie marketingowane przez planera.

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
KROK 7: ANALIZA POKRYCIA KANAŁÓW SPRZEDAŻY
═══════════════════════════════════════════
- Spójrz na obecne launche + ich target_channels (jeśli są).
- Pytanie: czy wszystkie 7 kanałów ma sensowny pipeline na 2026?
- Rossmann pełna dystrybucja: ile mam SKU? (cel: 3 nogi × 1-3 SKU)
- B2B HoReCa: czy mam Matcha Lattea ZERO? Iced lines? (Q2 priorytet)
- Eksport DE: czy Matcha Premium Japan w pipeline?
- Każda LUKA W KANALE = potencjalna propozycja w suggested_products.
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
      "estimated_price_range_pln": [null, null],
      "target_channels": ["<lista kanałów sprzedaży: d2c, allegro, rossmann_full, rossmann_test, rossmann_amoya, b2b_premium, export, other_chains>"],
      "channel_rationale": "<1-2 zdania: dlaczego TE kanały. Jeśli D2C wykluczone, wytłumacz. Jakie kanały NIE pasują i dlaczego.>"
    }
  ]
}`;

    let userPrompt = `DZIŚ JEST ${todayIso}.

Przeanalizuj całe portfolio launchy Brown House & Tea i zaproponuj optymalny układ w czasie.

AKTYWNE LAUNCHE DO PRZEANALIZOWANIA:
${JSON.stringify(context.activeLaunches, null, 2)}

POMOCNICZY KONTEKST (skrócony):
- Już wystartowane: ${context.alreadyLaunchedThisYear.length} launchów w tym roku
- Nadchodzące kampanie: ${context.upcomingCampaigns.length}
- Święta w obrocie: ${(context.holidays || []).slice(0, 8).map((h: any) => h.name + ' ' + h.date).join(', ')}
- Katalog Woo (sample): ${(context.existingCatalog || []).slice(0, 15).map((p: any) => p.name).join(', ')}
- Brand voice: ${(context.brandProfile?.tone_of_voice || '').slice(0, 200)}
- Knowledge: ${(context.knowledgeEntries || []).slice(0, 5).map((k: any) => '[' + k.category + '] ' + k.content.slice(0, 150)).join(' / ')}
- Brain strategy: ${(context.brainStrategy || []).slice(0, 5).map((s: any) => s.title + ': ' + (s.excerpt || '').slice(0, 200)).join(' || ')}

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
      // Trim previousReview to essentials — full JSON makes prompt 2x bigger
      const trimmedPrev = {
        portfolio_summary: previousReview.portfolio_summary?.slice(0, 500),
        year_narrative: previousReview.year_narrative?.slice(0, 500),
        current_issues: previousReview.current_issues?.slice(0, 5),
        proposed_timeline: (previousReview.proposed_timeline || []).slice(0, 10).map((t: any) => ({
          launch_id: t.launch_id, launch_name: t.launch_name, proposed_date: t.proposed_date, change: t.change,
        })),
      };
      userPrompt += `\n\nPOPRZEDNIA ANALIZA (skrócona, do porównania):\n${JSON.stringify(trimmedPrev, null, 2)}\n\nPorównaj swoją nową propozycję z poprzednią — wskaż CO ZMIENIŁEŚ i dlaczego na podstawie uwag użytkownika.`;
    }

    const client = new Anthropic({ apiKey });

    function extractJson(raw: string): string {
      let s = raw.trim().replace(/```json/gi, '').replace(/```/g, '').trim();
      const first = s.indexOf('{');
      const last = s.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
      return s;
    }

    // Use tool_use API for robust structured output (no JSON parsing issues)
    const portfolioTool = {
      name: 'emit_portfolio_review',
      description: 'Emit portfolio analysis results',
      input_schema: {
        type: 'object',
        required: ['portfolio_summary', 'year_narrative', 'current_issues', 'proposed_timeline', 'global_recommendations'],
        properties: {
          portfolio_summary: { type: 'string' },
          year_narrative: { type: 'string' },
          current_issues: { type: 'array', items: { type: 'string' } },
          proposed_timeline: {
            type: 'array',
            items: {
              type: 'object',
              required: ['launch_id', 'launch_name', 'current_date', 'proposed_date', 'change', 'order_in_sequence', 'rationale'],
              properties: {
                launch_id: { type: 'integer' },
                launch_name: { type: 'string' },
                current_date: { type: 'string' },
                proposed_date: { type: 'string' },
                change: { type: 'string', enum: ['keep', 'move_earlier', 'move_later', 'new_date'] },
                order_in_sequence: { type: 'integer' },
                rationale: { type: 'string' },
                synergies: { type: 'string' },
              },
            },
          },
          launch_sequence_rationale: { type: 'string' },
          global_recommendations: { type: 'array', items: { type: 'string' } },
          team_load_analysis: { type: 'string' },
          risks: { type: 'array', items: { type: 'string' } },
          calendar_gaps: { type: 'array', items: { type: 'string' } },
          suggested_products: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'category', 'short_pitch', 'suggested_month', 'priority'],
              properties: {
                name: { type: 'string' },
                category: { type: 'string' },
                short_pitch: { type: 'string' },
                suggested_month: { type: 'string' },
                month_rationale: { type: 'string' },
                portfolio_fit: { type: 'string' },
                priority: { type: 'string', enum: ['must_have', 'nice_to_have', 'future'] },
                estimated_price_range_pln: { type: 'array', items: { type: 'number' } },
                target_channels: { type: 'array', items: { type: 'string' } },
                channel_rationale: { type: 'string' },
              },
            },
          },
        },
      },
    };

    const r = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 12000,
      tools: [portfolioTool],
      tool_choice: { type: 'tool', name: 'emit_portfolio_review' },
      system,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const tu = r.content.find((c: any) => c.type === 'tool_use' && c.name === 'emit_portfolio_review');
    if (!tu) {
      return NextResponse.json({ error: 'AI nie zwrócił tool_use', stop: r.stop_reason }, { status: 502 });
    }
    let parsed: any = { ...tu.input };
    // Normalize stringified arrays (Sonnet sometimes does this for complex arrays)
    for (const key of ['current_issues', 'proposed_timeline', 'global_recommendations', 'risks', 'calendar_gaps', 'suggested_products']) {
      if (typeof parsed[key] === 'string') {
        try { parsed[key] = JSON.parse(parsed[key]); } catch {}
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
