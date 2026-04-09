// @ts-nocheck
// AI-driven interview: asks smart questions about the business,
// saves answers as planning_knowledge entries.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { planning_knowledge } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensurePlanningKnowledge } from '@/lib/ensure-tables';
import Anthropic from '@anthropic-ai/sdk';

// POST /api/planner/knowledge/interview
// Body: { action: 'ask' }                   → generate next batch of questions
// Body: { action: 'answer', answers: [...] } → save answers + generate follow-ups
export async function POST(req: NextRequest) {
  try {
    await ensurePlanningKnowledge();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 500 });

    const body = await req.json();
    const action = body.action || 'ask';

    // Load existing knowledge so the AI doesn't re-ask things it already knows.
    const existing = await db
      .select()
      .from(planning_knowledge)
      .where(eq(planning_knowledge.active, 1));
    const knowledgeContext = existing
      .map((r: any) => `[${r.category}] ${r.content}`)
      .join('\n');

    const client = new Anthropic({ apiKey });

    if (action === 'answer' && Array.isArray(body.answers)) {
      // Save each answer as a knowledge entry
      const now = new Date().toISOString();
      const saved: any[] = [];
      for (const a of body.answers) {
        if (!a.answer || !a.answer.trim()) continue;
        const row = await db
          .insert(planning_knowledge)
          .values({
            category: a.category || 'preference',
            content: a.content || `[Q: ${a.question}] ${a.answer}`,
            source: 'interview',
            active: 1,
            created_at: now,
          })
          .returning({ id: planning_knowledge.id });
        saved.push(row[0]);
      }

      // Now generate follow-up questions based on what we just learned
      const updatedKnowledge = [
        knowledgeContext,
        ...body.answers.map((a: any) => `[${a.category || 'preference'}] [Q: ${a.question}] ${a.answer}`),
      ].join('\n');

      const followUp = await generateQuestions(client, updatedKnowledge, 'follow-up');
      return NextResponse.json({
        data: {
          saved: saved.length,
          followUpQuestions: followUp,
        },
      });
    }

    // action === 'ask' — generate initial questions
    const questions = await generateQuestions(client, knowledgeContext, 'initial');
    return NextResponse.json({ data: { questions } });
  } catch (e: any) {
    console.error('[interview]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function generateQuestions(
  client: any,
  existingKnowledge: string,
  mode: 'initial' | 'follow-up'
): Promise<any[]> {
  const systemPrompt = `Jesteś AI strategiem marketingowym dla Brown House & Tea (polski sklep e-commerce z herbatą premium). Twoim zadaniem jest przeprowadzenie wywiadu z właścicielem, żeby lepiej planować kampanie.

ZNASZ JUŻ:
${existingKnowledge || '(brak — to pierwszy wywiad)'}

CEL: Zadaj pytania które KONKRETNIE pomogą w planowaniu kampanii, tworzeniu zadań, ustalaniu priorytetów i organizacji pracy.

KATEGORIE pytań (w kolejności ważności):
1. PRODUCT — co sprzedajecie, co jest flagowe, co chcecie promować, co wypada z oferty, sezonowość
2. AUDIENCE — kto kupuje, kto jest idealny, co ich boli, jak mówią o herbacie
3. CHANNEL — które kanały działają, które nie, co robicie sami a co zlecacie, ile czasu macie na content
4. VISUAL — jaki styl zdjęć, co lubicie a co nie, kto robi zdjęcia, jakie moodboardy
5. POLICY — jak działa logistyka, progi, promocje, co absolutnie NIE robicie
6. PREFERENCE — jak lubicie pracować, co priorytetyzujecie, ile osób w zespole, kto co robi
7. LESSON — co się sprawdzało, co nie, jakie kampanie były hitami, jakie klapami

ZASADY:
- Zadaj ${mode === 'initial' ? '4-6' : '2-4'} pytań
- Każde pytanie musi być KONKRETNE i przydatne (nie "opowiedz o marce" — to za ogólne)
- NIE pytaj o rzeczy które już znasz (patrz ZNASZ JUŻ)
- Każde pytanie ma mieć suggested_answers (3-4 podpowiedzi) + opcję wolnego tekstu
- Pytania po polsku, naturalnie, jak rozmowa z konsultantem
- ${mode === 'follow-up' ? 'To jest kontynuacja — pogłęb to co właśnie się dowiedziałeś, dopytuj o szczegóły.' : 'Zacznij od najważniejszych luk w wiedzy.'}

Zwróć JSON array:
[{
  "id": "unique_slug",
  "category": "product|audience|channel|visual|policy|preference|lesson",
  "question": "treść pytania po polsku",
  "why": "1 zdanie: dlaczego to pytanie pomoże w planowaniu",
  "suggested_answers": ["opcja 1", "opcja 2", "opcja 3"],
  "allow_custom": true,
  "priority": "high|medium"
}]`;

  const res = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: mode === 'initial'
          ? 'Wygeneruj pierwsze pytania wywiadu. Skup się na największych lukach w wiedzy.'
          : 'Wygeneruj pytania follow-up na podstawie odpowiedzi które właśnie dostałeś.',
      },
    ],
  });

  const text = res.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  // Extract JSON array from response
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return [];
}
