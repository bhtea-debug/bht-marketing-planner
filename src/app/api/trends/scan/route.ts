// @ts-nocheck
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { marketing_trends } from '@/db/schema';

/**
 * POST /api/trends/scan
 * Scans current TikTok/Instagram/Facebook trends via Claude with web_search,
 * extracts actionable insights, and overwrites the marketing_trends table
 * with a fresh snapshot. Designed to run weekly (Vercel Cron) so the planner
 * prompts always reflect the live state of social.
 *
 * Optional body: { focus?: 'tea' | 'food' | 'beverage' | 'all' }
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const focus = body.focus || 'tea';

    const system = `Jesteś SOCIAL MEDIA TREND ANALYST dla polskiej marki herbacianej Brown House & Tea (segment premium, sklep brownhouseandtea.pl, TikTok @brownhouseandtea 1350 obs).

Twoje zadanie: ZWERYFIKUJ przez web_search co AKTUALNIE działa na TikToku, Instagramie i Facebooku. Skup się na okresie ostatnich 4-8 tygodni. Kalibracja: ${focus === 'tea' ? 'fokus na food/beverage/lifestyle/tea/coffee niche' : focus === 'food' ? 'fokus na food/cooking creators' : 'ogólnie'}.

CO WYSZUKAĆ (rób minimum 8-12 web_search calli):

═══════ A) SOCIAL MEDIA TRENDS ═══════
1. **Viral sounds TikTok PL/EN** (ostatnie 2-4 tyg) — "TikTok trends April 2026", "viral sounds this week"
2. **Format trends** — POV, storytime, stitch, ranking, niche humor, talking-head
3. **Hook patterns** — co działa na 1-3 sek
4. **Instagram Reels 2026 reality**
5. **Facebook 2026**
6. **Polish-specific TT trends** — polskie format-memy, sounds, creators

═══════ B) TEA/HERBACIANE TRENDS RYNKOWE (KRYTYCZNE) ═══════
7. **Tea trends 2026 globally** — szukaj "tea industry trends 2026", "matcha market growth", "wellness tea trends", "specialty tea consumer behavior 2026"
8. **Polskie trendy herbaciane** — szukaj "polski rynek herbaty 2026", "polskie marki herbat trendy", "konsumpcja herbaty Polska 2026", "specialty tea Polska", "matcha Polska trend"
9. **Wellness/functional tea** — adaptogen tea, mushroom tea, gut-health tea, sleep tea, focus tea — co viral, co rośnie
10. **Anti-coffee / coffee replacement** — czy ludzie przechodzą z kawy na herbatę, jakie segmenty, jak komunikować
11. **DTC tea brands case studies** — co robi Magic Hour, Bellocq, Smith Tea, polskie: Imbryk Story, Dilmah PL — formaty, packaging, cena, audience
12. **HoReCa specialty tea** — co barysta robi nowego z herbatą, kawiarnie specialty rosną z tea menu, hotele butikowe i tea pairing

═══════ C) META INSIGHTY ═══════
13. **Anti-trends** — co już cringe w 2026, co algorytm karze
14. **Polish-specific tea events** — Międzynarodowy Dzień Herbaty 21.05, lokalne festiwale, tea expo Polska

ZWRACAJ konkrety: liczby (X% growth), nazwy brandów, daty, źródła. Nie ogólniki.

ZASADY:
- BAZUJ na konkretach. NIE wymyślaj. Każdy trend musi mieć źródło z web_search.
- Jeśli nie ma świeżych danych — nie wymyślaj fake'ów, lepiej zaznacz "(low confidence)".
- Polski rynek: szukaj polskich źródeł, polskich creators, polskich format-trends.
- Konkretność: zamiast "trend POV" — daj konkretny format ("POV: jesteś tea girlie i koleżanka mówi X").
- BHT context: marka herbaty premium, młoda generacja Z + millenialsi, polska firma rodzinna.

OUTPUT: po sekwencji web_search calli wywołaj emit_trends DOKŁADNIE RAZ z kompletnym snapshotem.`;

    const tools: any[] = [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 16,
      },
      {
        name: 'emit_trends',
        description: 'Emit fresh marketing trends snapshot',
        input_schema: {
          type: 'object',
          required: ['scan_summary', 'trends'],
          properties: {
            scan_summary: { type: 'string', description: '3-5 zdań: co najważniejsze odkryłeś. Co się zmieniło od typowych podręcznikowych zaleceń. Konkrety.' },
            trends: {
              type: 'array',
              description: 'Lista 12-25 actionable trendów. Każdy konkret z opisem.',
              items: {
                type: 'object',
                required: ['platform', 'kind', 'title', 'description', 'relevance_score'],
                properties: {
                  platform: { type: 'string', enum: ['tiktok', 'instagram', 'facebook', 'cross', 'polish_specific', 'market_global', 'market_polish'] },
                  kind: { type: 'string', enum: ['viral_sound', 'format', 'hook_pattern', 'avoid', 'audience_shift', 'algorithm_change', 'category_trend', 'competitor_move', 'consumer_behavior', 'general'] },
                  title: { type: 'string', description: 'Krótki tytuł (max 8 słów)' },
                  description: { type: 'string', description: '1-3 zdania konkretu — co to jest, jak wygląda, gdzie widziałeś' },
                  example: { type: 'string', description: 'Opcjonalnie: konkretny przykład / cytat / format text overlay' },
                  source_urls: { type: 'array', items: { type: 'string' }, description: 'URLs które cytujesz' },
                  relevance_score: { type: 'integer', minimum: 0, maximum: 100, description: 'Jak bardzo relevant dla BHT (herbata premium, polska, młodzi)' },
                },
              },
            },
          },
        },
      },
    ];

    const client = new Anthropic({ apiKey });
    const r = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      tools,
      system,
      messages: [{ role: 'user', content: 'Zacznij scan trendów. Web_search ostro. Po sekwencji search call wywołaj emit_trends raz z pełnym snapshotem.' }],
    });

    const tu = r.content.find((c: any) => c.type === 'tool_use' && c.name === 'emit_trends');
    if (!tu) return NextResponse.json({ error: 'no emit_trends in response', stop: r.stop_reason }, { status: 500 });

    const out: any = { ...tu.input };
    if (typeof out.trends === 'string') {
      try { out.trends = JSON.parse(out.trends); } catch {}
    }
    if (!Array.isArray(out.trends)) {
      return NextResponse.json({ error: 'trends not array', raw: tu.input }, { status: 500 });
    }

    // Replace snapshot: archive old (active=0), insert fresh (active=1)
    await db.update(marketing_trends).set({ active: 0 });
    const now = new Date().toISOString();
    let inserted = 0;
    for (const t of out.trends) {
      try {
        await db.insert(marketing_trends).values({
          platform: String(t.platform || 'cross'),
          kind: String(t.kind || 'general'),
          title: String(t.title || '').slice(0, 200),
          description: String(t.description || ''),
          example: t.example ? String(t.example) : null,
          source_urls: Array.isArray(t.source_urls) ? JSON.stringify(t.source_urls) : null,
          relevance_score: Number(t.relevance_score || 50),
          active: 1,
          scanned_at: now,
        });
        inserted++;
      } catch (e) {
        console.warn('[trends/scan] insert failed', e);
      }
    }

    return NextResponse.json({
      ok: true,
      scan_summary: out.scan_summary,
      trends_count: inserted,
      scanned_at: now,
    });
  } catch (e: any) {
    console.error('[trends/scan]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// Allow Vercel Cron to invoke without auth
export async function GET(req: NextRequest) {
  // Verify Vercel cron header
  const cronHeader = req.headers.get('x-vercel-cron');
  if (!cronHeader) return NextResponse.json({ error: 'GET requires Vercel cron header' }, { status: 401 });
  // Forward to POST
  return POST(new Request(req.url, { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }) as any);
}
