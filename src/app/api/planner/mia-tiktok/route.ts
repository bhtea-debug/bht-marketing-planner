// @ts-nocheck
export const maxDuration = 180;
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { brain_cache, brand_profile } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/planner/mia-tiktok
 * Body: { week: { isoWeek, label, theme?, hero_products?: string[], dateRange? }, allowedProductNames?: string[] }
 * Returns: { variants: [...2 TikTok-native briefs intended for Mia (daughter, 15+, knows TikTok, NOT necessarily on camera)] }
 *
 * Filozofia: TikTok-native ≠ pionowa wersja Instagrama. To inny kanał z innym
 * algorytmem, innym tempem, innym językiem. Mia jest realizatorką (reżyser/edytor)
 * która:
 *   - zna trendy, sounds, hashtagi
 *   - umie wybrać zaczepiający 1-3s hook
 *   - może NIE być na kamerze — używa rąk, kubków, makra, voice-over, text overlay
 *   - tempo: 2-3 filmy/tydz, akceptuje 70% jakości na rzecz częstotliwości
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

    const body = await req.json();
    const week = body.week || {};
    const allowedProductNames: string[] = Array.isArray(body.allowedProductNames) ? body.allowedProductNames : [];

    // Pull brand + brain
    let brandData: any = null;
    try {
      const r = await db.select().from(brand_profile).where(eq(brand_profile.id, 1)).limit(1);
      if (r[0]) brandData = r[0];
    } catch {}
    let brainStrategy: any[] = [];
    try {
      const sec = await db.select().from(brain_cache).where(eq(brain_cache.kind, 'section'));
      brainStrategy = sec
        .map((c: any) => { try { return JSON.parse(c.payload_json); } catch { return null; } })
        .filter(Boolean)
        .map((s: any) => ({ module: s.module_slug, title: s.title, excerpt: typeof s.content === 'string' ? s.content.slice(0, 500) : '' }))
        .slice(0, 8);
    } catch {}

    const system = `Jesteś TIKTOK CREATIVE DIRECTOR dla Brown House & Tea (premium herbaciarnia, sklep brownhouseandtea.pl).

KONTEKST: TikTok = @brownhouseandtea (1350 obserwujących, 25.3K polubień). Realizator: Mia — córka właścicieli, ~15 lat, ogarnia TikTok od strony trendów/edytorskiej. NIE musi być przed kamerą. Może nagrywać RĘKAMI/PRODUKTAMI/MAKRO. Ma głowę do trendów, sounds, hashtagów.

GLOBALNE INSIGHTY:
- #matcha ma 3 mld views (popyt +25% globalnie przez TikTok)
- Algorytm TikTok: hook w 1-3 sek decyduje, retention > engagement
- Format wygrywający dla małych kont: serie (4-6 odcinków), tytuły z hookiem ("Część 1/4...", "Tego nie wiedzieliście o herbacie..."), text overlay zamiast lektora gdy bez twarzy
- BHT ma siłę: prawdziwa firma rodzinna, premium surowiec, polski producent

ZASADY MIA-NATIVE:
1. **NIE rób pionowej wersji Reelsa.** Jeśli koncept działa też na IG — odrzuć.
2. **Hook w 1-3 sekundach.** Nie "intro", nie "cześć". Konkret: liczba, paradoks, pytanie, surowy obraz.
3. **Text overlay > voice-over.** Mia może nagrać voice-over, ale 70% filmów ma działać na mute.
4. **Trendowy sound.** W każdym briefie sugeruj 1-2 typy soundów (np. "trending audio z #matcha", "lo-fi minimal beat", "rozpoznawalny sound z tea-tok").
5. **Ręce, makro, ASMR, POV.** Bez face-camu. Para z kubka, plama matchy w tle, łyżka odsuwająca herbatę, kreska herbaty na białym.
6. **Hashtagi.** 3-5 trafionych: #matcha #teatok #polskaherbata #aesthetic + temat tygodnia.
7. **Seria > single.** Zaproponuj jak temat tygodnia może rozłożyć się na 2-3 filmy w tygodniu zamiast 1 dopracowany.
8. **CTA delikatny.** Nie "kup teraz". "Link w bio" / "komentuj jaką pijesz" / "follow po więcej".

TWOJA ROBOTA: Wygeneruj DOKŁADNIE 2 niezależne warianty TikTok-native dla danego tygodnia.

Każdy wariant ma być KOMPLETNYM mini-briefem dla Mii — żeby usiadła i nakręciła w 1 dzień + zmontowała.

Wywołaj narzędzie emit_mia_variants dokładnie raz.`;

    const tools = [{
      name: 'emit_mia_variants',
      description: 'Emit 2 TikTok-native content variants for Mia',
      input_schema: {
        type: 'object',
        required: ['variants', 'tiktok_strategy_note'],
        properties: {
          tiktok_strategy_note: {
            type: 'string',
            description: 'Krótki (2-3 zdania) strategiczny komentarz: dlaczego TikTok-native dla TEGO tygodnia ma sens. Co się różni od Instagrama. Konkret.',
          },
          variants: {
            type: 'array',
            description: 'DOKŁADNIE 2 niezależne warianty TikTok-native dla Mii. Każdy z polami: name, concept, hook_seconds_1_3, video_structure (lista 3-6 beatów po sekundach), filming_setup, props (lista), lighting, sound_suggestion, text_overlay_lines (lista 2-4), hashtags (3-5), cta, why_tiktok_not_instagram, difficulty (easy/medium/hard), series_potential.',
            items: {
              type: 'object',
              required: ['name', 'concept', 'hook_seconds_1_3', 'video_structure', 'filming_setup', 'sound_suggestion', 'text_overlay_lines', 'hashtags', 'cta', 'why_tiktok_not_instagram', 'difficulty', 'series_potential'],
              properties: {
                name: { type: 'string' },
                concept: { type: 'string' },
                hook_seconds_1_3: { type: 'string' },
                video_structure: { type: 'array', items: { type: 'string' } },
                filming_setup: { type: 'string', description: 'Setup nagrania: kamera (telefon), kąt, blat, tło' },
                props: { type: 'array', items: { type: 'string' } },
                lighting: { type: 'string' },
                reference_videos: { type: 'array', items: { type: 'string' } },
                sound_suggestion: { type: 'string' },
                text_overlay_lines: { type: 'array', items: { type: 'string' } },
                hashtags: { type: 'array', items: { type: 'string' } },
                cta: { type: 'string' },
                why_tiktok_not_instagram: { type: 'string' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                series_potential: { type: 'string' },
              },
            },
          },
        },
      },
    }];

    const userPrompt = `Tydzień: ${week.label || week.isoWeek || 'nieokreślony'} (${week.dateRange || ''})
Temat tygodnia: ${week.theme || '(brak — zaproponuj 2 niezależne kierunki)'}
Hero produkty: ${(week.hero_products && week.hero_products.length) ? week.hero_products.join(', ') : 'dowolne z listy'}
Promocja w tym tygodniu: ${week.promo || 'brak'}

LISTA dozwolonych produktów (Woo, ${allowedProductNames.length}):
${allowedProductNames.length ? allowedProductNames.slice(0, 30).map((n) => '- ' + n).join('\n') : '(brak — bądź ogólny, używaj kategorii: matcha, sencha, earl grey, herbata owocowa)'}

${brandData ? `PROFIL MARKI (skrót): ${brandData.brand_voice || ''} | wizualny mood: ${brandData.visual_mood || ''} | DO: ${brandData.do_list || ''} | DON'T: ${brandData.dont_list || ''}` : ''}

${brainStrategy.length ? '========== STRATEGIA Z BRAIN ==========\n' + brainStrategy.map((s) => '### ' + s.title + '\n' + s.excerpt).join('\n\n') : ''}

Wygeneruj 2 warianty TikTok-native dla Mii.`;

    const client = new Anthropic({ apiKey });
    const r = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      tools,
      tool_choice: { type: 'tool', name: 'emit_mia_variants' },
      system,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const tu = r.content.find((c: any) => c.type === 'tool_use');
    console.log('[mia-tiktok] stop_reason:', r.stop_reason, 'content blocks:', r.content.length);
    console.log('[mia-tiktok] tool_use found:', !!tu, 'input keys:', tu ? Object.keys(tu.input || {}) : []);
    if (!tu) {
      console.error('[mia-tiktok] no tool_use, raw content:', JSON.stringify(r.content).slice(0, 500));
      return NextResponse.json({ error: 'no tool output', raw: r.content }, { status: 500 });
    }
    if (!tu.input || Object.keys(tu.input).length === 0) {
      console.error('[mia-tiktok] empty input, full tu:', JSON.stringify(tu).slice(0, 800));
      return NextResponse.json({ error: 'empty tool input', tu }, { status: 500 });
    }
    return NextResponse.json({ data: tu.input });
  } catch (e: any) {
    console.error('[mia-tiktok]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
