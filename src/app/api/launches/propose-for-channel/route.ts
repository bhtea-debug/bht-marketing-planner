// @ts-nocheck
export const maxDuration = 180;
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { product_launches, brain_cache, brand_profile, planning_knowledge } from '@/db/schema';
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

    // Planning knowledge — owner-curated insights and lessons (CRITICAL for realism)
    let knowledge: any[] = [];
    try {
      knowledge = await db.select().from(planning_knowledge).where(eq(planning_knowledge.active, 1));
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

═══════════════════════════════════════════
KONKRETNOŚĆ — NIE NEGOCJUJEMY
═══════════════════════════════════════════
KAŻDA propozycja MUSI być KONKRETNA. NIE wolno pisać:
- "premium herbata zimowa" — to nie jest produkt, to kategoria
- "blend funkcyjny" — co to konkretnie?
- "matcha o nowym smaku" — JAKI smak, jaki gram, jaka cena
- "limitowana edycja" — JAKIEJ edycji, ile sztuk, jaka cena, kiedy

DOBRA propozycja MUSI mieć:
1. NAZWA: konkretna, premium, gotowa na półkę (np. "Earl Grey Royal Reserve" NIE "Premium Earl Grey")
2. SHORT_PITCH: format + gram + dwie cechy + dla kogo, np. "Single-origin Earl Grey z plantacji Nuwara Eliya (Sri Lanka), 80g w aluminium pouch, esencja bergamotki we Włoszech (NIE syntetyk). Format: 80g loose-leaf. Dla connoiseurów Earl Grey z D2C, którzy szukają czegoś lepszego niż supermarket Twinings."
3. CATEGORY z listy
4. ESTIMATED_PRICE_PLN: konkretna kwota (nie zakres)
5. SUGGESTED_MONTH: YYYY-MM
6. WHY_THIS_CHANNEL: dlaczego ten klient kanału kupi (z odniesieniem do persony, sytuacji zakupowej)
7. WHY_NOW: konkretny sygnał (sezon X, luka portfolio Y, sygnał z danych Z, brak konkurenta W)
8. PORTFOLIO_SYNERGY: które EXISTING produkty z którymi tworzą parę / cross-sell / story arc
9. WHY_NOT_OTHER_CHANNELS: co dyskwalifikuje z Rossmanna/B2B/Eksport (KONKRET: niche, pricing, format, demand)
10. RISK: konkretne ryzyko (kanibalizacja produktu X / pricing wyżej niż Y / popyt niepewny bo Z)

DLA D2C SPECIFIC:
- Klient D2C zna markę, szuka GŁĘBI oferty
- 4 persony: Tea Connoisseur (29% — single-origin, edukacja), Wellness Daily (35% — abonament, regularne), Gift Giver (25% — zestawy, opakowania), Discount Hunter (25% — flash sales)
- D2C ma być KURATOROWANY — niedostępny gdzie indziej
- Format zwykle 50-100g, czasem 25g sample, czasem 200g+ rolne
- Cena retail premium 39-159zł z reguły, akcesoria 89-289zł
- Cele 2026: 420tys obrotu (+50%), priorytety: VIP program (506 osób), Iced Tea (lato), 3 segmenty zawodowe (pielęgniarka/student/biuro), Matcha Ritual Box

DLA ROSSMANN PEŁNA:
- 1820 sklepów, 47% obrotu BHT 2028 = 5.8M
- 3 nogi: matcha hero (Premium Japan, Lattea, Focus, Crazy Good) + funkcyjne wellness (Hydration, ZERO) + smakowe premium (Strawberry Lemonade, Caramel Pear, Raspberry Rose)
- Klient: świadomy kupujący, drogeria, kupuje pojedyncze SKU
- Format STANDARD 50g/100g w aluminium z window
- Cena ROSSMANN: 19-39zł (NIE premium niche 89zł — to nie ten klient)
- NIE wchodzi: gyokuro/single-origin (zbyt niche), akcesoria (drogeria nie sprzeda), limited prestige

DLA B2B HoReCa:
- Klient: kawiarnie specialty, hotele butikowe, sklepy prezentowe
- Format: kg+ packaging (250g, 500g, 1kg)
- Cena B2B 60-70% retail
- Pasuje: Matcha Lattea ZERO, iced lines, premium single-origin, akcesoria pro (chasen, chawan), zestawy prezentowe
- NIE pasuje: limited single SKU dla konsumenta

DLA EKSPORT DE:
- Pilotaż 2026, DE = największy specialty tea EU
- Klient: dystrybutor specialty, sklep online DE
- Najmocniejsze: Matcha Premium Japan, single-origin (Darjeeling, Assam), polish-origin storytelling
- Format: paczki w EN+DE labels

═══════════════════════════════════════════
REALIZM OPERACYJNY (TWARDA ZASADA)
═══════════════════════════════════════════
TWOJE PROPOZYCJE MUSZĄ BYĆ MOŻLIWE DO ZREALIZOWANIA przez BHT. NIE proponuj:

1. **Hyper-niche surowców** których BHT może nie mieć dostawcy:
   - "First flush 2026" / "Single-plantation Shizuoka 2026" / "Yamamoto Reserve" / "Kabusencha" — TO TRUDNE do pozyskania w Polsce, BHT może tego NIE MIEĆ
   - Bezpieczne: "sencha japońska premium" / "matcha japońska" / "blend wellness" — kategorie które już są w obrocie BHT
   - Jeśli proponujesz konkretny single-origin / region / typ pierwszego zbioru — DODAJ flag "wymaga walidacji dostawcy"

2. **Edycji pod jeden zawód jako głównego targetu** (np. "Pielęgniarka Edition", "Strażak Edition"):
   - Zbyt wąskie okno czasowe (jeden Dzień Zawodu w roku) = mała sprzedaż przy dużym wysiłku
   - LEPIEJ: szeroki segment potrzeb obejmujący KILKA zawodów. Nazwa: "Shift Worker Focus" / "Late Hours Energy" / "Przepracowani — bądźcie OK"
   - Targetuj POTRZEBĘ (zmęczenie, koncentracja w nocy, regeneracja po stresie), NIE konkretny zawód

3. **Aromaty naturalne premium są STANDARDEM BHT (USP):**
   - BHT codziennie używa naturalnych aromatów 95%+ z owoców — to ICH siła vs konkurencja używająca syntetyków
   - WOLNO i NALEŻY proponować herbaty smakowe z naturalnymi aromatami premium ("aromat malinowy 95% naturalny", "100% z owoców")
   - NIE bój się tego — to BHT, nie supermarketowy brand
   - Komunikuj różnicę: "podczas gdy inni używają syntetyków, BHT robi z prawdziwych owoców"

4. **Limitowanych edycji jako głównej strategii**:
   - 1000 szt × 79 zł = 79k zł brutto, marża ~30%, czyli ~24k zł netto za 4-6 tyg pracy zespołu (label, foto, copy, kupon, mailing)
   - To MAŁO. Limitki OK, ale max 1-2 SKU rocznie. Reszta MUSI być produkty stałe / subskrypcje / zestawy uniwersalne (passive revenue)

5. **Wymagań niemożliwych logistycznie**:
   - Sezonowych produktów których surowiec wymaga zamówienia 6+ miesięcy wcześniej
   - Custom packagingu który wymaga dostawcy spoza obecnego portfela BHT

PREFERUJ propozycje SKALOWALNE które mogą być w sprzedaży 12 miesięcy w roku.

═══════════════════════════════════════════
KRYTYCZNE: Najpierw wypełnij pole proposals (NAJWAŻNIEJSZE — to dla usera). Potem KRÓTKO diagnose i gaps. NIE marnuj tokens na długi opis kanału. Każda propozycja ma być wykorzystywalna jako przyszły launch.

Wywołaj emit_proposals dokładnie raz.`;

    const tools = [{
      name: 'emit_proposals',
      description: 'Emit channel-specific product proposals',
      input_schema: {
        type: 'object',
        required: ['proposals', 'channel_diagnosis', 'gap_analysis'],
        properties: {
          proposals: {
            type: 'array',
            description: `${count} propozycji produktów dla tego kanału`,
            items: {
              type: 'object',
              required: ['name', 'category', 'short_pitch', 'format_grams', 'why_this_channel', 'why_now', 'portfolio_synergy', 'why_not_other_channels', 'risk', 'priority', 'estimated_price_pln', 'suggested_month'],
              properties: {
                name: { type: 'string', description: 'Konkretna, premium nazwa gotowa na półkę. NIE generic ("Premium Matcha"). Konkret ("Matcha Yamamoto Reserve" / "Hydration Hero Iced Lemon").' },
                category: { type: 'string', description: 'matcha | herbata_owocowa | herbata_czarna | herbata_zielona | cold_brew | akcesoria | herbata_funkcjonalna | zestaw | limitowana_edycja' },
                short_pitch: { type: 'string', description: 'OBOWIĄZKOWO konkret: nazwa + gram + 1-2 cechy odróżniające + dla kogo. Min 30 słów, max 60. Przykład OK: "Single-origin Sencha Sakura z plantacji Shizuoka, 60g loose leaf w aluminium pouch z handmade label. Subtelne nuty kwiatów wiśni, naturalne (NIE aromat), edycja tylko wiosna 2026 (limit 800 szt). Dla Tea Connoisseur D2C który czeka na sezonowy single-origin." Przykład ZŁY: "Premium herbata wiosenna" (NIC nie znaczy).' },
                format_grams: { type: 'string', description: 'Konkretny format opakowania, np. "60g loose leaf alu pouch", "100g tin can", "20 sashetek × 2g", "kg blok B2B", "zestaw 3×50g + chasen". Bez tego propozycja jest kompletna jak ulotka reklamowa.' },
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
          channel_diagnosis: { type: 'string', description: 'KRÓTKO max 80 słów: stan kanału w pipeline TERAZ. Co już ma, czego brakuje. NIE pisz długiego eseju — najważniejsze są PROPOZYCJE.' },
          gap_analysis: { type: 'array', items: { type: 'string', description: 'max 25 słów każda' }, description: '3-5 konkretnych luk, max 25 słów każda' },
        },
      },
    }];

    const userMsg = `${userPrompt ? '========== INSTRUKCJA DODATKOWA OD UŻYTKOWNIKA ==========\n' + userPrompt + '\n\n' : ''}========== OBECNY PIPELINE TEGO KANAŁU ==========
${launchesForThisChannel.length === 0 ? '(brak — kanał pusty, oferta TYLKO z istniejącego katalogu)' : launchesForThisChannel.map((l: any) => '- ' + l.name + (l.category ? ' [' + l.category + ']' : '') + (l.price_pln ? ' (' + l.price_pln + ' PLN)' : '') + (l.short_pitch ? ' — ' + l.short_pitch : '')).join('\n')}

========== STRATEGIA KANAŁU Z BRAIN (priorytet) ==========
${channelSections.length === 0 ? '(brak)' : channelSections.slice(0, 8).map((s: any) => '### ' + s.title + '\n' + (s.content || '').slice(0, 1800)).join('\n\n')}

========== POZOSTAŁA STRATEGIA Z BRAIN (cele, persony, KPI, marże, fundamenty) ==========
${otherStrategySections.map((s: any) => '### ' + s.title + '\n' + (s.content || '').slice(0, 1500)).join('\n\n')}

${knowledge.length > 0 ? '========== WNIOSKI Z PRZESZŁOŚCI (krytyczne — NIE łamać) ==========\n' + knowledge.map((k: any) => '[' + k.category + '] ' + k.content).join('\n') + '\n\n' : ''}${brandData ? '========== PROFIL MARKI ==========\n' + JSON.stringify({
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
      max_tokens: 8000,
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
