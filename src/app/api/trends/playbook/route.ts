// @ts-nocheck
export const maxDuration = 180;
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { marketing_trends, brand_profile, brain_cache, product_launches } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/trends/playbook
 * Returns short, actionable playbook for next 4 weeks based on current trends
 * + BHT context. Cached at the LLM level — re-run by hitting POST.
 */
export async function GET() { return generate(); }
export async function POST() { return generate(); }

async function generate() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'no API key' }, { status: 500 });

    // Pull data
    const [trendsRows, brandRows, brainRows, launchRows] = await Promise.all([
      db.select().from(marketing_trends).where(eq(marketing_trends.active, 1)),
      db.select().from(brand_profile).where(eq(brand_profile.id, 1)).limit(1),
      db.select().from(brain_cache).where(eq(brain_cache.kind, 'section')),
      db.select().from(product_launches),
    ]);

    if (trendsRows.length === 0) {
      return NextResponse.json({ error: 'No trends scanned yet — run /api/trends/scan first' }, { status: 400 });
    }

    const trends = trendsRows
      .sort((a: any, b: any) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .map((t: any) => ({
        platform: t.platform,
        kind: t.kind,
        title: t.title,
        description: t.description,
        example: t.example,
        score: t.relevance_score,
      }));

    const brand = brandRows[0] || null;
    const brainSections = brainRows
      .map((c: any) => { try { return JSON.parse(c.payload_json); } catch { return null; } })
      .filter(Boolean)
      .map((s: any) => ({ module: s.module_slug, title: s.title, excerpt: typeof s.content === 'string' ? s.content.slice(0, 600) : '' }))
      .slice(0, 12);

    const upcomingLaunches = launchRows
      .filter((l: any) => l.planned_launch_date && !['cancelled', 'launched'].includes(l.status))
      .sort((a: any, b: any) => (a.planned_launch_date || '').localeCompare(b.planned_launch_date || ''))
      .slice(0, 6)
      .map((l: any) => ({ name: l.name, date: l.planned_launch_date, category: l.category }));

    const today = new Date();
    const next4w = [0, 1, 2, 3].map((w) => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() + w * 7);
      return d.toISOString().slice(0, 10);
    });

    const system = `Jesteś STRATEGIC MARKETING ADVISOR dla Brown House & Tea (premium herbaciarnia, polska firma rodzinna, sklep brownhouseandtea.pl, TikTok @brownhouseandtea 1350 obs).

DZIŚ JEST ${today.toISOString().slice(0, 10)}.

Dostajesz świeży snapshot 20+ trendów z TT/IG/FB + kontekst BHT. NIE rozsmarowuj wszystkich trendów. NIE pisz teoria. NIE listuj "tu są nasze opcje".

TWOJA ROBOTA: jak najmądrzejszy doradca marketingowy do mówisz BHT KONKRETNIE:
1. **3-5 najwa\u017cniejszych trendów RIGHT NOW dla BHT** — wybór z uzasadnieniem (1 zdanie każdy)
2. **3 anti-trends** — czego NIE robić w najbliższych 4 tygodniach
3. **Playbook 4-tygodniowy** — co konkretnie BHT ma zrobić tydzień po tygodniu, jakie posty/filmy, jakie hooki, jakie formaty. Konkrety. NIE "post o matchy" tylko "TikTok storytime: Mama tłumaczy dlaczego matcha z biedronki to nie matcha. Hook: 'Halo, ja muszę to powiedzieć'".
4. **Quick wins** — 3-5 rzeczy do zrobienia w tym tygodniu, nawet bez kampanii (np. odpowiadać na wszystkie komentarze, pivot opisu profilu, przerobić 1 najlepszy post na karuzelę).

KAŻDY z trendów które wybierasz uzasadnij 1 zdaniem dlaczego pasuje DO BHT (nie ogólnie). Wykorzystaj fakt że firma ma realnych ludzi, premium produkt, polski rynek, młodszą Mię z TikTok-savvy.

Wywołaj emit_playbook dokładnie raz.`;

    const tools = [{
      name: 'emit_playbook',
      description: 'Emit short actionable playbook',
      input_schema: {
        type: 'object',
        required: ['headline', 'top_trends_for_bht', 'avoid_now', 'four_week_plan', 'quick_wins_this_week'],
        properties: {
          headline: { type: 'string', description: 'Jedno zdanie: jaki jest "wibe" rynku w tym momencie i co BHT powinno z tym zrobić' },
          top_trends_for_bht: {
            type: 'array',
            description: 'DOKŁADNIE 3-5 trendów najważniejszych dla BHT TERAZ',
            items: {
              type: 'object',
              required: ['trend', 'why_for_bht', 'concrete_action'],
              properties: {
                trend: { type: 'string', description: 'Nazwa trendu — krótko, ostro' },
                why_for_bht: { type: 'string', description: '1 zdanie dlaczego pasuje do BHT specifically' },
                concrete_action: { type: 'string', description: 'Konkretna akcja BHT może zrobić w tym tygodniu, w 1-2 zdaniach' },
              },
            },
          },
          avoid_now: {
            type: 'array',
            description: '3 rzeczy do nierobienia',
            items: { type: 'string' },
          },
          four_week_plan: {
            type: 'array',
            description: '4 tygodnie planu — każdy tydzień ma temat + 2-3 konkretne akcje',
            items: {
              type: 'object',
              required: ['week_label', 'theme', 'actions'],
              properties: {
                week_label: { type: 'string', description: 'np. "Tydzień 1 (od ' + next4w[0] + ')"' },
                theme: { type: 'string', description: 'Hasło tygodnia' },
                actions: { type: 'array', items: { type: 'string' }, description: '2-3 konkretne akcje (NIE wymagam kampanii — może być "odpowiadać na wszystkie komentarze TT", "nagrać 3 storytimes Mamy")' },
              },
            },
          },
          quick_wins_this_week: {
            type: 'array',
            description: '3-5 rzeczy do zrobienia w ciągu 7 dni — najmniejszy wysiłek, największy efekt',
            items: { type: 'string' },
          },
        },
      },
    }];

    const userPrompt = `========== BHT KONTEKST ==========
${brand ? 'Brand voice: ' + (brand.brand_voice || '') + '\n' : ''}
TikTok: @brownhouseandtea (1350 obs, 25.3K polubień)
Najbliższe launche: ${upcomingLaunches.length ? upcomingLaunches.map(l => l.name + ' (' + l.date + ')').join(', ') : 'brak'}

========== STRATEGIA Z BRAIN ==========
${brainSections.map(s => '### ' + s.title + '\n' + s.excerpt).join('\n\n')}

========== ${trends.length} TRENDÓW Z OSTATNIEGO SKANU ==========
${trends.map((t: any) => '[' + t.platform + '/' + t.kind + ', score ' + t.score + '] ' + t.title + ' — ' + t.description + (t.example ? ' (' + t.example + ')' : '')).join('\n')}

========== ZAPYTANIE ==========
Wybierz 3-5 trendów które MA SENS dla BHT TERAZ. Daj 4-tygodniowy plan działań. Daj quick wins na ten tydzień. Konkrety, nie strategia teoretyczna.`;

    const client = new Anthropic({ apiKey });
    const r = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      tools,
      tool_choice: { type: 'tool', name: 'emit_playbook' },
      system,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const tu = r.content.find((c: any) => c.type === 'tool_use');
    if (!tu) return NextResponse.json({ error: 'no tool output' }, { status: 500 });

    const out: any = { ...tu.input };
    // Normalize stringified arrays
    for (const key of ['top_trends_for_bht', 'avoid_now', 'four_week_plan', 'quick_wins_this_week']) {
      if (typeof out[key] === 'string') {
        try { out[key] = JSON.parse(out[key]); } catch {}
      }
    }
    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      based_on_trends: trends.length,
      based_on_brain_sections: brainSections.length,
      based_on_launches: upcomingLaunches.length,
      ...out,
    });
  } catch (e: any) {
    console.error('[trends/playbook]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
