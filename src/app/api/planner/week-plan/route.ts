// @ts-nocheck
export const runtime = 'edge'; // Edge runtime: no 60s serverless limit
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MARKETING_SKILL } from '@/lib/marketing-skill-bundled';

// POST /api/planner/week-plan
// Body: { month, isoWeek, context }
// Pure LLM endpoint. Caller (wizard) is expected to fetch the heavy
// shared context (Meta history, Woo signals, brand profile, launches) ONCE
// via /api/planner/plan-context and pass it in here for every week.
// This keeps each week call to a single Anthropic round-trip (~5-15s with
// haiku) and never hits the 60s function timeout.
export async function POST(req: NextRequest) {
  try {
    const { month, isoWeek, context, additionalInstructions, currentWeek } = await req.json();
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

    const [yStr] = month.split('-');
    const y = Number(yStr);

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

    // ----- Easter (for in-week holiday filter) -----
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
      { date: fmt(easterMonday), name: 'Pon. Wielkanocny' },
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
      { date: `${y}-11-27`, name: 'Black Friday (orient.)' },
    ];
    const holidaysInWeek = allHolidays.filter((h) => {
      const dh = new Date(h.date);
      return dh >= weekMonday && dh <= weekSunday;
    });

    // ----- Filter pre-built context to this week -----
    const allLaunches = Array.isArray(context?.launches) ? context.launches : [];
    const launchesInWeek = allLaunches
      .filter((l: any) => {
        const d = l.launchDate;
        if (!d) return false;
        const dd = new Date(d);
        const preStart = new Date(dd);
        preStart.setUTCDate(dd.getUTCDate() - 14);
        return preStart <= weekSunday && dd >= weekMonday;
      })
      .slice(0, 3);

    // Trim long brand fields to keep input tokens small
    const trim = (s: any, n = 240) =>
      typeof s === 'string' && s.length > n ? s.slice(0, n) + '…' : s;
    const bp = context?.brandProfile || null;
    const compactBrand = bp
      ? {
          brand_voice: trim(bp.brand_voice, 200),
          visual_mood: trim(bp.visual_mood, 200),
          color_palette: bp.color_palette,
          do_list: trim(bp.do_list, 240),
          dont_list: trim(bp.dont_list, 240),
          composition_rules: trim(bp.composition_rules, 200),
          inspiration_keywords: trim(bp.inspiration_keywords, 200),
          target_persona: trim(bp.target_persona, 160),
        }
      : null;

    // ----- Build whitelist of REAL product names from Woo + launches -----
    // The AI is HARD-LOCKED to these names — no inventing.
    const commerceObj = context?.commerce || null;
    const collectNames = (arr: any): string[] =>
      Array.isArray(arr)
        ? arr.map((p: any) => (p && typeof p.name === 'string' ? p.name.trim() : '')).filter(Boolean)
        : [];
    const allowedProductNames: string[] = Array.from(
      new Set([
        ...collectNames(commerceObj?.topSellers),
        ...collectNames(commerceObj?.topProducts),
        ...collectNames(commerceObj?.bestSellers),
        ...collectNames(commerceObj?.slowProducts),
        ...collectNames(commerceObj?.lowStock),
        ...collectNames(commerceObj?.newProducts),
        ...collectNames(commerceObj?.onSale),
        ...collectNames(launchesInWeek),
      ])
    );

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
      meta: context?.meta || { configured: false },
      commerce: commerceObj,
      launchesInWeek,
      brandProfile: compactBrand,
      configuredAOV: Number(context?.configuredAOV || 120),
      allowedProductNames,
    };

    // ----- LLM call -----
    const client = new Anthropic({ apiKey });

    // Full marketing-planner skill (the deterministic playbook that drives quality)
    // is bundled as a string so it works in the Edge runtime. The minimal preamble
    // tells the model to call the tool exactly once.
    const QUALITY_DIRECTIVES = `

---

# DYREKTYWY JAKOŚCI — twarde reguły, łamanie = output do wyrzucenia

## 1. Hooki copy (creative_hook) — sensoryka, nie slogany

KAŻDY creative_hook musi:
- mieć MIN. 2 zakotwiczenia sensoryczne (zapach, smak, dotyk, dźwięk, obraz, temperatura, ruch)
- odnosić się do KONKRETNEGO momentu w czasie / sytuacji w życiu odbiorcy (nie "miłośnicy herbaty", tylko np. "sobotni poranek przed wstaniem dzieci")
- mieć max 14 słów po polsku
- być NIEPOWTARZALNY w obrębie tygodnia — żadne dwa kanały nie mogą mieć podobnego hooka

ŹLE (NIE rób tak):
- "Odkryj wyjątkowe herbaty Brown House & Tea"
- "Najlepsza herbata na zimowe wieczory"
- "Premium loose leaf tea — sprawdź teraz"
- "Twój idealny rytuał z herbatą"
- "Smak, który pokochasz"

DOBRZE (rób tak):
- "Para z kubka pierwszego earl greya, kiedy kot jeszcze śpi na fotelu"
- "Liście rozwijają się w 78°C — zegnij się, popatrz, poczekaj 90 sekund"
- "Kiedy mama pyta 'jak w pracy' i ty po prostu nalewasz drugą"
- "Mokry kamień w ogrodzie i zielona herbata, której nie chce się odstawiać"

## 2. visual_brief — KAŻDY zupełnie inny

W obrębie JEDNEGO TYGODNIA briefy wizualne 4 kanałów MUSZĄ się różnić co najmniej 3 z 4 wymiarów:
- scene (sceneria/setting)
- composition (kadr — flat lay, makro, środowiskowy, portretowy, still life, w ruchu)
- lighting (poranne okno, golden hour, świece, neonowe, cień drzewa, ciemne tło z punktowym)
- props (rekwizyty)

Jeśli zauważasz że dwa briefy są podobne — przepisz jeden od zera.

KAŻDY visual_brief MUSI zawierać:
- scene: konkretne miejsce + pora dnia + 1 osoba LUB 1 element narracyjny (nie "stół z herbatą")
- composition: dokładny typ kadru ("makro 1:1 na powierzchnię liści", "wide 16:9 z osobą po lewej w 1/3 kadru", "flat lay z góry 4:5 z asymetrycznym układem")
- lighting: konkretne źródło światła ("miękkie światło z okna z lewej, godzina 8:00, lekka mgła") nie "ciepłe światło"
- props: 3-6 konkretnych rekwizytów po nazwie (nie "akcesoria do herbaty")
- mood_keywords: 3-5 słów oddających emocję
- reference_note: krótkie odniesienie do realnego stylu wizualnego (np. "jak Kinfolk magazine, ale ciemniejsze")

## 3. promo.mechanics — myśl mechanicznie

Jeśli promo.type ≠ none, mechanics MUSI opisywać:
- jak klient odbiera (kod / automat / wymóg minimum / okno czasowe)
- co dostaje warm baseline vs cold traffic
- jak komunikujemy w mailu vs paid vs organic (1 zdanie każdy)

ŹLE: "Standardowa zniżka -15%"
DOBRZE: "Kod WIOSNA15 ważny pn-czw, automat na koszyku >120 PLN. Email do warm bazy 7 dni wcześniej z personalizacją 'twoja zniżka', paid retargeting z hookiem 'wracają twoje ulubione', organic IG bez ceny — tylko nastrój."

## 4. theme i rationale

theme = max 6 słów, konkretny motyw nie kategoria (NIE "Wiosenne herbaty", TAK "Pierwsze ciepło na balkonie")
rationale = 2 zdania: (1) jaki sygnał z danych to wywołał (Woo top mover X / Meta winner Y / sezon Z), (2) dlaczego ten konkretny tydzień

## 5. Spójność produktów — TWARDA REGUŁA, ZERO TOLERANCJI

WSZYSTKIE pozycje w \`hero_products[].name\` MUSZĄ być dokładnym ciągiem znaków z listy \`allowedProductNames\` w danych wejściowych. Lista pochodzi z WooCommerce (topSellers + slowProducts + lowStock + newProducts + onSale) plus zaplanowane launche.

ZAKAZY:
- ❌ NIE wymyślaj nazw produktów ("Earl Grey Premium", "Złoty Yunnan Reserve", "Zimowa Mieszanka BHT" — jeśli tego nie ma w \`allowedProductNames\`, NIE WOLNO tego użyć)
- ❌ NIE tłumacz, nie skracaj, nie modyfikuj nazw (jeśli w Woo jest "Earl Grey z bławatkiem 100g", to wpisujesz dokładnie "Earl Grey z bławatkiem 100g", nie "Earl Grey")
- ❌ NIE używaj kategorii zamiast nazwy ("nasza zielona", "zimowy blend") jako wartości w \`hero_products[].name\`
- ❌ Jeśli \`allowedProductNames\` jest pusta — jako \`hero_products[].name\` użyj dosłownie \`"(brak danych Woo)"\` i dodaj \`warning\` w designer_summary; NIGDY nie zmyślaj nazw

W copy (creative_hook, headline, body) MOŻESZ używać nazw z \`allowedProductNames\` LUB ogólnej kategorii (np. "nasza zielona z jaśminem") jeśli pasuje rytmicznie — ale konkretne nazwy własne MUSZĄ pokrywać się z listą.

Jeśli zauważysz że twój pierwszy pomysł na hero product nie pasuje do \`allowedProductNames\` — wybierz inny produkt z listy zamiast forsować swój pomysł.

## 6. Body / headline

Jeśli kanał ma format reklamy (single_image, carousel, reels) WYPEŁNIJ headline (max 8 słów) i body (2-3 zdania). Nie zostawiaj pustego. Body musi prowadzić od sensorycznego obrazu do CTA, bez sprzedażowego krzyku.

---
`;

    const fullSystem = `${MARKETING_SKILL}${QUALITY_DIRECTIVES}

INSTRUKCJA WYKONAWCZA: Wywołaj narzędzie emit_week_plan dokładnie raz z kompletnym obiektem tygodnia. Pisz po polsku. Stosuj się ŚCIŚLE do playbooka i dyrektyw jakości powyżej. Zanim wywołasz narzędzie, w głowie sprawdź każdy kanał: czy hook ma 2 zakotwiczenia sensoryczne? czy briefy się od siebie różnią w 3+ wymiarach? czy headline/body są wypełnione? Jeśli nie — przepisz, dopiero potem wywołaj narzędzie.`;

    // If we're refining an existing week, show the previous version + the user's instructions
    const isRefine = !!additionalInstructions;
    const refineBlock = isRefine
      ? `\n\n========== POPRAWKA OD UŻYTKOWNIKA ==========\nTo jest kolejna iteracja tego tygodnia. Użytkownik widział poprzednią wersję i prosi o konkretne poprawki — TWOIM ZADANIEM jest podnieść jakość, nie tylko mechanicznie wprowadzić zmianę.\n\nPoprzednia wersja (do oceny i poprawy):\n${JSON.stringify(currentWeek || {}, null, 2)}\n\nInstrukcje użytkownika: "${additionalInstructions}"\n\nZASADY POPRAWKI:\n1. Realizuj prośbę użytkownika DOSŁOWNIE.\n2. Jednocześnie podnieś ogólną jakość: hooki muszą być sensoryczne i konkretne (nie "odkryj nasze herbaty"), promo musi mieć przemyślaną mechanikę, briefy wizualne muszą być realnie wykonalne dla designera.\n3. ZACHOWAJ wszystko co już było dobre w poprzedniej wersji — nie wymyślaj na nowo bez powodu.\n4. Jeśli użytkownik prosi o zmianę kanału lub produktu, sprawdź czy ma to sens biznesowy w kontekście Woo/Meta sygnałów.\n5. Nie powielaj pomysłów z poprzedniej wersji jeśli były słabe — popraw je.\n=============================================`
      : '';

    const userPrompt = `Wygeneruj plan marketingowy DLA POJEDYNCZEGO TYGODNIA ISO ${isoWeek} (${weekStartIso} → ${weekEndIso}) miesiąca ${month}.${refineBlock}

DZIŚ JEST ${todayIso}. Tydzień startuje za ${daysUntilStart} dni.
Święta w tym tygodniu: ${holidaysInWeek.length ? holidaysInWeek.map((h) => `${h.name} ${h.date}`).join(', ') : 'brak'}.

Wartości stałe (musisz ich użyć dokładnie tak):
- isoWeek: ${isoWeek}
- label: "Tydzień ${isoWeek} (${weekStartIso} – ${weekEndIso})"
- dateRange: "${weekStartIso} – ${weekEndIso}"
- start_date: "${weekStartIso}"
- end_date: "${weekEndIso}"

Reguły:
- MAKSYMALNIE 4 kanały, wybierz najważniejsze.
- Briefy wizualne MUSZĄ wynikać z brandProfile. Jeśli brandProfile = null, użyj defaultowej estetyki BHT (ciepłe światło, drewno orzechowe, paleta piaskowa #f5f1ea/#e8dbc4/#8b6f4e/#3d2817, bez sztucznego białego światła).
- Nie używaj cudzysłowów (") wewnątrz pól tekstowych — używaj ' lub « ».
- TWARDA REGUŁA PRODUKTÓW: \`hero_products[].name\` MUSI być DOKŁADNIE jednym z ciągów w \`allowedProductNames\` poniżej. Tool API odrzuci output z wymyśloną nazwą — twój request padnie. Jeśli lista jest pusta, użyj dosłownie "(brak danych Woo)".

ALLOWED PRODUCT NAMES (lista ${allowedProductNames.length} pozycji z WooCommerce — wybieraj WYŁĄCZNIE z tej listy):
${allowedProductNames.length > 0 ? allowedProductNames.map((n) => `  - ${n}`).join('\n') : '  (pusta — Woo niedostępne, użyj "(brak danych Woo)" jako name i dodaj warning w designer_summary)'}

Wywołaj narzędzie emit_week_plan ze wszystkimi polami. Dane wejściowe:\n\n${JSON.stringify(userPayload, null, 2)}`;

    const weekPlanTool = {
      name: 'emit_week_plan',
      description: 'Emituje plan marketingowy na pojedynczy tydzień ISO.',
      input_schema: {
        type: 'object',
        required: [
          'isoWeek',
          'label',
          'dateRange',
          'start_date',
          'end_date',
          'theme',
          'rationale',
          'hero_products',
          'promo',
          'weekly_budget_pln',
          'designer_summary',
          'channels',
        ],
        properties: {
          isoWeek: { type: 'integer' },
          label: { type: 'string' },
          dateRange: { type: 'string' },
          start_date: { type: 'string' },
          end_date: { type: 'string' },
          theme: { type: 'string', description: 'Krótki temat tygodnia' },
          rationale: { type: 'string', description: '1-2 zdania uzasadnienia' },
          hero_products: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'why'],
              properties: {
                name:
                  allowedProductNames.length > 0
                    ? {
                        type: 'string',
                        enum: [...allowedProductNames, '(brak danych Woo)'],
                        description:
                          'MUSI być dokładnym ciągiem z allowedProductNames (z WooCommerce). Brak zmyślania.',
                      }
                    : {
                        type: 'string',
                        description:
                          'allowedProductNames pusta — wpisz "(brak danych Woo)" i dodaj warning.',
                      },
                why: { type: 'string' },
              },
            },
          },
          promo: {
            type: 'object',
            required: ['type'],
            properties: {
              type: {
                type: 'string',
                enum: ['none', 'percent', 'bundle', 'gift', 'free_shipping'],
              },
              value: { type: 'string' },
              mechanics: { type: 'string' },
            },
          },
          weekly_budget_pln: { type: 'number' },
          designer_summary: {
            type: 'string',
            description: '2-3 zdania syntezy wizualnej dla całego tygodnia',
          },
          channels: {
            type: 'array',
            maxItems: 4,
            items: {
              type: 'object',
              required: [
                'channel',
                'format',
                'objective',
                'creative_hook',
                'cta',
                'audience',
                'expected_kpi',
                'budget_pln',
                'visual_brief',
              ],
              properties: {
                channel: {
                  type: 'string',
                  enum: [
                    'meta_ads_prospecting',
                    'meta_ads_retargeting',
                    'instagram_organic',
                    'facebook_organic',
                    'email',
                    'tiktok',
                    'content_blog',
                  ],
                },
                format: {
                  type: 'string',
                  enum: [
                    'single_image',
                    'carousel',
                    'reels',
                    'story',
                    'newsletter',
                    'post',
                  ],
                },
                objective: { type: 'string' },
                creative_hook: { type: 'string' },
                headline: { type: 'string' },
                body: { type: 'string' },
                cta: { type: 'string' },
                audience: { type: 'string' },
                expected_kpi: { type: 'string' },
                budget_pln: { type: 'number' },
                headline: { type: 'string', description: 'max 8 słów, wymagane dla single_image/carousel/reels/post' },
                body: { type: 'string', description: '2-3 zdania, sensorycznie do CTA, wymagane dla single_image/carousel/reels/newsletter' },
                visual_brief: {
                  type: 'object',
                  required: ['scene', 'composition', 'lighting', 'props', 'mood_keywords', 'reference_note'],
                  properties: {
                    scene: { type: 'string', description: 'konkretne miejsce + pora dnia + element narracyjny' },
                    props: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 },
                    lighting: { type: 'string', description: 'konkretne źródło + kierunek + pora' },
                    palette: { type: 'array', items: { type: 'string' } },
                    composition: { type: 'string', description: 'typ kadru + proporcje + układ' },
                    mood_keywords: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
                    do: { type: 'string' },
                    dont: { type: 'string' },
                    reference_note: { type: 'string', description: 'krótkie odniesienie wizualne' },
                  },
                },
              },
            },
          },
          linked_calendar_tasks: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    };

    // Extract the FIRST balanced top-level {...} object from a string.
    // Tracks string state so braces inside string literals don't confuse it.
    function extractJson(raw: string): string {
      let s = raw.trim();
      s = s.replace(/```json/gi, '').replace(/```/g, '').trim();
      const start = s.indexOf('{');
      if (start === -1) return s;
      let depth = 0;
      let inStr = false;
      let escape = false;
      for (let i = start; i < s.length; i++) {
        const ch = s[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === '\\') {
          escape = true;
          continue;
        }
        if (ch === '"') {
          inStr = !inStr;
          continue;
        }
        if (inStr) continue;
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) return s.slice(start, i + 1);
        }
      }
      // No balanced close — try to repair truncated JSON by closing open
      // strings, arrays, and braces in order.
      let repaired = s.slice(start);
      if (inStr) repaired += '"';
      // count remaining open brackets
      let openBraces = 0;
      let openBrackets = 0;
      let str = false;
      let esc = false;
      for (const ch of repaired) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { str = !str; continue; }
        if (str) continue;
        if (ch === '{') openBraces++;
        else if (ch === '}') openBraces--;
        else if (ch === '[') openBrackets++;
        else if (ch === ']') openBrackets--;
      }
      // strip dangling comma before closing
      repaired = repaired.replace(/,\s*$/, '');
      while (openBrackets-- > 0) repaired += ']';
      while (openBraces-- > 0) repaired += '}';
      return repaired;
    }

    // ----- Streaming response with heartbeat -----
    // Vercel Edge functions get killed if there's no response activity within
    // a short window. We open a ReadableStream immediately, emit a single
    // space byte every 3 seconds while Anthropic generates, then write a
    // newline + the final JSON payload at the end. The client reads the whole
    // body, splits on the LAST newline, and parses the trailing JSON.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const t0 = Date.now();
        let alive = true;
        const heartbeat = setInterval(() => {
          if (!alive) return;
          try {
            controller.enqueue(encoder.encode(' '));
          } catch {}
        }, 3000);

        try {
          // Always use Sonnet — Haiku produces repetitive, generic creatives.
          // Edge runtime + heartbeat stream gives us up to 5 minutes so latency is fine.
          const model = 'claude-sonnet-4-5';
          const llmRes = await client.messages.create({
            model,
            max_tokens: 8000,
            system: fullSystem,
            tools: [weekPlanTool as any],
            tool_choice: { type: 'tool', name: 'emit_week_plan' } as any,
            messages: [{ role: 'user', content: userPrompt }],
          });
          console.log(
            `[week-plan] iso=${isoWeek} model=${model} refine=${isRefine} took ${Date.now() - t0}ms, in=${llmRes.usage?.input_tokens} out=${llmRes.usage?.output_tokens}`
          );

          // Find the tool_use block — guaranteed valid JSON via API
          const toolUse = llmRes.content.find((b: any) => b.type === 'tool_use') as any;
          let parsed: any = toolUse?.input || null;
          let parseError: string | null = null;
          if (!parsed) {
            parseError = `no tool_use in response (stop_reason=${llmRes.stop_reason})`;
          }

          alive = false;
          clearInterval(heartbeat);

          const payload = parsed
            ? {
                data: {
                  week: parsed,
                  debug: {
                    isoWeek,
                    weekStartIso,
                    weekEndIso,
                    launchesInWeek: launchesInWeek.length,
                    elapsedMs: Date.now() - t0,
                  },
                },
              }
            : {
                error: 'LLM did not call tool',
                parseError,
                raw: JSON.stringify(llmRes.content).slice(0, 4000),
              };
          // Marker newline so client can find the JSON after the heartbeat spaces
          controller.enqueue(encoder.encode('\n' + JSON.stringify(payload)));
          controller.close();
        } catch (e: any) {
          alive = false;
          clearInterval(heartbeat);
          console.error('[week-plan] stream error', e);
          try {
            controller.enqueue(
              encoder.encode('\n' + JSON.stringify({ error: e.message || String(e) }))
            );
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
    console.error('[week-plan]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
