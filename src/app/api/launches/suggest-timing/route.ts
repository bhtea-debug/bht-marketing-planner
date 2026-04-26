// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { product_launches, campaigns, brand_profile, planning_knowledge, brain_cache } from '@/db/schema';
import { gte, eq } from 'drizzle-orm';
import { buildWooSalesContext } from '@/lib/woo-api';
import { getWooProducts } from '@/lib/woo-api';

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

    // Brand profile — tone, values, differentiation
    let brandData: any = null;
    try {
      const bpRows = await db.select().from(brand_profile).where(eq(brand_profile.id, 1)).limit(1);
      brandData = bpRows[0] || null;
    } catch {}

    // Brain channel-strategy sections — channel/product fit knowledge
    let channelStrategy: any[] = [];
    try {
      const sec = await db.select().from(brain_cache).where(eq(brain_cache.kind, 'section'));
      channelStrategy = sec
        .map((c: any) => { try { return JSON.parse(c.payload_json); } catch { return null; } })
        .filter(Boolean)
        .filter((s: any) => {
          const t = (s.title || '').toLowerCase();
          // Pull only sections about channels (definition, strategy per channel, mapping)
          return /1\.5|kana[lł]|d2c|rossmann|b2b|hurt|horeca|amo'?ya|allegro|pipeline launch|priorytety/.test(t);
        })
        .map((s: any) => ({ title: s.title, content: typeof s.content === 'string' ? s.content.slice(0, 1500) : '' }))
        .slice(0, 12);
    } catch {}

    // Planning knowledge base — accumulated AI insights
    let knowledgeEntries: any[] = [];
    try {
      knowledgeEntries = await db.select().from(planning_knowledge).where(eq(planning_knowledge.active, 1));
    } catch {}

    // Full product catalog for portfolio context
    let fullCatalog: any[] = [];
    try {
      fullCatalog = await getWooProducts().catch(() => []);
    } catch {}

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
        category: l.category || 'unknown',
        short_pitch: l.short_pitch || null,
        target_audience: l.target_audience || null,
        plannedDate: l.planned_launch_date || l.ai_suggested_date,
        status: l.status,
      })),
      holidaysAhead: allHolidays,
      commerce: commerce && commerce.configured ? commerce : null,
      // Brand identity for strategic alignment
      brandProfile: brandData ? {
        brand_name: brandData.brand_name,
        tone_of_voice: brandData.tone_of_voice,
        target_audience: brandData.target_audience,
        unique_selling_points: brandData.unique_selling_points,
        values: brandData.values,
      } : null,
      // Accumulated knowledge base
      knowledgeEntries: knowledgeEntries.slice(0, 30).map(k => ({
        category: k.category,
        content: k.content,
      })),
      // Full product catalog — what's already in the store
      existingCatalog: fullCatalog.slice(0, 50).map((p: any) => ({
        name: p.name,
        category: p.categories?.[0]?.name || 'uncategorized',
        price: p.price,
        status: p.status,
      })),
    };

    const system = `Jesteś CHIEF PRODUCT STRATEGIST dla Brown House & Tea — polskiego premium e-commerce z herbatą i akcesoriami.

NIE JESTEŚ prostym "date picker". Twoja rola to STRATEGICZNE MYŚLENIE o całym portfolio, narracji marki i ścieżce klienta. Każdy launch musi mieć sens w kontekście CAŁOŚCI — nie w izolacji.

═══════════════════════════════════════════
§0. ROZPOZNANIE TYPU LAUNCHU
═══════════════════════════════════════════
- "single" = jeden SKU → szybko, ostro, jeden hero hook
- "product_line" = cała linia/kolekcja → szerszy plan, tease/reveal, staggered reveal możliwy

═══════════════════════════════════════════
§1. ANALIZA PORTFOLIO (ZANIM COKOLWIEK ZAPROPONUJESZ)
═══════════════════════════════════════════
Przeanalizuj existingCatalog + otherPlannedLaunches i odpowiedz sobie:
a) MAPA KATEGORII: jakie kategorie już mamy w sklepie? (matcha, herbata owocowa, czarna, zielona, akcesoria, cold brew, etc.) Ile SKU per kategoria?
b) LUKI W PORTFOLIO: czego BRAKUJE? Nowy produkt wypełnia lukę czy duplikuje istniejącą kategorię?
c) NARRACJA MARKI NA TEN ROK: jaką "historię" opowiadają dotychczasowe launche? (np. "rok matchy" vs "rok eksploracji smaków" vs "sezonowe kolekcje")
d) KALENDARZ LAUNCHY: rozpisz per miesiąc — ile launchy, jakie kategorie, jakie audience. Znajdź DZIURY i PRZEŁADOWANIA.
e) KANIBALIZACJA: czy nowy produkt odbierze sprzedaż istniejącemu? Ten sam segment cenowy? Ta sama okazja użycia?
f) SYNERGIA: czy nowy produkt może WZMOCNIĆ istniejące (np. "akcesoria do matchy" po launchu matchy)?
g) OBCIĄŻENIE MARKETINGU: ile kampanii/launchy już jest w danym okresie? Mały zespół nie może prowadzić 3 launche naraz.

═══════════════════════════════════════════
§1.5. DOPASOWANIE PRODUKT → KANAŁ SPRZEDAŻY (KLUCZOWE!)
═══════════════════════════════════════════
BHT operuje na 7 kanałach sprzedażowych — KAŻDY ma inny portfel, inną cenę, inną komunikację:

1. **rossmann_full** — pełna dystrybucja Rossmanna (1820 sklepów). Trzy nogi: matcha hero + funkcyjne wellness + smakowe premium. Klient drogerii: kupuje konkretną obietnicę, cena średnia, format: 50g/100g standard.
2. **rossmann_test** — test 100-200 sklepów, incubator dla nowych SKU przed pełną.
3. **rossmann_amoya** — private label (powrót Q4 2026, marka Amo'ya, NIE BHT). Wydzielony.
4. **d2c** — sklep brownhouseandtea.pl + Allegro. Pełna oferta 4-warstwowa: hero matcha (6 SKU) + funkcyjne wellness Core + smakowe Core + smakowe Extended. Komunikacja marki, retencja fanów. NIE motor wzrostu, ale serce komunikacji. **TYLKO TEN KANAŁ wchodzi do planu marketingowego.**
5. **allegro** — komplementarny do D2C, pełna oferta z subset bestsellers.
6. **b2b_premium** — Hurt + HoReCa razem. Klient: kawiarnie specialty, hotele butikowe, sklepy internetowe, firmy prezentowe. Mix wszystkich kategorii. Pojemność hurt > kg. Cena B2B (60-70% retail). Pilotaż H2 2026: kawiarnie WAW/KRK/WRO + Matcha Lattea ZERO + iced lines.
7. **export** — dystrybutorzy DE/EU. Pilotaż 2026 (8 klientów DE = szum, ale specialty tea EU). Najmocniejsze: Matcha Premium Japan, Single-origin.
8. **other_chains** — Spar, Intermarche, Super-Pharm, Bio Planet (noga 2 dywersyfikacji).

REGUŁY DOPASOWANIA:
- Funkcyjne wellness (Focus, Hydration, ZERO) → Rossmann pełna + D2C + B2B (3 kanały)
- Premium niche (gyokuro, single-origin) → D2C + B2B + export (NIE Rossmann — drogeria nie ten klient)
- Smakowe owocowe → D2C + Rossmann (jeśli premium pricing) + B2B (sklepy prezentowe)
- Akcesoria (chasen, chawan) → D2C only (Rossmann nie sprzeda)
- Iced/cold brew → D2C + B2B HoReCa (lato)
- Limited edition / advent → D2C + B2B (zestawy prezentowe)
- Linie smakowe → Rossmann full (3 SKU jako noga) + D2C jako pełna kolekcja

JAK WYBRAĆ target_channels:
- LUKA W KANALE (jeśli kanał ma za mało SKU w danej kategorii) → +1 punkt
- PRICING FIT (czy nasza cena działa w tym kanale) → MUSI być ok
- KLIENT FIT (czy persona kanału kupi) → MUSI być ok
- ZASTOSUJ regułę: NIE wszystkie launche idą do Rossmanna. NIE wszystkie idą do B2B. ALE D2C dostaje praktycznie WSZYSTKO bo to "pełna oferta polskiego specjalisty".

═══════════════════════════════════════════
§2. TWARDE REGUŁY SPACING'U (OBOWIĄZKOWE)
═══════════════════════════════════════════
- MAX 2 launche / miesiąc kalendarzowy. Jeśli miesiąc ma 2+ → PRZESUŃ.
- MIN 21 dni odstępu między launchami.
- Produkty z TEJ SAMEJ KATEGORII → min 6 tygodni odstępu (kanibalizacja).
- Produkty na TĘ SAMĄ AUDIENCE → min 4 tygodnie.
- Sezonowość sugeruje pełny miesiąc → przesuń na najbliższy wolny slot.
- W rationale ZAWSZE: "Miesiąc X ma Y launchy: [lista]. Przesuwam na Z bo..."

═══════════════════════════════════════════
§3. OPTYMALNA DATA
═══════════════════════════════════════════
Uwzględnij:
- Sezonowość kategorii (cold brew → maj-czerwiec, gorące → październik-luty, deserowe → cały rok z peakiem wiosna)
- Święta z holidaysAhead (synergia LUB świadome unikanie)
- Wolne sloty (po §1d/§2)
- Lead time (min 2-3 tyg od dziś, chyba że user_notes mówią inaczej)
- STRATEGICZNĄ KOLEJNOŚĆ: czy lepiej wypuścić TEN produkt przed czy po innym zaplanowanym? Dlaczego?

═══════════════════════════════════════════
§4. TARGET AUDIENCE — DOPRECYZOWANIE
═══════════════════════════════════════════
Kim są ci ludzie, co lubią, gdzie ich szukać. Jak się mają do audience istniejących produktów? Czy to NOWY segment czy rozszerzenie obecnego?

═══════════════════════════════════════════
§5. PRICING SANITY CHECK
═══════════════════════════════════════════
Spójna z premium brandem? Porównaj z existingCatalog w tej samej kategorii. Jeśli brak ceny → zasugeruj widełki na bazie portfolio.

═══════════════════════════════════════════
§6. PLAN LAUNCHU (4 FAZY)
═══════════════════════════════════════════
T-2: tease | T-1: pre-order/reveal | T0: launch push | T+1: UGC + retargeting
Dla każdej fazy: kanały, format, hook. Plan musi uwzględniać co INNEGO dzieje się w marce w tym samym czasie.

═══════════════════════════════════════════
§7. USER NOTES = PRIORYTET
═══════════════════════════════════════════
user_notes od właściciela mają najwyższy priorytet. Zrewiduj propozycję i opisz w rationale co się zmieniło.

═══════════════════════════════════════════
§8. REKOMENDACJE STRATEGICZNE
═══════════════════════════════════════════
Oprócz daty, daj STRATEGICZNE WNIOSKI:
- Czy ten produkt ma sens w obecnym portfolio? Co wzmacnia, co osłabia?
- Co powinno się wydarzyć w marce PRZED tym launchem żeby go przygotować?
- Jakie RYZYKA widać z perspektywy całego roku?
- Jeśli widzisz problem z portfoliem (np. "za dużo matchy, zero herbat owocowych") — powiedz wprost.

Uwzględnij brandProfile i knowledgeEntries jeśli dostępne — to kontekst o marce i lekcje z przeszłości.

═══════════════════════════════════════════
§9. OUTPUT — WYŁĄCZNIE VALID JSON
═══════════════════════════════════════════
Bez markdown, bez code fences, bez prozy.

{
  "suggested_date": "YYYY-MM-DD",
  "confidence": "high|medium|low",
  "rationale": "<2-3 zdania, dlaczego ta data — z odniesieniem do portfolio i kalendarza>",
  "portfolio_analysis": {
    "calendar_map": "<per miesiąc: ile launchy, jakie kategorie>",
    "gaps_identified": "<jakie luki w portfolio/kalendarzu ten produkt wypełnia>",
    "cannibalization_risk": "<czy kanibalizuje istniejące produkty, jakie>",
    "brand_narrative_fit": "<jak wpisuje się w narrację marki na ten rok>",
    "strategic_recommendation": "<1-2 zdania: co powinno się wydarzyć przed/po tym launchu w skali całej marki>"
  },
  "target_channels": ["d2c", "b2b_premium"],
  "channel_rationale": "<1-2 zdania: dlaczego TE kanały. Co pasuje do produktu, co nie. Jeśli D2C nie jest tutaj — tłumacz dlaczego. PAMIĘTAJ: tylko D2C launche wchodzą do planu marketingowego.>",
  "target_audience_refined": "<konkretny opis persony + jak się ma do audience innych produktów>",
  "pricing_check": {
    "verdict": "ok|too_low|too_high|missing",
    "suggested_range_pln": [null, null],
    "comment": "<1 zdanie, porównanie z cenami portfolio>"
  },
  "launch_plan": [
    {
      "phase": "tease|pre_order|launch|follow_up",
      "weeks_before_launch": 0,
      "channels": [
        { "channel": "meta_paid|instagram_organic|email|tiktok|content", "format": "...", "hook": "...", "cta": "..." }
      ]
    }
  ],
  "hero_hooks": ["<3-5 sensorycznych, polskich hooków>"],
  "warnings": ["<konflikty, ryzyka, przeładowania, kanibalizacja>"]
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
    )}\n\nKANAŁY SPRZEDAŻY BHT (z Brain — strategia per kanał):\n${channelStrategy.length > 0 ? channelStrategy.map((s) => '### ' + s.title + '\\n' + s.content).join('\\n\\n') : '(brak danych z Brain)'}\n\nZwróć tylko JSON wg schematu z systemu.`;

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
