// @ts-nocheck
export const runtime = 'edge';
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// POST /api/planner/week-strategy
// PHASE 1: Strategy only — theme, hero products, promo, rationale.
// Much faster than full week-plan (~3-5s vs ~15-25s).
// Body: { month, isoWeek, context }
export async function POST(req: NextRequest) {
  try {
    const { month, isoWeek, context, userFeedback, previousStrategy } = await req.json();
    if (!month || !/^\d{4}-\d{2}$/.test(month))
      return NextResponse.json({ error: 'month required as YYYY-MM' }, { status: 400 });
    if (!isoWeek || typeof isoWeek !== 'number')
      return NextResponse.json({ error: 'isoWeek (number) required' }, { status: 400 });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

    const [yStr] = month.split('-');
    const y = Number(yStr);

    function isoWeekMonday(year: number, week: number): Date {
      const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
      const dow = simple.getUTCDay() || 7;
      const monday = new Date(simple);
      monday.setUTCDate(simple.getUTCDate() - dow + 1);
      return monday;
    }
    function fmt(d: Date) { return d.toISOString().slice(0, 10); }

    const weekMonday = isoWeekMonday(y, isoWeek);
    const weekSunday = new Date(weekMonday);
    weekSunday.setUTCDate(weekMonday.getUTCDate() + 6);
    const weekStartIso = fmt(weekMonday);
    const weekEndIso = fmt(weekSunday);

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const daysUntilStart = Math.max(0, Math.round((weekMonday.getTime() - today.getTime()) / 86400000));

    // Holidays
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
    const easterMonday = new Date(easter); easterMonday.setUTCDate(easter.getUTCDate() + 1);
    const allHolidays = [
      { date: `${y}-01-01`, name: 'Nowy Rok' }, { date: `${y}-01-06`, name: 'Trzech Króli' },
      { date: fmt(easter), name: 'Wielkanoc' }, { date: fmt(easterMonday), name: 'Pon. Wielkanocny' },
      { date: `${y}-05-01`, name: 'Święto Pracy' }, { date: `${y}-05-03`, name: 'Konstytucji 3 Maja' },
      { date: `${y}-05-26`, name: 'Dzień Matki' }, { date: `${y}-06-01`, name: 'Dzień Dziecka' },
      { date: `${y}-06-23`, name: 'Dzień Ojca' }, { date: `${y}-08-15`, name: 'Wniebowzięcie NMP' },
      { date: `${y}-11-01`, name: 'Wszystkich Świętych' }, { date: `${y}-11-11`, name: 'Niepodległości' },
      { date: `${y}-02-14`, name: 'Walentynki' }, { date: `${y}-04-22`, name: 'Dzień Ziemi' },
      { date: `${y}-11-27`, name: 'Black Friday (orient.)' },
      { date: `${y}-12-24`, name: 'Wigilia' }, { date: `${y}-12-25`, name: 'Boże Narodzenie' },
    ];
    const holidaysInWeek = allHolidays.filter(h => {
      const dh = new Date(h.date);
      return dh >= weekMonday && dh <= weekSunday;
    });

    // ALL launches — full portfolio for strategic context
    const allLaunches = Array.isArray(context?.launches) ? context.launches : [];
    const launchesInWeek = allLaunches.filter((l: any) => {
      const d = l.launchDate; if (!d) return false;
      const dd = new Date(d); const pre = new Date(dd); pre.setUTCDate(dd.getUTCDate() - 14);
      return pre <= weekSunday && dd >= weekMonday;
    }).slice(0, 3);
    // Launches NOT in this week (rest of portfolio)
    const launchesOutsideWeek = allLaunches.filter((l: any) => !launchesInWeek.includes(l));

    // Product whitelist
    const commerceObj = context?.commerce || null;
    const collectNames = (arr: any): string[] =>
      Array.isArray(arr) ? arr.map((p: any) => p?.name?.trim?.()).filter(Boolean) : [];
    const allowedProductNames = Array.from(new Set([
      ...collectNames(commerceObj?.fullCatalog),
      ...collectNames(commerceObj?.topProducts),
      ...collectNames(commerceObj?.slowProducts),
      ...collectNames(commerceObj?.lowStock),
      ...collectNames(commerceObj?.onSale),
      ...collectNames(launchesInWeek),
    ]));

    const storePolicies = context?.storePolicies || null;
    const knowledgeEntries = Array.isArray(context?.knowledgeEntries) ? context.knowledgeEntries : [];
    const brandProfile = context?.brandProfile || null;

    const system = `Pomagasz 2-3 osobowemu zespołowi marketingowemu Brown House & Tea (polska premium herbata + matcha) zaplanować jeden tydzień.

REALIA ZESPOŁU:
- Zespół to maks 3 osoby (designer/grafik, copy/ops, Michał oversight).
- Każda piękna rzecz wymaga czasu — lepsze 1 perfekcyjnie wykonane niż 5 średnich.
- Tydzień = 1 motyw + 1-2 produkty hero + ewentualnie proste promo. Tyle.
- Jeśli wybierasz coś ambitnego — zostaw pole do ucięcia w realizacji.

TWOJA ROLA: Zaproponuj PROSTĄ, WYKONALNĄ strategię tygodnia.

========== CO ROBISZ ==========
1. TEMAT tygodnia — 3-5 słów, prosty motyw konsumencki ("Poranek z matchą", "Earl Grey i sobota", "Przerwa o 15:00"). Nie wymyślaj poetyckich konstrukcji.
2. 1-2 HERO PRODUKTY z allowedProductNames. Lepiej 1 dobrze niż 4 płytko.
3. PROMO (lub brak) — TYLKO jeśli ma sens. Najczęściej brak. Jeśli jest — proste: kod rabatowy LUB darmowa wysyłka pod próg LUB pakiet 2+1.
4. RATIONALE — 2 krótkie zdania (sygnał z danych + dlaczego ten tydzień).
5. DESIGNER SUMMARY — 1-2 zdania (nastrój, kolor, jeden konkret wizualny: np. "para z kubka, miękkie poranne światło z lewej").
6. Budżet — sugestia, ale nie wymuszaj wysokich kwot.

========== ZASADY ==========
- hero_products[].name DOKŁADNIE z allowedProductNames. Zero wymyślania.
- Darmowa wysyłka od 129 PLN to standard, nie promo.
- Premiera w ±7 dni? — strategia ją wspiera (hype lub launch). Brak premier? — fokus na bestseller lub slow mover z dobrym powodem.
- NIE łącz na siłę 4 kategorii. 1-2 wystarczy.
- Theme nie musi być poetycki. Lepsze proste i jasne ("Sobota z herbatą") niż abstrakcyjne ("Pierwsze ciepło na balkonie") jeśli nie ma czasu na realizację.

Wywołaj narzędzie emit_week_strategy dokładnie raz.`;

    // Format launch for prompt
    const fmtLaunch = (l: any) => {
      const parts = [l.name];
      if (l.category) parts.push(`[${l.category}]`);
      if (l.launchDate) parts.push(`data: ${l.launchDate}`);
      if (l.short_pitch) parts.push(`— ${l.short_pitch}`);
      if (l.target_audience) parts.push(`(${l.target_audience})`);
      if (l.price_pln) parts.push(`${l.price_pln} PLN`);
      return parts.join(' ');
    };

    const userPrompt = `Tydzień ISO ${isoWeek} (${weekStartIso} → ${weekEndIso}) miesiąca ${month}.
DZIŚ JEST ${todayIso}. Tydzień za ${daysUntilStart} dni.
Święta w tym tygodniu: ${holidaysInWeek.length ? holidaysInWeek.map(h => `${h.name} ${h.date}`).join(', ') : 'brak'}.

========== PORTFOLIO PREMIER (KLUCZOWE!) ==========
Premiery w oknie tego tygodnia (±14 dni):
${launchesInWeek.length > 0 ? launchesInWeek.map(fmtLaunch).join('\n') : '  brak'}

Pozostałe zaplanowane premiery (kontekst portfolio):
${launchesOutsideWeek.length > 0 ? launchesOutsideWeek.map(fmtLaunch).join('\n') : '  brak'}

→ Przeanalizuj jak TEN tydzień powinien się odnosić do powyższych premier. Czy budujemy hype? Wspieramy launch? Dajemy oddech między premierami?

========== ALLOWED PRODUCT NAMES (${allowedProductNames.length}) ==========
${allowedProductNames.length > 0 ? allowedProductNames.map(n => `  - ${n}`).join('\n') : '  (pusta — użyj "(brak danych Woo)")'}
${brandProfile ? `\n========== PROFIL MARKI ==========\n${typeof brandProfile === 'string' ? brandProfile : JSON.stringify(brandProfile, null, 2)}` : ''}
${storePolicies ? `\nPOLITYKI SKLEPU:\n${JSON.stringify(storePolicies, null, 2)}` : ''}
${knowledgeEntries.length > 0 ? `\nBAZA WIEDZY:\n${knowledgeEntries.map((k: any) => `  [${k.category}] ${k.content}`).join('\n')}` : ''}

========== DANE HANDLOWE ==========
- Top produkty: ${collectNames(commerceObj?.topProducts).slice(0, 8).join(', ') || 'brak'}
- Slow movers: ${collectNames(commerceObj?.slowProducts).slice(0, 5).join(', ') || 'brak'}
- Niska dostępność: ${collectNames(commerceObj?.lowStock).slice(0, 5).join(', ') || 'brak'}
- W promocji: ${collectNames(commerceObj?.onSale).slice(0, 5).join(', ') || 'brak'}

Przeanalizuj WSZYSTKO powyżej i wywołaj emit_week_strategy.${previousStrategy ? `

========== POPRZEDNIA STRATEGIA (DO POPRAWY) ==========
Użytkownik ODRZUCIŁ poniższą strategię i dał feedback. Musisz ją POPRAWIĆ zgodnie z uwagami.
Poprzednia strategia:
${JSON.stringify(previousStrategy, null, 2)}` : ''}${userFeedback ? `

========== UWAGI UŻYTKOWNIKA ==========
${userFeedback}

WAŻNE: Uwzględnij powyższe uwagi. Zmień strategię zgodnie z oczekiwaniami użytkownika. Nie ignoruj żadnego punktu.` : ''}`;

    const strategyTool = {
      name: 'emit_week_strategy',
      description: 'Emituje strategię tygodnia — bez treści i kanałów, tylko kierunek.',
      input_schema: {
        type: 'object',
        required: ['isoWeek', 'label', 'dateRange', 'start_date', 'end_date', 'theme', 'rationale', 'hero_products', 'promo', 'weekly_budget_pln', 'designer_summary'],
        properties: {
          isoWeek: { type: 'integer' },
          label: { type: 'string' },
          dateRange: { type: 'string' },
          start_date: { type: 'string' },
          end_date: { type: 'string' },
          theme: { type: 'string', description: 'Krótki temat tygodnia, max 6 słów — konkretny narracyjnie' },
          rationale: { type: 'string', description: '3-4 zdania: sygnał z danych + kontekst portfolio premier + dlaczego ten tydzień + jak buduje arc miesiąca' },
          hero_products: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'why'],
              properties: {
                name: allowedProductNames.length > 0
                  ? { type: 'string', enum: [...allowedProductNames, '(brak danych Woo)'] }
                  : { type: 'string' },
                why: { type: 'string' },
              },
            },
          },
          promo: {
            type: 'object',
            required: ['type'],
            properties: {
              type: { type: 'string', enum: ['none', 'percent', 'bundle', 'gift', 'free_shipping'] },
              value: { type: 'string' },
              mechanics: { type: 'string' },
            },
          },
          weekly_budget_pln: { type: 'number' },
          launch_context: { type: 'string', description: 'Jak strategia tego tygodnia odnosi się do portfolio premier — budowanie hype, wsparcie launchu, oddech między premierami, itp. 1-2 zdania.' },
          designer_summary: { type: 'string', description: '2-3 zdania o kierunku wizualnym, nastroju, kolorystyce tygodnia' },
        },
      },
    };

    const client = new Anthropic({ apiKey });

    // Heartbeat stream for Edge
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let alive = true;
        const heartbeat = setInterval(() => {
          if (!alive) return;
          try { controller.enqueue(encoder.encode(' ')); } catch {}
        }, 3000);

        try {
          const llmRes = await client.messages.create({
            model: 'claude-opus-4-5',
            max_tokens: 4000,
            system,
            tools: [strategyTool as any],
            tool_choice: { type: 'tool', name: 'emit_week_strategy' } as any,
            messages: [{ role: 'user', content: userPrompt }],
          });

          const toolUse = llmRes.content.find((b: any) => b.type === 'tool_use') as any;
          const parsed = toolUse?.input || null;

          alive = false;
          clearInterval(heartbeat);

          const payload = parsed
            ? { data: { strategy: parsed } }
            : { error: 'LLM did not call tool' };
          controller.enqueue(encoder.encode('\n' + JSON.stringify(payload)));
          controller.close();
        } catch (e: any) {
          alive = false;
          clearInterval(heartbeat);
          try {
            controller.enqueue(encoder.encode('\n' + JSON.stringify({ error: e.message })));
            controller.close();
          } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (e: any) {
    console.error('[week-strategy]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
