// @ts-nocheck
export const maxDuration = 180;
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { product_launches, brain_cache, brand_profile } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/launches/propose-for-channel
 * Body: { channel: 'd2c'|'rossmann_full'|'b2b_premium'|...; count?: number }
 * Returns 3-5 product proposals SPECIFIC for that channel, using full Brain knowledge.
 */
const CHANNEL_CONTEXT: Record<string, string> = {
  d2c: 'sklep brownhouseandtea.pl + Allegro. 6% obrotu, NIE motor wzrostu, ale serce komunikacji marki. Pełna oferta 4-warstwowa: matcha hero + funkcyjne wellness + smakowe Core + smakowe Extended. Klient: 4 segmenty (Tea Connoisseur 29%, Wellness Daily 35%, Gift Giver 25%, Discount Hunter — choć nieobsługiwany). KAŻDY launch tu trafia jako "pełna oferta polskiego specjalisty".',
  allegro: 'komplementarny do D2C. Bestsellers + nowe SKU które chcemy testować poza ekosystemem D2C. Klient bardziej cenowo-wrażliwy.',
  rossmann_full: 'pełna dystrybucja drogerii (1820 sklepów, 47% obrotu BHT 2028 = 5.8M PLN). TRZY nogi portfolio: (1) matcha hero — Premium Japan, Lattea, Focus, Crazy Good; (2) funkcyjne wellness — Hydration Heroes, ZERO; (3) smakowe premium — Strawberry Lemonade, Caramel Pear, Raspberry Rose. Klient drogerii: kupuje konkretną obietnicę, format 50g/100g. NIE WCHODZI: niche premium gyokuro/single-origin, akcesoria, limited-edition prestige.',
  rossmann_test: 'test 100-200 sklepów Rossmanna dla nowych SKU przed pełną dystrybucją. Incubator. Niski stake.',
  rossmann_amoya: 'private label Amo\'ya (NIE marka BHT). Powrót Q4 2026 po rebrandingu. Wydzielony finansowo i operacyjnie. 19% obrotu BHT 2028 = 2.4M PLN.',
  b2b_premium: 'Hurt + HoReCa razem (13% obrotu 2028 = 1.6M PLN). Klient: kawiarnie specialty (WAW/KRK/WRO), hotele butikowe, sklepy prezentowe, firmy prezentowe, drobni odsprzedawcy, restauracje. Mix wszystkich kategorii. Pojemność: kg-wise. Cena B2B 60-70% retail. PILOTAŻ H2 2026: kawiarnie + Matcha Lattea ZERO + iced lines. NAJBARDZIEJ pasuje: Lattea ZERO, iced/cold brew, premium single-origin, akcesoria, zestawy prezentowe. SŁABO pasuje: limited-edition single SKU.',
  export: 'DE/EU dystrybutorzy (9% obrotu 2028 = 1.1M PLN). Pilotaż 2026: 8 klientów DE = szum, ale specialty tea EU to największy rynek. Pilotaż: landing DE + Matcha Premium Japan + partner logistyczny. NAJMOCNIEJSZE: Matcha Premium Japan, single-origin, premium niche.',
  other_chains: 'Spar, Intermarche, Super-Pharm, Bio Planet (8% obrotu 2028 = 1M PLN). Noga 2 dywersyfikacji ryzyka Rossmanna.',
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'no API key' }, { status: 500 });
    const body = await req.json();
    const channel = String(body.channel || '');
    const count = Math.min(Math.max(Number(body.count || 4), 2), 6);
    const userPrompt = body.userPrompt || '';

    if (!CHANNEL_CONTEXT[channel]) {
      return NextResponse.json({ error: 'invalid channel', allowed: Object.keys(CHANNEL_CONTEXT) }, { status: 400 });
    }

    // FULL Brain access (not filtered)
    const sec = await db.select().from(brain_cache).where(eq(brain_cache.kind, 'section'));
    const allBrain = sec
      .map((c: any) => { try { return JSON.parse(c.payload_json); } catch { return null; } })
      .filter(Boolean);

    // Channel-specific sections (priority)
    const channelKeywords: Record<string, RegExp> = {
      d2c: /d2c|sklep|allegro|persona|priorytety|reguły decyzyjne dla d2c|kpi d2c/i,
      allegro: /d2c|sklep|allegro/i,
      rossmann_full: /rossmann|drogeria|nogi portfolio/i,
      rossmann_test: /rossmann|test/i,
      rossmann_amoya: /amo'?ya|private label/i,
      b2b_premium: /b2b|hurt|horeca|kawiarni|hotel|sklep prezentowy/i,
      export: /eksport|export|DE|niemcy|EU/i,
      other_chains: /spar|intermarche|super-pharm|bio planet|sieci|inne polskie sieci/i,
    };

    const re = channelKeywords[channel];
    const channelSections = allBrain.filter((s: any) => re.test((s.title || '') + ' ' + (s.content || '').slice(0, 500)));
    const otherStrategySections = allBrain.filter((s: any) => {
      const t = (s.title || '').toLowerCase();
      return /strategia|cele|kpi|finanse|marża|launchów|pipeline|konkurencja|persona|reguły|fundamenty|priorytety/.test(t);
    }).slice(0, 15);

    // Existing launches (with target_channels)
    const launches = await db.select().from(product_launches);
    const launchesForThisChannel = launches.filter((l: any) => {
      if (l.status === 'launched' || l.status === 'cancelled') return false;
      try { const ch = JSON.parse(l.target_channels || '[]'); return ch.includes(channel); } catch { return false; }
    });

    // Brand profile
    let brandData: any = null;
    try {
      const bpRows = await db.select().from(brand_profile).where(eq(brand_profile.id, 1)).limit(1);
      brandData = bpRows[0] || null;
    } catch {}

    const channelDef = CHANNEL_CONTEXT[channel];

    const system = `Jesteś PORTFOLIO ARCHITECT dla Brown House & Tea, fokus: kanał ${channel.toUpperCase()}.

═══════════════════════════════════════════
KANAŁ ${channel.toUpperCase()} — DEFINICJA STRATEGICZNA
═══════════════════════════════════════════
${channelDef}

═══════════════════════════════════════════
TWOJA ROBOTA
═══════════════════════════════════════════
Zaproponuj DOKŁADNIE ${count} produktów / linii / zestawów które:
1. PASUJĄ do tego kanału (jego klient, format, pricing, dystrybucja)
2. WYPEŁNIAJĄ luki w obecnym portfolio kanału (zobacz launchesForThisChannel — co już mamy)
3. SĄ STRATEGICZNIE ZGODNE z fundamentami z Brain (cele, persony, reguły decyzyjne)
4. KAŻDA propozycja ma DETALICZNE uzasadnienie:
   - dlaczego TEN kanał (vs inne)
   - dlaczego TERAZ (sezon / luka / sygnał z danych)
   - co JĄ wzmacnia w portfolio kanału (synergia)
   - dlaczego NIE pasuje do innych kanałów (anty-uzasadnienie)
   - jakie ryzyko / co może pójść nie tak

Pisz po polsku. KONKRET, nie ogólniki ("premium herbata na święta" → ŹLE; "Earl Grey Reserve - single origin Sri Lanka, 80g, 89zł, edycja 1500 szt z dec/jan launchem dla VIP D2C" → DOBRZE).

Wywołaj emit_proposals dokładnie raz.`;

    const tools = [{
      name: 'emit_proposals',
      description: 'Emit channel-specific product proposals',
      input_schema: {
        type: 'object',
        required: ['channel_diagnosis', 'gap_analysis', 'proposals'],
        properties: {
          channel_diagnosis: { type: 'string', description: '2-3 zdania: stan kanału w pipeline TERAZ. Co już ma, czego brakuje, jaka kondycja.' },
          gap_analysis: { type: 'array', items: { type: 'string' }, description: '3-5 konkretnych luk w obecnym portfolio kanału' },
          proposals: {
            type: 'array',
            description: `${count} propozycji produktów dla tego kanału`,
            items: {
              type: 'object',
              required: ['name', 'category', 'short_pitch', 'why_this_channel', 'why_now', 'portfolio_synergy', 'why_not_other_channels', 'risk', 'priority', 'estimated_price_pln', 'suggested_month'],
              properties: {
                name: { type: 'string' },
                category: { type: 'string', description: 'matcha | herbata_owocowa | herbata_czarna | herbata_zielona | cold_brew | akcesoria | herbata_funkcjonalna | zestaw | limitowana_edycja' },
                short_pitch: { type: 'string', description: '1-2 zdania: co to, dla kogo, czym się wyróżnia. KONKRET (gramatura, smak, pochodzenie).' },
                why_this_channel: { type: 'string', description: 'KLUCZOWE — dlaczego TEN kanał. Klient kanału, format, pricing fit, distribution fit.' },
                why_now: { type: 'string', description: 'Sezon / luka w pipeline / sygnał z danych / event' },
                portfolio_synergy: { type: 'string', description: 'Co wzmacnia w obecnym portfolio kanału. Z czym tworzy parę.' },
                why_not_other_channels: { type: 'string', description: 'Anty-uzasadnienie. Dlaczego NIE pasuje gdzie indziej (np. dlaczego nie do Rossmanna).' },
                risk: { type: 'string', description: 'Co może pójść nie tak. Ryzyko kanibalizacji / popytu / pricing.' },
                priority: { type: 'string', enum: ['must_have', 'nice_to_have', 'future'] },
                estimated_price_pln: { type: 'number', description: 'Cena retail (PLN). Dla B2B podaj retail price PLN, marża B2B = 60-70%.' },
                suggested_month: { type: 'string', description: 'YYYY-MM kiedy launch ma sens' },
                target_channels: { type: 'array', items: { type: 'string' }, description: 'Wszystkie kanały gdzie produkt pasuje (powinien być TEN kanał + ewentualnie inne).' },
              },
            },
          },
        },
      },
    }];

    const userMsg = `${userPrompt ? '========== INSTRUKCJA DODATKOWA OD UŻYTKOWNIKA ==========\n' + userPrompt + '\n\n' : ''}========== OBECNY PIPELINE TEGO KANAŁU ==========
${launchesForThisChannel.length === 0 ? '(brak — kanał pusty, oferta TYLKO z istniejącego katalogu)' : launchesForThisChannel.map((l: any) => '- ' + l.name + (l.category ? ' [' + l.category + ']' : '') + (l.price_pln ? ' (' + l.price_pln + ' PLN)' : '') + (l.short_pitch ? ' — ' + l.short_pitch : '')).join('\n')}

========== STRATEGIA KANAŁU Z BRAIN (priorytet) ==========
${channelSections.length === 0 ? '(brak)' : channelSections.slice(0, 8).map((s: any) => '### ' + s.title + '\n' + (s.content || '').slice(0, 1800)).join('\n\n')}

========== POZOSTAŁA STRATEGIA Z BRAIN (cele, persony, KPI, marże, fundamenty) ==========
${otherStrategySections.map((s: any) => '### ' + s.title + '\n' + (s.content || '').slice(0, 1500)).join('\n\n')}

${brandData ? '========== PROFIL MARKI ==========\n' + JSON.stringify({
  brand_voice: brandData.brand_voice,
  visual_mood: brandData.visual_mood,
  target_persona: brandData.target_persona,
  do_list: brandData.do_list,
  dont_list: brandData.dont_list,
}, null, 2) : ''}

Zaproponuj ${count} produktów dla kanału ${channel}.`;

    const client = new Anthropic({ apiKey });
    const r = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 5000,
      tools,
      tool_choice: { type: 'tool', name: 'emit_proposals' },
      system,
      messages: [{ role: 'user', content: userMsg }],
    });

    const tu = r.content.find((c: any) => c.type === 'tool_use');
    if (!tu) return NextResponse.json({ error: 'no tool output' }, { status: 500 });
    const out: any = { ...tu.input };
    for (const k of ['proposals', 'gap_analysis']) {
      if (typeof out[k] === 'string') {
        try { out[k] = JSON.parse(out[k]); } catch {}
      }
    }
    if (Array.isArray(out.proposals)) {
      out.proposals = out.proposals.map((p: any) => {
        if (typeof p?.target_channels === 'string') {
          try { p.target_channels = JSON.parse(p.target_channels); } catch {}
        }
        return p;
      });
    }
    return NextResponse.json({
      ok: true,
      channel,
      proposals_count: Array.isArray(out.proposals) ? out.proposals.length : 0,
      generated_at: new Date().toISOString(),
      ...out,
    });
  } catch (e: any) {
    console.error('[propose-for-channel]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
