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
      kawiarnie: 'Kawiarnie — niezależne, specialty, sieciowe. Szukają premium herbaty i matchy do menu napojów.',
      restauracje: 'Restauracje — fine dining, bistro, casual dining. Potrzebują eleganckiej oferty herbacianej do menu.',
      sklepy: 'Sklepy specjalistyczne — herbaciarnie, delikatesy, sklepy ze zdrową żywnością, eko-sklepy. Szukają unikalnych produktów na półkę.',
      hotele: 'Hotele i SPA — potrzebują premium herbaty do pokoi, restauracji hotelowej i strefy wellness.',
      biura: 'Biura i coworkingi — firmy szukające herbaty premium do kuchni pracowniczej lub strefy relaksu.',
    };

    const segmentInfo = segmentDescriptions[segment] || `Segment B2B: ${segment}`;

    const system = `Jesteś ekspertem od B2B lead generation dla Brown House & Tea — polskiej marki premium herbaty, matchy i akcesoriów.

TWOJA ROLA: Zaprojektuj KOMPLETNĄ kampanię Meta Lead Ads (Facebook + Instagram) targetującą segment B2B.

========== O MARCE ==========
Brown House & Tea to polska marka premium herbaty i matchy. Oferujemy:
- Herbaty sypane premium (zielone, czarne, oolong, białe, rooibos)
- Matcha ceremonialna i kulinarna (w tym latte-grade)
- Akcesoria do parzenia (czajniki, czarki, chasen)
- Zestawy degustacyjne i pakiety startowe dla biznesu
Mamy hurtowe ceny dla B2B, darmowe próbki do testów, szkolenia baristyczne z matchy.
Wyróżniki: polska marka, bezpośredni import, kontrola jakości, certyfikaty organiczne na wybrane pozycje.

========== SEGMENT DOCELOWY ==========
${segmentInfo}

========== WYMAGANIA KAMPANII ==========
Musisz zaprojektować PEŁNĄ kampanię end-to-end:

1. STRATEGIA KAMPANII
   - Cel kampanii i KPI
   - Unique selling proposition dla tego segmentu
   - Ton komunikacji (B2B ale nie korporacyjny — premium, partnerski)

2. COPY REKLAMOWE (3 warianty)
   Każdy wariant:
   - Headline (max 40 znaków)
   - Primary text (max 125 znaków)
   - Description (max 30 znaków)
   - CTA button text
   Warianty powinny testować różne kąty: (A) jakość/premium, (B) marża/zysk, (C) trend/matcha

3. KIERUNEK KREACJI WIZUALNEJ
   - 3 koncepcje graficzne z opisem
   - Styl zdjęć, kolorystyka, mood
   - Co powinno być na grafice (produkt w kontekście biznesowym)

4. TARGETING META
   - Grupy zainteresowań
   - Lookalike audiences (jeśli dostępne)
   - Geo-targeting (Polska, miasta?)
   - Wykluczenia

5. FORMULARZ LEADOWY
   - Intro screen (nagłówek + opis)
   - Pytania do formularza (5-8 pytań, mix otwartych i zamkniętych)
   - Thank you screen z next steps
   - Privacy policy note

6. BUDŻET I HARMONOGRAM
   - Podział budżetu (jeśli podany)
   - Fazy kampanii (test → scale)
   - Estymowane CPA i liczba leadów

7. FOLLOW-UP SEQUENCE
   - Email 1: natychmiastowy (po wypełnieniu formularza)
   - Email 2: follow-up po 2 dniach
   - Email 3: last chance po 5 dniach
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
