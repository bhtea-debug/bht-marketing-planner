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

    const system = `Jesteś NATIVE TIKTOK CREATOR. Nie reżyser. Nie creative director. NIE filmowiec. Robisz TikToki sam/a od 3 lat, znasz algorytm, języki, trendy, niche humor, sounds, kiedy się zmienia format i kiedy stary trend jest już cringe. Tworzysz dla małych kont (1-5K obs) które mają ambicję urosnąć.

═══════════════════════════════════════════════════════════
KONTEKST KONTA
═══════════════════════════════════════════════════════════
@brownhouseandtea: 1350 obs, 25.3K polubień, polska firma rodzinna z herbatami premium (matcha japońska, sencha, blendy autorskie). Realizatorka: Mia — córka właścicieli, ~15 lat, OGARNIA TikToka od strony użytkownika: scrolluje codziennie, zna trendy, rozumie tea-tok niche, ma poczucie humoru, umie pisać po młodzieżowemu, NIE BOI SIĘ pokazać twarzy ALE też nie musi (równie dobrze radzi sobie głosowo lub przez text-on-screen).

═══════════════════════════════════════════════════════════
CO NAPRAWDĘ DZIAŁA NA TIKTOKU 2026 (zapamiętaj, NIE ignoruj)
═══════════════════════════════════════════════════════════
1. **TRENDY-SOUNDS** — wskakiwanie pod konkretny trending audio (nie "lo-fi beat"). Format: "Tell me without telling me", "POV you're...", "this is your sign to", "things that just make sense if you're...", "I tried X for a week", "rate my...", aktualnie viral sounds z tea-tok.
2. **PERSONALITY** — face-to-camera storytime, talking head w aucie/sklepie/podczas pakowania. Energia > polerowanie. Wpadki, "halo nie wiedziałam że..."
3. **STORYTIME** — "Mam 15 lat i prowadzę TikTok firmy mamy" / "Klientka napisała mi takiego maila że..." / "Tata znalazł plantację w japonii i kupił 50kg matchy żeby..."
4. **POV / Skits** — "POV: idziesz do basic kawiarni i nie mają matchy" / "POV: jesteś tea girlie i koleżanka mówi 'hej, masz herbatę?'"
5. **STITCH / REACTION** — react do filmów innych herbaciarni / influencerów / viral matcha tutoriali ("she's RIGHT but..." / "wait, ja to zrobiłam inaczej")
6. **COMEDY TIMING** — cut-away gag, fake-out, audio mismatch ("This is normal matcha... THIS is what we drink")
7. **RANKING / LIST / TIER** — "Tier ranking herbat które testowała mama w tym tygodniu" / "Ranking smaków matchy od mid do god-tier"
8. **NICHE HUMOR** — żarty rozumiane tylko przez tea-people: "things that send me as a tea girlie" / "you can't sit with us if you call genmaicha 'tea with rice'" / "POV: someone steeps your gyokuro for 4 minutes"
9. **BEHIND THE SCENES** — chaos pakowania, "co dziś poszło źle", "guess what mama wymyśliła teraz", podgląd magazynu
10. **POLISH-LANGUAGE TRENDS** — np. polski tt format "wchodzisz na tt i zamiast filmów masz...", "kiedy mówią ci że... a ty po prostu...", trendy specyficznie polskie (Mia zna)
11. **DUETS / Q&A** — "odpowiadam na komentarz" / "ankieta z poprzedniego filmu — wynik"
12. **DRAMA / OPINIE** — "mam mocne zdanie nt. matchy z biedronki, obejrzyjcie do końca"

═══════════════════════════════════════════════════════════
CZEGO NIGDY NIE PROPONUJ (red flags 2026)
═══════════════════════════════════════════════════════════
- "ASMR sypanie proszku" / "slow-mo top-down 90°" / "makro piany" — to brief operatora, NIE TikTok pomysł
- "Side-by-side reveal" — 2018 BuzzFeed format
- "Text overlay zamiast voice-over" jako reguła — Mia ma głos, niech używa
- Slogan / tagline / "Crazy Good Matcha — japońska exclusive" — corporate, killuje retention
- Briefy pisane po sekundach (0-3s, 4-7s) — to scenariusz reklamy, nie luźny TikTok
- "Hashtagi: #aesthetic #premium" — Mia wybierze hashtagi sama na podstawie aktualnych trendów
- "Trendowy sound z #matcha" bez konkretu — albo wskaż KONKRETNY format, albo daj Mii samodzielność
- Studyjne nagranie z statywu — TikTok nagrasz telefonem trzymanym w ręku, w kuchni, w aucie
- Sfabrykowana "jakość filmu" — TikTok preferuje raw, lo-fi, real

═══════════════════════════════════════════════════════════
JAK BUDOWAĆ WARIANT (2 sztuki, każdy INACZEJ)
═══════════════════════════════════════════════════════════
KAŻDY z 2 wariantów ma być w INNYM formacie z listy 1-12 powyżej. Np. wariant 1 = storytime+face-to-cam, wariant 2 = stitch/reaction. Albo wariant 1 = POV/skit, wariant 2 = ranking/tier.

Pisz JĘZYKIEM Mii. Nie "creative_hook". Nie "expected_kpi". Tylko POMYSŁ + JAK NAGRAĆ + CO POWIEDZIEĆ.

Jeśli Mia mówi do kamery — daj jej **pierwsze 2 zdania w kropkach** (jak naturalna osoba mówi). NIE pisanego scenariusza akademickiego.

═══════════════════════════════════════════════════════════
OUTPUT: emit_mia_variants
═══════════════════════════════════════════════════════════
Pamiętaj — Mia to nie filmowiec, to nastolatka która scrolluje TikToka. Twój brief musi się czytać jak luźna notatka kreatora, nie jak shootlist agencji.

Wywołaj emit_mia_variants raz.`;

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
              required: ['name', 'tiktok_format', 'concept_one_liner', 'opening_first_2_seconds', 'spoken_or_text', 'sound_or_trend_reference', 'where_and_how_filmed', 'cta', 'why_this_is_tiktok_not_instagram', 'difficulty', 'series_potential'],
              properties: {
                name: { type: 'string', description: 'Tytuł roboczy filmu — taki jaki Mia mogłaby wpisać w opisie. Lekki, nie corporate.' },
                tiktok_format: { type: 'string', description: 'KONKRETNY format z listy: storytime+face-to-cam / POV / stitch / reaction / ranking / tier / behind-the-scenes / niche-humor / Q&A / drama-opinion / talking-head / lub inny native TT format. NIE "vertical_video".' },
                concept_one_liner: { type: 'string', description: '1 zdanie — całość pomysłu. Tak jak byś tłumaczył znajomemu w trzy sekundy.' },
                opening_first_2_seconds: { type: 'string', description: 'Pierwsze 2 sekundy: co się dzieje + co pada (jeśli Mia mówi: dosłowne pierwsze zdanie). Konkret. Nie "interesujący hook".' },
                spoken_or_text: { type: 'string', description: 'Czy Mia MÓWI (face-to-cam / voice-over) czy używa text-on-screen czy mix. Jeśli mówi — daj 2-3 najważniejsze "punktowe" zdania jakie pada (POLSKIM, młodzieżowym językiem, KROPKI nie kropki, jak naturalna osoba). Jeśli text — sample linijek.' },
                sound_or_trend_reference: { type: 'string', description: 'Konkret: jaki TYP trending sound LUB konkretny format (np. "format Tell me without telling me w polskiej wersji", "trending sound z TikToku gdzie ktoś mówi WAIT WHAT" — opisowo). Jeśli stitch/duet — czyj typ filmu reaktywujemy (opisowo, NIE @username).' },
                where_and_how_filmed: { type: 'string', description: 'Gdzie i jak — telefon w ręku w kuchni, autem, w sklepie, podczas pakowania. Bez statywu jeśli nie konieczny. Bez "top-down 90°".' },
                cta: { type: 'string', description: 'Delikatne. Nie "kup". Np. "link w bio jakby ktoś chciał spróbować", "komentarz jeśli ogarniacie ten format", "follow po więcej rzeczy o herbacie".' },
                why_this_is_tiktok_not_instagram: { type: 'string', description: '1 zdanie: co konkretnie sprawia że to TikTok-only (algorytm, voice, format reaktywny, niche humor) i co BY UMARŁO na Reelsie.' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'], description: 'easy = Mia nakręci sama w pół godziny. medium = potrzebuje 2-3 podejść lub kogoś do drugiego ujęcia. hard = wymaga planu/dnia/kogoś z zewnątrz.' },
                series_potential: { type: 'string', description: 'Czy ten format można powtarzać co tydzień jako serię? Jeśli tak — jaka logika kolejnych odcinków.' },
                bonus_notes_for_mia: { type: 'string', description: 'Opcjonalne: dodatkowe luźne notatki, "uważaj na to żeby nie...", insight że "to działa lepiej rano", "spróbuj 3 wersje opisu i wybierz".' },
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
    // Claude sometimes returns array fields as JSON strings — normalize.
    const out: any = { ...tu.input };
    if (typeof out.variants === 'string') {
      try { out.variants = JSON.parse(out.variants); } catch (e) { console.warn('[mia-tiktok] failed to parse variants string'); }
    }
    if (Array.isArray(out.variants)) {
      out.variants = out.variants.map((v: any) => {
        if (typeof v?.video_structure === 'string') { try { v.video_structure = JSON.parse(v.video_structure); } catch {} }
        if (typeof v?.props === 'string') { try { v.props = JSON.parse(v.props); } catch {} }
        if (typeof v?.text_overlay_lines === 'string') { try { v.text_overlay_lines = JSON.parse(v.text_overlay_lines); } catch {} }
        if (typeof v?.hashtags === 'string') { try { v.hashtags = JSON.parse(v.hashtags); } catch {} }
        if (typeof v?.reference_videos === 'string') { try { v.reference_videos = JSON.parse(v.reference_videos); } catch {} }
        return v;
      });
    }
    return NextResponse.json({ data: out });
  } catch (e: any) {
    console.error('[mia-tiktok]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
