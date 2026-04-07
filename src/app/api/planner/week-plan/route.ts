// @ts-nocheck
export const runtime = 'edge'; // Edge runtime: no 60s serverless limit
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// POST /api/planner/week-plan
// Body: { month, isoWeek, context }
// Pure LLM endpoint. Caller (wizard) is expected to fetch the heavy
// shared context (Meta history, Woo signals, brand profile, launches) ONCE
// via /api/planner/plan-context and pass it in here for every week.
// This keeps each week call to a single Anthropic round-trip (~5-15s with
// haiku) and never hits the 60s function timeout.
export async function POST(req: NextRequest) {
  try {
    const { month, isoWeek, context } = await req.json();
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
      commerce: context?.commerce || null,
      launchesInWeek,
      brandProfile: compactBrand,
      configuredAOV: Number(context?.configuredAOV || 120),
    };

    // ----- LLM call -----
    const client = new Anthropic({ apiKey });

    const compactSystem = `Jesteś planerem marketingowym Brown House & Tea (sklep z premium herbatami i akcesoriami matcha). Twoim zadaniem jest zwracać WYŁĄCZNIE valid JSON wg schematu w wiadomości użytkownika. Pisz po polsku. Briefy wizualne odzwierciedlają estetykę BHT: ciepłe naturalne światło, drewno orzechowe, papier handmade, szkło borokrzemowe, tony piaskowe.`;

    const userPrompt = `Wygeneruj plan marketingowy DLA POJEDYNCZEGO TYGODNIA ISO ${isoWeek} (${weekStartIso} → ${weekEndIso}) miesiąca ${month}.

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
  "rationale": "1-2 zdania uzasadnienia",
  "hero_products": [{ "name": "...", "why": "..." }],
  "promo": { "type": "none|percent|bundle|gift|free_shipping", "value": "...", "mechanics": "..." },
  "weekly_budget_pln": 0,
  "designer_summary": "2-3 zdania syntezy wizualnej dla całego tygodnia",
  "channels": [    // MAKSYMALNIE 4 KANAŁY na tydzień, wybierz najważniejsze
    {
      "channel": "meta_ads_prospecting | meta_ads_retargeting | instagram_organic | facebook_organic | email | tiktok | content_blog",
      "format": "single_image | carousel | reels | story | newsletter | post",
      "objective": "...",
      "creative_hook": "...",
      "headline": "...",
      "body": "...",
      "cta": "...",
      "audience": "...",
      "expected_kpi": "...",
      "budget_pln": 0,
      "visual_brief": {
        "scene": "co dokładnie pokazujemy w kadrze",
        "props": ["lista", "rekwizytów"],
        "lighting": "opis światła",
        "palette": ["#hex1", "#hex2", "#hex3"],
        "composition": "framing, hierarchia",
        "mood_keywords": ["3-5", "kotwic"],
        "do": "co MUSI być",
        "dont": "czego NIE robić",
        "reference_note": "do której referencji się odnosisz"
      }
    }
  ],
  "linked_calendar_tasks": ["...", "..."]
}

Briefy wizualne MUSZĄ wynikać z brandProfile. Jeśli brandProfile = null, użyj defaultowej estetyki BHT (ciepłe światło, drewno orzechowe, paleta piaskowa #f5f1ea/#e8dbc4/#8b6f4e/#3d2817, bez sztucznego białego światła).

Zwróć WYŁĄCZNIE valid JSON, bez markdown, bez prozy. Zaczynaj od { i kończ na }. Dane wejściowe:\n\n${JSON.stringify(userPayload, null, 2)}`;

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
          const llmRes = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 2800,
            system: compactSystem,
            messages: [
              { role: 'user', content: userPrompt },
              { role: 'assistant', content: '{' },
            ],
          });
          console.log(
            `[week-plan] iso=${isoWeek} llm took ${Date.now() - t0}ms, in=${llmRes.usage?.input_tokens} out=${llmRes.usage?.output_tokens}`
          );
          const text =
            '{' +
            llmRes.content
              .filter((b: any) => b.type === 'text')
              .map((b: any) => b.text)
              .join('');

          let parsed: any = null;
          let parseError: string | null = null;
          try {
            parsed = JSON.parse(extractJson(text));
          } catch (e: any) {
            parseError = e.message;
          }
          if (parsed && parsed.weeks && Array.isArray(parsed.weeks) && parsed.weeks[0]) {
            parsed = parsed.weeks[0];
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
                error: 'LLM returned non-JSON',
                parseError,
                raw: text.slice(0, 4000),
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
