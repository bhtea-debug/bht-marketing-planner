// @ts-nocheck
export const runtime = 'edge';
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// POST /api/b2b-leads/generate
// Body: { segment, objective?, budget_pln?, user_notes?, previousCampaign? }
// Generates a full B2B lead-gen campaign for Meta Lead Ads targeting HoReCa.
export async function POST(req: NextRequest) {
  try {
    const { segment, objective, budget_pln, user_notes, previousCampaign } = await req.json();
    if (!segment) return NextResponse.json({ error: 'segment required' }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

    const segmentDescriptions: Record<string, string> = {
      kawiarnia: 'Kawiarnia — niezależne, specialty, sieciowe. Bawimy się herbatą, może pobawiecie się z nami? Linia LATTEA i HoReCa stworzona pod kawiarniane menu. Ponad 60 autorskich blendów od matcha po owocowe.',
      kawiarnia_weganska: 'Kawiarnia wegańska — herbata może być kraftowa i w pełni roślinna. 100% roślinne składniki, żadnych kompromisów. Herbaty BIO, mieszanki ziołowe, owocowe — idealne do wegańskiego menu.',
      bistro_brunch: 'Bistro / brunch — do brunchu pasuje coś więcej niż kawa. Herbaty deserowe i owocowe — pięknie prezentują się na stole. Linia LATTEA i HoReCa — matchowe latte, chai, herbaty na zimno.',
      piekarnia: 'Piekarnia — znacie to uczucie, kiedy herbata pachnie jak szarlotka? Herbaty z duszą — Apple Pie, mieszanki z korzennymi nutami. Linia LATTEA pod gastronomię — gotowa do podania.',
      palarnia_kawy: 'Palarnia kawy — herbata z manufaktury, tak jak kawa ze specialty. Matcha, hojicha, herbaty jednorodne — japońska precyzja. Gotowe opakowania detaliczne — od razu na półkę obok kawy.',
      delikatesy: 'Delikatesy — każda nasza herbata ma swoją historię. Opakowania, które przyciągają wzrok — zaprojektowane z myślą o półce. Ponad 60 blendów — mieszanki BIO, owocowe, zielone, czarne.',
      sklep_online: 'Sklep online — gotowe do sprzedaży, od blendu po zdjęcie. Gotowe packshoty i opisy — od razu na stronę. Ponad 60 blendów + edycje limitowane — ciągłe nowości.',
      concept_store: 'Concept store — tworzymy herbaty, za którymi stoi opowieść. Opakowania z charakterem — zaprojektowane by wyglądać. Autorskie blendy, LIMITED EDITION, zestawy prezentowe.',
      firma_prezentowa: 'Firma prezentowa — dobry prezent jest taki, który pachnie i opowiada historię. Gotowe zestawy prezentowe i torby upominkowe. Personalizacja etykiet — Wasze logo, dedykacja, branding.',
      hotel_boutique: 'Hotel boutique — wiecie, jaki moment goście zapamiętują? Ten z dobrą herbatą. Linia LATTEA i HoReCa — matcha, hojicha na menu. Herbaty liściaste i mieszanki — ładnie podane w pokoju.',
      sklep_eko: 'Sklep eko — krótki skład i nic do ukrycia, tak robimy herbaty. Herbaty BIO, mieszanki ziołowe i owocowe. Bez sztucznych aromatów i barwników — naturalnie smaczne.',
      sklep_naturalny: 'Sklep naturalny — herbata, którą można polecić z czystym sumieniem. Ponad 60 pozycji — herbaty BIO, ziołowe, owocowe, matcha. Przejrzysty skład — łatwo rekomendować klientom.',
    };

    const segmentInfo = segmentDescriptions[segment] || `Segment B2B: ${segment}`;

    const system = `Jesteś ekspertem od B2B lead generation dla Brown House & Tea — polskiej marki premium herbaty, matchy i akcesoriów.

TWOJA ROLA: Zaprojektuj KOMPLETNĄ kampanię Meta Lead Ads (Facebook + Instagram) targetującą segment B2B.
CEL KAMPANII: Pozyskanie klientów hurtowych do REJESTRACJI w panelu B2B na b2b.brownhouseandtea.pl

========== O MARCE ==========
Brown House & Tea to polska marka premium herbaty i matchy. Oferujemy:
- Herbaty sypane premium (zielone, czarne, oolong, białe, rooibos) — ponad 60 autorskich blendów
- Matcha ceremonialna i kulinarna (w tym latte-grade do LATTEA)
- Linia HoReCa i LATTEA — gotowe rozwiązania gastronomiczne
- Akcesoria do parzenia (czajniki, czarki, chasen)
- Zestawy degustacyjne, pakiety startowe i zestawy prezentowe
- Gotowe packshoty, opisy i materiały marketingowe dla partnerów
- Personalizacja etykiet i opakowań (logo klienta, dedykacje)

Korzyści dla partnerów B2B:
- Panel hurtowy b2b.brownhouseandtea.pl z cenami hurtowymi i prośbą o próbki
- Darmowe próbki do testów przed zamówieniem
- Szkolenia baristyczne z matchy i herbaty
- Progi rabatowe — im więcej zamawiasz, tym taniej
- Gotowe materiały marketingowe (packshoty, opisy, banery)
- Dedykowany opiekun klienta
- Szybka realizacja zamówień hurtowych

Wyróżniki: polska marka, bezpośredni import, kontrola jakości, certyfikaty BIO na wybrane pozycje, autorskie blendy których nie ma u konkurencji.

========== SEGMENT DOCELOWY ==========
${segmentInfo}

========== WYMAGANIA KAMPANII ==========
Musisz zaprojektować PEŁNĄ kampanię end-to-end. WAŻNE: Głównym celem jest zachęcenie do REJESTRACJI na b2b.brownhouseandtea.pl — to hurtowy panel z cenami, próbkami i zamówieniami.

1. STRATEGIA KAMPANII
   - Cel kampanii: rejestracja w panelu B2B i KPI
   - Unique selling proposition dopasowane do konkretnego segmentu
   - Ton komunikacji: partnerski, luźny ale profesjonalny, jak rozmowa z dobrym dostawcą

2. COPY REKLAMOWE (3 warianty)
   Każdy wariant:
   - Headline (max 40 znaków)
   - Primary text (max 125 znaków)
   - Description (max 30 znaków)
   - CTA button text
   Warianty powinny testować różne kąty dopasowane do segmentu. Język naturalny, nie korporacyjny.

3. KIERUNEK KREACJI WIZUALNEJ
   - 3 koncepcje graficzne z opisem
   - Styl zdjęć, kolorystyka, mood — ciepłe brązy, krem, naturalne
   - Co powinno być na grafice (produkt w kontekście biznesowym tego segmentu)

4. TARGETING META
   - Grupy zainteresowań specyficzne dla segmentu
   - Lookalike audiences (jeśli dostępne)
   - Geo-targeting (Polska — uwzględnij czy segment jest bardziej miejski czy ogólnopolski)
   - Wykluczenia

5. FORMULARZ LEADOWY
   - Intro screen z jasnym komunikatem o rejestracji w panelu B2B
   - Pytania (5-8): dane firmy, typ działalności, zainteresowanie produktami, wielkość zamówień
   - Thank you screen z linkiem do b2b.brownhouseandtea.pl i next steps
   - Privacy policy note

6. BUDŻET I HARMONOGRAM
   - Podział budżetu (jeśli podany)
   - Fazy kampanii (test → scale)
   - Estymowane CPA i liczba rejestracji

7. FOLLOW-UP SEQUENCE
   - Email 1: natychmiastowy — powitanie + link do panelu B2B + kod rabatowy na pierwsze zamówienie
   - Email 2: po 2 dniach — prezentacja oferty dopasowanej do segmentu + próbki
   - Email 3: po 5 dniach — last chance z dodatkową zachętą
   - Każdy email: subject, preview text, body (kluczowe punkty)

Wywołaj narzędzie emit_b2b_campaign dokładnie raz.`;

    const userPrompt = `Segment: ${segment}
${objective ? `Cel użytkownika: ${objective}` : ''}
${budget_pln ? `Budżet miesięczny: ${budget_pln} PLN` : 'Budżet: do ustalenia'}
${previousCampaign ? `\n========== POPRZEDNIA KAMPANIA (DO POPRAWY) ==========\n${JSON.stringify(previousCampaign, null, 2)}` : ''}
${user_notes ? `\n========== UWAGI UŻYTKOWNIKA ==========\n${user_notes}\n\nWAŻNE: Uwzględnij powyższe uwagi. Zmień kampanię zgodnie z oczekiwaniami.` : ''}

Zaprojektuj pełną kampanię. Wywołaj emit_b2b_campaign.`;

    const campaignTool = {
      name: 'emit_b2b_campaign',
      description: 'Emituje pełną kampanię B2B lead generation.',
      input_schema: {
        type: 'object',
        required: ['strategy', 'ad_variants', 'creative_concepts', 'targeting', 'lead_form', 'budget_plan', 'follow_up_emails'],
        properties: {
          strategy: {
            type: 'object',
            required: ['campaign_goal', 'kpi', 'usp', 'tone'],
            properties: {
              campaign_goal: { type: 'string' },
              kpi: { type: 'string' },
              usp: { type: 'string' },
              tone: { type: 'string' },
            },
          },
          ad_variants: {
            type: 'array',
            items: {
              type: 'object',
              required: ['variant_name', 'angle', 'headline', 'primary_text', 'description', 'cta'],
              properties: {
                variant_name: { type: 'string' },
                angle: { type: 'string' },
                headline: { type: 'string' },
                primary_text: { type: 'string' },
                description: { type: 'string' },
                cta: { type: 'string' },
              },
            },
          },
          creative_concepts: {
            type: 'array',
            items: {
              type: 'object',
              required: ['concept_name', 'visual_description', 'mood', 'colors'],
              properties: {
                concept_name: { type: 'string' },
                visual_description: { type: 'string' },
                mood: { type: 'string' },
                colors: { type: 'string' },
              },
            },
          },
          targeting: {
            type: 'object',
            required: ['interests', 'geo', 'exclusions'],
            properties: {
              interests: { type: 'array', items: { type: 'string' } },
              lookalike: { type: 'string' },
              geo: { type: 'string' },
              age_range: { type: 'string' },
              exclusions: { type: 'array', items: { type: 'string' } },
            },
          },
          lead_form: {
            type: 'object',
            required: ['intro_headline', 'intro_description', 'questions', 'thank_you_headline', 'thank_you_description'],
            properties: {
              intro_headline: { type: 'string' },
              intro_description: { type: 'string' },
              questions: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['question', 'type'],
                  properties: {
                    question: { type: 'string' },
                    type: { type: 'string', enum: ['short_text', 'multiple_choice', 'email', 'phone', 'dropdown'] },
                    options: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              thank_you_headline: { type: 'string' },
              thank_you_description: { type: 'string' },
            },
          },
          budget_plan: {
            type: 'object',
            required: ['phases', 'estimated_cpa_pln', 'estimated_leads_month'],
            properties: {
              total_monthly_pln: { type: 'number' },
              phases: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['phase_name', 'duration', 'daily_budget_pln', 'goal'],
                  properties: {
                    phase_name: { type: 'string' },
                    duration: { type: 'string' },
                    daily_budget_pln: { type: 'number' },
                    goal: { type: 'string' },
                  },
                },
              },
              estimated_cpa_pln: { type: 'number' },
              estimated_leads_month: { type: 'number' },
            },
          },
          follow_up_emails: {
            type: 'array',
            items: {
              type: 'object',
              required: ['email_name', 'send_after', 'subject', 'preview_text', 'body_points'],
              properties: {
                email_name: { type: 'string' },
                send_after: { type: 'string' },
                subject: { type: 'string' },
                preview_text: { type: 'string' },
                body_points: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    };

    const client = new Anthropic({ apiKey });

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
            max_tokens: 8000,
            system,
            tools: [campaignTool as any],
            tool_choice: { type: 'tool', name: 'emit_b2b_campaign' } as any,
            messages: [{ role: 'user', content: userPrompt }],
          });

          const toolUse = llmRes.content.find((b: any) => b.type === 'tool_use') as any;
          const parsed = toolUse?.input || null;

          alive = false;
          clearInterval(heartbeat);

          const payload = parsed
            ? { data: { campaign: parsed } }
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
    console.error('[b2b-generate]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
