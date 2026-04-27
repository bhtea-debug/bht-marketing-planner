// @ts-nocheck
export const maxDuration = 180;
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { product_launches, brain_cache } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/launches/assign-channels
 * Body: { launchIds?: number[], force?: boolean }
 * - launchIds: only process these. If omitted, all active launches.
 * - force: also re-process launches that already have target_channels.
 *
 * Uses Claude with Brain channel-strategy context to assign target_channels
 * per launch based on product fit. Saves results to DB.
 */
export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'no API key' }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const force = !!body.force;
    const onlyIds: number[] | null = Array.isArray(body.launchIds) ? body.launchIds : null;

    // Fetch launches
    const all = await db.select().from(product_launches);
    const candidates = all.filter((l: any) => {
      if (l.status === 'launched' || l.status === 'cancelled') return false;
      if (onlyIds && !onlyIds.includes(l.id)) return false;
      if (!force && l.target_channels) return false; // skip already-assigned unless forced
      return true;
    });

    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: 'Brak launchów do przypisania' });
    }

    // Pull channel-strategy sections from Brain
    const sec = await db.select().from(brain_cache).where(eq(brain_cache.kind, 'section'));
    const channelStrategy = sec
      .map((c: any) => { try { return JSON.parse(c.payload_json); } catch { return null; } })
      .filter(Boolean)
      .filter((s: any) => {
        const t = (s.title || '').toLowerCase();
        return /1\.5|kana[lł]|d2c|rossmann|b2b|hurt|horeca|amo'?ya|pipeline launch|priorytety/.test(t);
      })
      .map((s: any) => ({ title: s.title, content: typeof s.content === 'string' ? s.content.slice(0, 1500) : '' }))
      .slice(0, 12);

    const system = `Jesteś PORTFOLIO STRATEGIST dla Brown House & Tea. Twoja robota: każdemu launchowi przypisać kanały sprzedaży na podstawie produktu + strategii BHT z Brain.

KANAŁY BHT (z Brain):
- d2c — sklep brownhouseandtea.pl. Pełna oferta. Komunikacja marki. Praktycznie KAŻDY launch tu trafia (bo to "pełna oferta polskiego specjalisty"). Jedyne wyjątki: produkty stricte B2B-only (np. opakowania zbiorcze 1kg+).
- allegro — komplementarny do D2C. Subset bestsellers + nowe SKU które chcemy testować poza ekosystemem Allegro.
- rossmann_full — pełna dystrybucja drogerii (1820 sklepów). 3 nogi: matcha hero (Premium Japan, Lattea, Focus, Crazy Good), funkcyjne wellness (Hydration Heroes, ZERO), smakowe premium (Strawberry Lemonade, Caramel Pear, Raspberry Rose). NIE wchodzi: niche premium gyokuro/single-origin (drogeria nie ten klient), akcesoria, limited-edition prestige.
- rossmann_test — test 100-200 sklepów dla nowych SKU.
- rossmann_amoya — private label (Amo'ya, NIE BHT). Tylko jeśli launch oznaczony jako Amo'ya.
- b2b_premium — Hurt + HoReCa. Klient: kawiarnie, hotele, sklepy prezentowe, firmy. Mix wszystkich kategorii. NAJBARDZIEJ pasuje: Matcha Lattea ZERO, iced lines, premium single-origin, akcesoria. Słabo pasuje: limited-edition single SKU.
- export — DE/EU dystrybutorzy. Pilotaż 2026. Najmocniejsze: Matcha Premium Japan, single-origin, premium niche.
- other_chains — Spar, Intermarche, Super-Pharm, Bio Planet. Nogi 2 dywersyfikacji.

REGUŁY:
- D2C jest praktycznie zawsze (90%+ launchów). Jeśli wykluczasz — uzasadnij.
- Rossmann tylko dla TRZECH konkretnych nóg portfolio (matcha hero, wellness, smakowe premium z odpowiednim pricingiem).
- B2B tylko jeśli produkt/format pasuje do hurtu (kg packaging viable, cena B2B sensowna).
- Eksport tylko dla premium niche / matcha.
- Limited edition / advent / zestawy → D2C + B2B (sklepy prezentowe).
- Akcesoria → D2C only.

Wywołaj emit_assignments dokładnie raz dla wszystkich launchów.`;

    const tools = [{
      name: 'emit_assignments',
      description: 'Emit target_channels per launch',
      input_schema: {
        type: 'object',
        required: ['assignments'],
        properties: {
          assignments: {
            type: 'array',
            items: {
              type: 'object',
              required: ['launch_id', 'target_channels', 'rationale'],
              properties: {
                launch_id: { type: 'integer' },
                target_channels: {
                  type: 'array',
                  description: 'Lista kanałów. Możliwe: d2c, allegro, rossmann_full, rossmann_test, rossmann_amoya, b2b_premium, export, other_chains.',
                  items: { type: 'string' },
                },
                rationale: { type: 'string', description: '1-2 zdania DLACZEGO te kanały. Jeśli D2C wykluczone — wytłumacz.' },
              },
            },
          },
        },
      },
    }];

    const userPrompt = `========== LAUNCHE DO PRZYPISANIA ==========
${candidates.map((l: any) => `id=${l.id} | ${l.name}${l.category ? ' [' + l.category + ']' : ''}${l.price_pln ? ' (' + l.price_pln + ' PLN)' : ''}${l.short_pitch ? ' — ' + l.short_pitch : ''}${l.description ? '\n  desc: ' + (l.description || '').slice(0, 200) : ''}${l.target_audience ? '\n  audience: ' + l.target_audience : ''}`).join('\n\n')}

========== STRATEGIA KANAŁÓW Z BRAIN ==========
${channelStrategy.map((s: any) => '### ' + s.title + '\n' + s.content).join('\n\n')}

Przypisz kanały każdemu launchowi.`;

    const client = new Anthropic({ apiKey });
    const r = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      tools,
      tool_choice: { type: 'tool', name: 'emit_assignments' },
      system,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const tu = r.content.find((c: any) => c.type === 'tool_use');
    if (!tu) return NextResponse.json({ error: 'no tool output' }, { status: 500 });
    const out: any = { ...tu.input };
    if (typeof out.assignments === 'string') {
      try { out.assignments = JSON.parse(out.assignments); } catch {}
    }
    if (!Array.isArray(out.assignments)) {
      return NextResponse.json({ error: 'assignments not array', raw: tu.input }, { status: 500 });
    }

    let saved = 0;
    const result: any[] = [];
    for (const a of out.assignments) {
      try {
        const id = Number(a.launch_id);
        if (!id) continue;
        let channels = Array.isArray(a.target_channels) ? a.target_channels : [];
        if (typeof a.target_channels === 'string') {
          try { channels = JSON.parse(a.target_channels); } catch {}
        }
        await db
          .update(product_launches)
          .set({
            target_channels: JSON.stringify(channels),
            channel_rationale: a.rationale || null,
            updated_at: new Date().toISOString(),
          })
          .where(eq(product_launches.id, id));
        saved++;
        result.push({ id, channels, rationale: a.rationale });
      } catch (e) {
        console.warn('[assign-channels] save failed', e);
      }
    }

    return NextResponse.json({ ok: true, processed: saved, total: candidates.length, assignments: result });
  } catch (e: any) {
    console.error('[assign-channels]', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
