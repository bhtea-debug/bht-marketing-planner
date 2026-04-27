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
    try {
      const allLaunchesNow = await db.select().from(product_launches);
      const currentD2C = allLaunchesNow.filter((l: any) => {
        if (['launched', 'cancelled'].includes(l.status)) return false;
        let chans: string[] = [];
        try { chans = l.target_channels ? JSON.parse(l.target_channels) : []; } catch {}
        if (chans.length === 0) return true;
        // ONLY D2C (sklep) — Allegro launches nie wchodzą do strategii premier sklepu
        return chans.includes('d2c');
      }).length;
      if (Math.abs(currentD2C - (row.launch_count || 0)) >= 2) {
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

// POST /api/launches/portfolio-review — split into 2 sequential AI calls (A: analysis, B: recommendations)
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

    let allLaunches: any[] = [];
    try { allLaunches = await db.select().from(product_launches); } catch {}
    // D2C-ONLY portfolio: właściciel chce STRATEGII PREMIER W SKLEPIE.
    // Allegro launches mogą się powtarzać z D2C (to OK) ale ich timing nas nie interesuje.
    // Wyciągamy launche z D2C w target_channels (lub bez kanałów = legacy = traktuj jako D2C).
    const activeLaunches = allLaunches.filter(l => {
      if (['launched', 'cancelled'].includes(l.status)) return false;
      let chans: string[] = [];
      try { chans = l.target_channels ? JSON.parse(l.target_channels) : []; } catch {}
      // Legacy launche bez kanałów: traktuj jako D2C
      if (chans.length === 0) return true;
      // ONLY D2C (sklep) — Allegro/Rossmann/B2B/Export mają własne procesy
      return chans.includes('d2c');
    });
    if (activeLaunches.length < 2) {
      return NextResponse.json({ error: 'Potrzebujesz minimum 2 aktywnych launchy do analizy portfolio' }, { status: 400 });
    }

    let upcomingCampaigns: any[] = [];
    try { upcomingCampaigns = await db.select().from(campaigns).where(gte(campaigns.start_date, todayIso)); } catch {}
    const commerce = await buildWooSalesContext(30).catch(() => null);
    let brandData: any = null;
    try {
      const bpRows = await db.select().from(brand_profile).where(eq(brand_profile.id, 1)).limit(1);
      brandData = bpRows[0] || null;
    } catch {}
    let knowledgeEntries: any[] = [];
    try { knowledgeEntries = await db.select().from(planning_knowledge).where(eq(planning_knowledge.active, 1)); } catch {}
    let brainSections: any[] = [];
    try {
      const cached = await db.select().from(brain_cache).where(eq(brain_cache.kind, 'section'));
      brainSections = cached.map((c: any) => { try { return JSON.parse(c.payload_json); } catch { return null; } }).filter(Boolean);
    } catch {}
    let fullCatalog: any[] = [];
    try { fullCatalog = await getWooProducts().catch(() => []); } catch {}
    let previousReview: any = null;
    try {
      const prevRows = await db.select().from(portfolio_reviews).orderBy(desc(portfolio_reviews.updated_at)).limit(1);
      if (prevRows.length) { try { previousReview = JSON.parse(prevRows[0].review_json); } catch {} }
    } catch {}

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
        target_audience: l.target_audience || null,
        price_pln: l.price_pln || null,
        status: l.status,
        currentDate: l.planned_launch_date || l.ai_suggested_date || null,
        launch_type: l.launch_type || 'single',
      })),
      alreadyLaunchedThisYear: allLaunches.filter(l => l.status === 'launched').map(l => ({ name: l.name, category: l.category, date: l.planned_launch_date })),
      upcomingCampaigns: upcomingCampaigns.slice(0, 8).map(c => ({ name: c.name, start: c.start_date, end: c.end_date })),
      holidays,
      existingCatalog: fullCatalog.slice(0, 10).map((p: any) => ({ name: p.name, category: p.categories?.[0]?.name || 'uncategorized', price: p.price })),
      brandProfile: brandData ? {
        brand_name: brandData.brand_name,
        tone_of_voice: brandData.tone_of_voice,
        target_audience: brandData.target_audience,
        unique_selling_points: brandData.unique_selling_points,
      } : null,
      knowledgeEntries: knowledgeEntries.slice(0, 8).map(k => ({ category: k.category, content: k.content })),
      brainStrategy: brainSections.slice(0, 10).map((s: any) => ({
        module: s.module_slug,
        title: s.title,
        category: s.category || null,
        excerpt: typeof s.content === 'string' ? s.content.slice(0, 1200) : '',
      })),
      commerce: commerce?.configured ? { topProducts: commerce.topProducts?.slice(0, 10), slowProducts: commerce.slowProducts?.slice(0, 5) } : null,
    };

    const client = new Anthropic({ apiKey });

    // ════════════════════════════════════════════════════════════════
    // CALL A — ANALYSIS (portfolio_summary, narrative, issues, timeline, sequence_rationale)
    // ════════════════════════════════════════════════════════════════
    const systemA = `Jesteś CHIEF PRODUCT STRATEGIST dla Brown House & Tea — polskiego premium e-commerce z herbatą.

Dostajesz WSZYSTKIE aktywne launche D2C (sklep brownhouseandtea.pl) i pełny kontekst. Twoja rola w TEJ ANALIZIE: PRZEANALIZOWAĆ stan portfolio premier W SKLEPIE i zaproponować OPTYMALNY UKŁAD W CZASIE.

═══════════════════════════════════════════
ZAKRES: TYLKO SKLEP D2C
═══════════════════════════════════════════
Sklep (brownhouseandtea.pl) to NAJWAŻNIEJSZY kanał komunikacyjny BHT — NIE Allegro, NIE Rossmann.
Patrzymy na premiery W SKLEPIE — kiedy startują na D2C i jak to się składa w story arc roku.
Allegro/Rossmann/B2B/Eksport NIE wchodzą tu — mają własne procesy poza marketing plannerem.
Jeśli launch jest TEŻ na Allegro, OK — ale analizujemy go z perspektywy D2C timingu.

═══════════════════════════════════════════
KROK 1: AUDYT OBECNEGO STANU
═══════════════════════════════════════════
- Jakie kategorie produktów mamy w sklepie?
- Jakie launche są zaplanowane i kiedy?
- Konflikty: za dużo launchy w jednym miesiącu? Ta sama kategoria obok siebie? Przeładowanie?
- Jakie kampanie biegną? Jakie święta wykorzystać/unikać?

═══════════════════════════════════════════
KROK 2: STRATEGIA NARRACJI ROCZNEJ
═══════════════════════════════════════════
- Jaka HISTORIA wyłania się z launchy?
- Czy spójna? Czy prowadzi klienta przez ciekawy arc?
- Jak launche budują na sobie? (synergia)

═══════════════════════════════════════════
KROK 3: TWARDE REGUŁY TIMING'U
═══════════════════════════════════════════
- MAX 2 launche / miesiąc
- MIN 21 dni między launchami
- Ta sama kategoria → min 6 tygodni
- Lead time: min 2-3 tygodnie od dziś
- Nie wciskać launchu w tydzień z dużą kampanią

═══════════════════════════════════════════
KROK 4: PROPOZYCJA RESHUFFLA
═══════════════════════════════════════════
Dla KAŻDEGO aktywnego launchu (KAŻDY z activeLaunches MUSI być w proposed_timeline):
- Optymalna data, change (keep|move_earlier|move_later|new_date)
- Dlaczego ta data w kontekście CAŁEGO portfolio
- Order_in_sequence (1-based)
- Synergie: co po czym wzmacnia

REALIZM OPERACYJNY (twardy):
- 100% year-round, ZERO limitek (właściciel olał limitki)
- Aromaty 95%+ to STANDARD BHT (USP, nie nisza)
- Single-profession edition (np. "Pielęgniarka") = ZAKAZANE — zbyt wąskie segmenty
- First flush wszystkiego (Darjeeling/Assam) = ZAKAZANE — drogi import lotniczy nieopłacalny

UWZGLĘDNIJ uwagi właściciela (jeśli są) — to PRIORYTET NAJWYŻSZY.

OUTPUT: użyj tool emit_analysis. Każdy aktywny launch musi być w proposed_timeline.`;

    let userPromptA = `DZIŚ JEST ${todayIso}.

AKTYWNE LAUNCHE D2C (${activeLaunches.length} premier w sklepie — KAŻDA musi być w proposed_timeline):
${JSON.stringify(context.activeLaunches, null, 2)}

KONTEKST:
- Już wystartowane: ${context.alreadyLaunchedThisYear.length} launchów w tym roku
- Nadchodzące kampanie: ${context.upcomingCampaigns.length}
- Święta: ${(context.holidays || []).slice(0, 8).map((h: any) => h.name + ' ' + h.date).join(', ')}
- Brand voice: ${(context.brandProfile?.tone_of_voice || '').slice(0, 200)}
- Knowledge: ${(context.knowledgeEntries || []).slice(0, 5).map((k: any) => '[' + k.category + '] ' + k.content.slice(0, 150)).join(' / ')}
- Brain strategy: ${(context.brainStrategy || []).slice(0, 5).map((s: any) => s.title + ': ' + (s.excerpt || '').slice(0, 200)).join(' || ')}`;

    if (userComments.trim()) {
      userPromptA += `\n\n═══════════════════════════════════════════\nUWAGI WŁAŚCICIELA (PRIORYTET NAJWYŻSZY):\n═══════════════════════════════════════════\n${userComments}\n\nUWZGLĘDNIJ te uwagi w nowej propozycji. Wyjaśnij w rationale co zmieniłeś i dlaczego.`;
    }
    if (previousReview && userComments.trim()) {
      const safeArr = (v: any): any[] => {
        if (Array.isArray(v)) return v;
        if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
        return [];
      };
      const trimmedPrev = {
        portfolio_summary: typeof previousReview.portfolio_summary === 'string' ? previousReview.portfolio_summary.slice(0, 400) : '',
        proposed_timeline: safeArr(previousReview.proposed_timeline).slice(0, 12).map((t: any) => ({
          launch_id: t?.launch_id, launch_name: t?.launch_name, proposed_date: t?.proposed_date, change: t?.change,
        })),
      };
      userPromptA += `\n\nPOPRZEDNIA ANALIZA (skrót):\n${JSON.stringify(trimmedPrev, null, 2)}`;
    }

    const analysisTool = {
      name: 'emit_analysis',
      description: 'Emit portfolio analysis: summary, narrative, issues, timeline, sequence rationale',
      input_schema: {
        type: 'object',
        required: ['portfolio_summary', 'year_narrative', 'current_issues', 'proposed_timeline', 'launch_sequence_rationale'],
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
        },
      },
    };

    const rA = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      tools: [analysisTool],
      tool_choice: { type: 'tool', name: 'emit_analysis' },
      system: systemA,
      messages: [{ role: 'user', content: userPromptA }],
    });
    const tuA = rA.content.find((c: any) => c.type === 'tool_use' && c.name === 'emit_analysis');
    if (!tuA) {
      return NextResponse.json({ error: 'AI nie zwrócił analizy (Call A)', stop: rA.stop_reason }, { status: 502 });
    }
    let analysis: any = { ...tuA.input };
    // Normalize stringified arrays
    const arrayKeysA = ['current_issues', 'proposed_timeline'];
    for (const key of arrayKeysA) {
      const v = analysis[key];
      if (typeof v === 'string') {
        try { analysis[key] = JSON.parse(v); continue; } catch {}
        try { const cleaned = v.replace(/,(\s*[\]}])/g, '$1').replace(/'/g, '"'); analysis[key] = JSON.parse(cleaned); continue; } catch {}
        try { const m = v.match(/\[[\s\S]*\]/); if (m) { analysis[key] = JSON.parse(m[0]); continue; } } catch {}
        analysis[key] = [];
      }
    }

    // ════════════════════════════════════════════════════════════════
    // CALL B — RECOMMENDATIONS (team_load, global_recs, risks, gaps, suggested_products)
    // ════════════════════════════════════════════════════════════════
    const systemB = `Jesteś CHIEF PRODUCT STRATEGIST Brown House & Tea. Otrzymałeś już ANALIZĘ PORTFOLIO (timeline + issues). Teraz wykonujesz DRUGĄ CZĘŚĆ: rekomendacje strategiczne, ryzyka, luki w kalendarzu i propozycje NOWYCH produktów.

═══════════════════════════════════════════
DOPASOWANIE PRODUKT → KANAŁ SPRZEDAŻY
═══════════════════════════════════════════
BHT operuje na 8 kanałach. KAŻDA propozycja MUSI mieć target_channels:
1. **d2c** (sklep) — 6% obrotu, serce komunikacji. 90%+ launchów tu trafia.
2. **allegro** — komplementarny do D2C.
3. **rossmann_full** — 1820 sklepów. 3 nogi: matcha hero, funkcyjne wellness, smakowe premium 15-25 zł. NIE wchodzi: niche premium gyokuro, akcesoria, limited-edition.
4. **rossmann_test** — pilot nowych SKU.
5. **rossmann_amoya** — private label.
6. **b2b_premium** — Hurt+HoReCa. Pasuje: Matcha Lattea ZERO, iced lines, single-origin, akcesoria, zestawy.
7. **export** — DE/EU dystrybutorzy 2026.
8. **other_chains** — Spar/Intermarche/Super-Pharm/Bio Planet.

REGUŁY:
- Funkcyjne wellness (Focus/Hydration/ZERO) → d2c+rossmann_full+b2b_premium
- Premium niche (gyokuro/single-origin) → d2c+b2b_premium+export (NIE Rossmann)
- Smakowe owocowe → d2c+rossmann_full (premium pricing)+b2b_premium
- Akcesoria → d2c only
- Iced/cold brew → d2c+b2b_premium HoReCa (lato)

REALIZM OPERACYJNY (twardy):
- 100% year-round, ZERO limitek (właściciel olał limitki)
- Rossmann ceny: 15-25 zł na półce (max 30-40 zł justified)
- Aromaty 95%+ to STANDARD BHT (USP, nie nisza, NIE drogi)
- Single-profession edition (np. Pielęgniarka) = ZAKAZANE
- First flush wszystkiego (Darjeeling/Assam) = ZAKAZANE — drogi import lotniczy
- 2-5 propozycji NOWYCH produktów (wypełniają luki, wzmacniają portfolio)

═══════════════════════════════════════════
ZAKRES TEJ CZĘŚCI
═══════════════════════════════════════════
- team_load_analysis: kiedy peak, kiedy luz (mały zespół, max 1 duży launch naraz)
- global_recommendations: 4-8 strategicznych rekomendacji dla całego roku
- risks: 3-6 ryzyk i jak mitygować
- calendar_gaps: miesiące bez launchów + czy warto wypełnić
- suggested_products: 2-5 NOWYCH propozycji z full metadata

OUTPUT: użyj tool emit_recommendations.`;

    // Compact analysis context for Call B (no full timeline content, just key facts)
    const compactTimeline = (Array.isArray(analysis.proposed_timeline) ? analysis.proposed_timeline : []).map((t: any) => ({
      id: t.launch_id, name: t.launch_name, date: t.proposed_date, change: t.change,
    }));
    let userPromptB = `DZIŚ JEST ${todayIso}.

ANALIZA PORTFOLIO (z poprzedniego kroku):
- Summary: ${(analysis.portfolio_summary || '').slice(0, 600)}
- Narrative: ${(analysis.year_narrative || '').slice(0, 400)}
- Issues: ${(Array.isArray(analysis.current_issues) ? analysis.current_issues : []).slice(0, 6).join(' | ')}
- Sequence rationale: ${(analysis.launch_sequence_rationale || '').slice(0, 500)}

TIMELINE (${compactTimeline.length} launchów po reshuffle):
${JSON.stringify(compactTimeline, null, 2)}

KONTEKST UZUPEŁNIAJĄCY:
- Aktywne launche surowe: ${context.activeLaunches.length} szt
- Już wystartowane: ${context.alreadyLaunchedThisYear.length}
- Święta: ${(context.holidays || []).slice(0, 8).map((h: any) => h.name + ' ' + h.date).join(', ')}
- Katalog Woo: ${(context.existingCatalog || []).slice(0, 10).map((p: any) => p.name).join(', ')}
- Brain strategy: ${(context.brainStrategy || []).slice(0, 5).map((s: any) => s.title + ': ' + (s.excerpt || '').slice(0, 180)).join(' || ')}
- Knowledge: ${(context.knowledgeEntries || []).slice(0, 6).map((k: any) => '[' + k.category + '] ' + k.content.slice(0, 120)).join(' / ')}`;

    if (userComments.trim()) {
      userPromptB += `\n\nUWAGI WŁAŚCICIELA (PRIORYTET): ${userComments}`;
    }
    userPromptB += `\n\nNa bazie powyższej analizy: zaproponuj rekomendacje, ryzyka, luki, NOWE produkty. Użyj tool emit_recommendations.`;

    const recsTool = {
      name: 'emit_recommendations',
      description: 'Emit strategic recommendations, risks, calendar gaps, and new product suggestions',
      input_schema: {
        type: 'object',
        required: ['team_load_analysis', 'global_recommendations', 'risks', 'calendar_gaps', 'suggested_products'],
        properties: {
          team_load_analysis: { type: 'string' },
          global_recommendations: { type: 'array', items: { type: 'string' } },
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

    const rB = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 6000,
      tools: [recsTool],
      tool_choice: { type: 'tool', name: 'emit_recommendations' },
      system: systemB,
      messages: [{ role: 'user', content: userPromptB }],
    });
    const tuB = rB.content.find((c: any) => c.type === 'tool_use' && c.name === 'emit_recommendations');
    if (!tuB) {
      // Don't fail the whole request — save partial result with empty recommendations
      console.warn('[portfolio-review] Call B failed', rB.stop_reason);
    }
    let recs: any = tuB ? { ...tuB.input } : { team_load_analysis: '', global_recommendations: [], risks: [], calendar_gaps: [], suggested_products: [] };
    const arrayKeysB = ['global_recommendations', 'risks', 'calendar_gaps', 'suggested_products'];
    for (const key of arrayKeysB) {
      const v = recs[key];
      if (typeof v === 'string') {
        try { recs[key] = JSON.parse(v); continue; } catch {}
        try { const cleaned = v.replace(/,(\s*[\]}])/g, '$1').replace(/'/g, '"'); recs[key] = JSON.parse(cleaned); continue; } catch {}
        try { const m = v.match(/\[[\s\S]*\]/); if (m) { recs[key] = JSON.parse(m[0]); continue; } } catch {}
        recs[key] = [];
      }
    }

    // ════════════════════════════════════════════════════════════════
    // MERGE & SAVE
    // ════════════════════════════════════════════════════════════════
    const parsed = {
      portfolio_summary: analysis.portfolio_summary || '',
      year_narrative: analysis.year_narrative || '',
      current_issues: Array.isArray(analysis.current_issues) ? analysis.current_issues : [],
      proposed_timeline: Array.isArray(analysis.proposed_timeline) ? analysis.proposed_timeline : [],
      launch_sequence_rationale: analysis.launch_sequence_rationale || '',
      global_recommendations: Array.isArray(recs.global_recommendations) ? recs.global_recommendations : [],
      team_load_analysis: recs.team_load_analysis || '',
      risks: Array.isArray(recs.risks) ? recs.risks : [],
      calendar_gaps: Array.isArray(recs.calendar_gaps) ? recs.calendar_gaps : [],
      suggested_products: Array.isArray(recs.suggested_products) ? recs.suggested_products : [],
    };

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
        debug: { callA_stop: rA.stop_reason, callB_stop: rB.stop_reason, callB_ok: !!tuB },
      },
    });
  } catch (e: any) {
    console.error('[portfolio-review]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
