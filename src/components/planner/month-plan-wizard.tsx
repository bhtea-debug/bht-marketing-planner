// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, AlertTriangle, Send, Palette } from 'lucide-react';

interface Props {
  initialMonth?: string; // 'YYYY-MM'
  onClose: () => void;
}

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

export default function MonthPlanWizard({ initialMonth, onClose }: Props) {
  const todayMonth = new Date().toISOString().slice(0, 7);
  const [step, setStep] = useState<'config' | 'generating' | 'review' | 'saving' | 'done' | 'error'>(
    'config'
  );
  const [month, setMonth] = useState(initialMonth || todayMonth);
  const [accountId, setAccountId] = useState<string>('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [debug, setDebug] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [pushing, setPushing] = useState<string | null>(null);
  const [pushResults, setPushResults] = useState<Record<string, any>>({});
  // week-by-week generation progress
  const [weekQueue, setWeekQueue] = useState<number[]>([]);
  const [weekDoneCount, setWeekDoneCount] = useState(0);
  const [weekCurrent, setWeekCurrent] = useState<number | null>(null);
  const [weekErrors, setWeekErrors] = useState<Record<number, string>>({});
  const [sharedContext, setSharedContext] = useState<any>(null);

  // Parse a streamed response: heartbeat spaces followed by '\n' + final JSON.
  // Falls back to plain JSON if no newline found (backwards compat).
  async function parseStreamedJSON(r: Response): Promise<any> {
    const raw = await r.text();
    const lastNewline = raw.lastIndexOf('\n');
    const jsonPart = lastNewline >= 0 ? raw.slice(lastNewline + 1) : raw;
    try {
      return JSON.parse(jsonPart);
    } catch {
      // not JSON — bubble up so caller can show snippet
      throw new Error(jsonPart.slice(0, 200) || raw.slice(0, 200) || 'empty response');
    }
  }

  // ----- ISO week helpers (mirror of server-side) -----
  function isoWeekNum(d: Date): number {
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
  function futureIsoWeeksOfMonth(monthYYYYMM: string): number[] {
    const [yStr, mStr] = monthYYYYMM.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd = new Date(Date.UTC(y, m, 0));
    const weeks: number[] = [];
    for (let d = new Date(monthStart); d <= monthEnd; d.setUTCDate(d.getUTCDate() + 1)) {
      const w = isoWeekNum(d);
      if (!weeks.includes(w)) weeks.push(w);
    }
    const today = new Date();
    const currentWeek = isoWeekNum(today);
    return weeks.filter((w) => w >= currentWeek);
  }

  function pushKey(wi: number, ci: number) {
    return `${wi}-${ci}`;
  }

  async function pushChannel(week: any, ch: any, wi: number, ci: number) {
    const key = pushKey(wi, ci);
    setPushing(key);
    try {
      const isMeta = (ch.channel || '').toLowerCase().includes('meta');
      const isEmail = (ch.channel || '').toLowerCase().includes('email');
      const heroNames = (week.hero_products || []).map((p: any) => p.name || p);
      const linkUrl = ch.link_url || 'https://brownhouseandtea.pl';

      if (isMeta) {
        const r = await fetch('/api/push/meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tile: {
              campaign_name: `[Planner] ${week.label || 'W' + week.isoWeek} - ${ch.format}`,
              adset_name: `${week.theme || 'BHT'} - ${ch.audience || 'broad'}`,
              ad_name: (ch.creative_hook || '').slice(0, 60),
              headline: ch.creative_hook || ch.headline || week.theme,
              body: ch.body || ch.creative_hook,
              cta: 'SHOP_NOW',
              link_url: linkUrl,
              audience_hint: ch.audience,
              budget_pln: Number(ch.budget_pln || 0),
              creative_format: (ch.format || '').includes('video') ? 'video' : 'single_image',
              hero_products: heroNames,
              start_date: week.start_date || null,
              end_date: week.end_date || null,
            },
            status: 'PAUSED',
            source_ref: `${month}-w${week.isoWeek}-c${ci}`,
          }),
        });
        const j = await r.json();
        setPushResults((prev) => ({ ...prev, [key]: r.ok ? j.data : { error: j.error } }));
      } else if (isEmail) {
        const r = await fetch('/api/push/getresponse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tile: {
              subject: ch.creative_hook || `${week.theme}`,
              headline: week.theme,
              body: ch.creative_hook || week.rationale,
              link_url: linkUrl,
              cta_label: ch.cta || 'Sprawdź',
              internal_name: `[Planner] ${week.label || 'W' + week.isoWeek}`,
            },
            source_ref: `${month}-w${week.isoWeek}-c${ci}`,
          }),
        });
        const j = await r.json();
        setPushResults((prev) => ({ ...prev, [key]: r.ok ? j.data : { error: j.error } }));
      } else {
        setPushResults((prev) => ({ ...prev, [key]: { error: 'Push obsługiwany tylko dla meta_* i email' } }));
      }
    } catch (e: any) {
      setPushResults((prev) => ({ ...prev, [key]: { error: e.message } }));
    } finally {
      setPushing(null);
    }
  }

  // Load Meta ad accounts on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/meta/ads/accounts');
        if (r.ok) {
          const j = await r.json();
          const list = j?.data || [];
          setAccounts(list);
          if (list[0]) setAccountId(list[0].id);
        }
      } catch {}
    })();
  }, []);

  async function generate() {
    setError(null);
    setWeekErrors({});
    setWeekDoneCount(0);
    setPlan(null);
    setDebug(null);

    const weeks = futureIsoWeeksOfMonth(month);
    if (weeks.length === 0) {
      setError('Brak nadchodzących tygodni w tym miesiącu (wszystkie minęły).');
      setStep('error');
      return;
    }

    setWeekQueue(weeks);
    setStep('generating');

    // Step 1: fetch the heavy shared context ONCE (Meta + Woo + brand + launches)
    let sharedContext: any = null;
    try {
      const cr = await fetch('/api/planner/plan-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, accountId }),
      });
      const cj = await cr.json();
      if (!cr.ok) throw new Error(cj.error || 'plan-context failed');
      sharedContext = cj.data;
      setSharedContext(sharedContext);
    } catch (e: any) {
      setError('Nie udało się pobrać kontekstu (Meta/Woo/brand): ' + e.message);
      setStep('error');
      return;
    }

    // Seed an empty plan that we'll fill week-by-week
    const seed: any = {
      summary: `Plan tygodniowy dla ${month}`,
      totalBudget: 0,
      weeks: [],
      warnings: [],
      next_actions: [],
    };
    setPlan(seed);
    // Switch to review immediately so user sees progress + tiles as they arrive
    setStep('review');

    let runningTotal = 0;
    for (const w of weeks) {
      setWeekCurrent(w);
      try {
        const r = await fetch('/api/planner/week-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month, isoWeek: w, context: sharedContext }),
        });
        // Read as text first so we can handle non-JSON (Vercel error pages, timeouts)
        const raw = await r.text();
        let j: any = null;
        try {
          j = JSON.parse(raw);
        } catch {
          // non-JSON: probably a Vercel function-killed error page
          const snippet = raw.slice(0, 140).replace(/\s+/g, ' ');
          setWeekErrors((prev) => ({
            ...prev,
            [w]: `HTTP ${r.status} (timeout funkcji?): ${snippet}`,
          }));
          continue;
        }
        if (!r.ok) {
          const detail = j.error || `HTTP ${r.status}`;
          const extra = j.parseError ? ` | parse: ${j.parseError}` : '';
          const rawSnip = j.raw ? ` | raw: ${String(j.raw).slice(0, 200).replace(/\s+/g, ' ')}` : '';
          setWeekErrors((prev) => ({ ...prev, [w]: detail + extra + rawSnip }));
        } else {
          const wk = j.data.week;
          runningTotal += Number(wk?.weekly_budget_pln || 0);
          setPlan((prev: any) => ({
            ...prev,
            totalBudget: runningTotal,
            weeks: [...(prev?.weeks || []), wk],
          }));
        }
      } catch (e: any) {
        setWeekErrors((prev) => ({ ...prev, [w]: e.message }));
      } finally {
        setWeekDoneCount((c) => c + 1);
      }
    }

    setWeekCurrent(null);
  }

  async function retryFailedWeeks() {
    const failed = Object.keys(weekErrors).map(Number);
    if (failed.length === 0) return;
    setWeekErrors({});
    let runningTotal = Number(plan?.totalBudget || 0);
    for (const w of failed) {
      setWeekCurrent(w);
      try {
        const r = await fetch('/api/planner/week-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ month, isoWeek: w, context: sharedContext }),
        });
        let j: any = null;
        try {
          j = await parseStreamedJSON(r);
        } catch (parseErr: any) {
          setWeekErrors((prev) => ({
            ...prev,
            [w]: `HTTP ${r.status} (parse): ${parseErr.message}`,
          }));
          continue;
        }
        // Streaming endpoint always returns 200; check the body for error.
        if (!r.ok || j?.error || !j?.data?.week) {
          const detail = j?.error || `HTTP ${r.status}`;
          const extra = j?.parseError ? ` | parse: ${j.parseError}` : '';
          const rawSnip = j?.raw
            ? ` | raw: ${String(j.raw).slice(0, 300).replace(/\s+/g, ' ')}`
            : '';
          setWeekErrors((prev) => ({ ...prev, [w]: detail + extra + rawSnip }));
        } else {
          const wk = j.data.week;
          runningTotal += Number(wk?.weekly_budget_pln || 0);
          setPlan((prev: any) => ({
            ...prev,
            totalBudget: runningTotal,
            weeks: [...(prev?.weeks || []), wk].sort(
              (a: any, b: any) => (a.isoWeek || 0) - (b.isoWeek || 0)
            ),
          }));
        }
      } catch (e: any) {
        setWeekErrors((prev) => ({ ...prev, [w]: e.message }));
      }
    }
    setWeekCurrent(null);
  }

  async function save() {
    setStep('saving');
    try {
      const r = await fetch('/api/planner/month-plan/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, month }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'save failed');
      setSavedCount(j.data.createdCount || 0);
      setStep('done');
    } catch (e: any) {
      setError(e.message);
      setStep('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Kreator planu miesięcznego
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'config' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                AI sprawdzi, w których tygodniach miesiąca nie ma jeszcze planu, ściągnie historię
                kampanii Meta, dane sprzedażowe Woo i stocki, a następnie zaproponuje plan
                tygodniowy z konkretnymi produktami, mechaniką, hookami i budżetem.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Miesiąc</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Konto reklamowe Meta
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                >
                  {accounts.length === 0 && <option value="">— brak połączonego konta —</option>}
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={generate}
                disabled={!accountId}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-lg px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Wygeneruj plan
              </button>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              <p className="text-sm text-slate-600">Pobieram historię Meta, sprzedaż Woo i profil marki…</p>
              <p className="text-xs text-slate-500">To zajmie 5–20 sekund. Potem polecą tygodnie.</p>
            </div>
          )}

          {step === 'review' && plan && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-1">{plan.summary}</h3>
                <div className="text-xs text-amber-800">
                  Tygodni: {plan.weeks?.length || 0} / {weekQueue.length} • Łączny budżet:{' '}
                  {plan.totalBudget?.toLocaleString() || 0} PLN
                </div>
                {weekCurrent !== null && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-amber-900">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generuję tydzień {weekCurrent}… ({weekDoneCount}/{weekQueue.length})
                  </div>
                )}
                {weekCurrent === null && weekDoneCount > 0 && weekDoneCount === weekQueue.length && (
                  <div className="mt-2 text-xs text-emerald-800 font-medium">
                    ✓ Wszystkie tygodnie wygenerowane
                  </div>
                )}
                {Object.keys(weekErrors).length > 0 && (
                  <div className="mt-2 text-xs text-rose-800">
                    <div>
                      Błędy w tygodniach:{' '}
                      {Object.entries(weekErrors).map(([w, err]) => (
                        <div key={w} className="ml-2">• T{w}: {err}</div>
                      ))}
                    </div>
                    {weekCurrent === null && (
                      <button
                        onClick={retryFailedWeeks}
                        className="mt-2 bg-rose-600 hover:bg-rose-700 text-white rounded px-3 py-1 text-xs font-medium"
                      >
                        Powtórz nieudane tygodnie
                      </button>
                    )}
                  </div>
                )}
              </div>

              {plan.warnings?.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-rose-900 font-medium text-sm">
                    <AlertTriangle className="w-4 h-4" /> Ostrzeżenia
                  </div>
                  <ul className="text-xs text-rose-800 list-disc pl-5">
                    {plan.warnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                {plan.weeks?.map((w: any, wi: number) => (
                  <div key={wi} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {w.label || `Tydzień ${w.isoWeek}`}
                        </div>
                        <div className="text-xs text-slate-500">
                          {w.dateRange} • {w.theme}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">
                          {w.weekly_budget_pln?.toLocaleString()} PLN
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">{w.rationale}</p>

                    {w.hero_products?.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-slate-700 mb-1">Hero produkty</div>
                        <div className="flex flex-wrap gap-1">
                          {w.hero_products.map((p: any, pi: number) => (
                            <span
                              key={pi}
                              className="text-xs bg-slate-100 text-slate-700 rounded px-2 py-0.5"
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {w.promo?.type && w.promo.type !== 'none' && (
                      <div className="text-xs text-slate-700 mb-2">
                        <strong>Promo:</strong> {w.promo.type} {w.promo.value} —{' '}
                        {w.promo.mechanics}
                      </div>
                    )}

                    {w.designer_summary && (
                      <div className="mb-3 bg-amber-50 border border-amber-200 rounded p-2 text-xs">
                        <div className="font-semibold text-amber-900 flex items-center gap-1">
                          <Palette className="w-3 h-3" /> Brief wizualny tygodnia
                        </div>
                        <div className="text-amber-900 mt-0.5">{w.designer_summary}</div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {w.channels?.map((ch: any, ci: number) => {
                        const k = pushKey(wi, ci);
                        const result = pushResults[k];
                        const isPushable =
                          /meta/i.test(ch.channel || '') || /email/i.test(ch.channel || '');
                        const vb = ch.visual_brief;
                        return (
                          <div key={ci} className="bg-slate-50 rounded p-2 text-xs">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="font-medium text-slate-900">
                                  {ch.channel} · {ch.format}
                                  {ch.objective ? ` · ${ch.objective}` : ''}
                                </div>
                                <div className="text-slate-700 mt-0.5">"{ch.creative_hook}"</div>
                                <div className="text-slate-500 mt-0.5">
                                  CTA: {ch.cta} • Audience: {ch.audience} • KPI: {ch.expected_kpi}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 whitespace-nowrap">
                                <div className="text-slate-900 font-medium">
                                  {ch.budget_pln?.toLocaleString()} PLN
                                </div>
                                {isPushable && (
                                  <button
                                    onClick={() => pushChannel(w, ch, wi, ci)}
                                    disabled={pushing === k || result?.campaign_id || result?.newsletter_id}
                                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-[11px] px-2 py-1 rounded flex items-center gap-1"
                                  >
                                    {pushing === k ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Send className="w-3 h-3" />
                                    )}
                                    {result?.campaign_id || result?.newsletter_id ? 'Wysłano' : 'Push'}
                                  </button>
                                )}
                              </div>
                            </div>
                            {vb && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-orange-700 font-medium text-[11px]">
                                  Brief graficzny
                                </summary>
                                <div className="mt-1 pl-2 border-l-2 border-orange-200 space-y-0.5 text-[11px]">
                                  {vb.scene && <div><b>Scena:</b> {vb.scene}</div>}
                                  {vb.props?.length && <div><b>Rekwizyty:</b> {vb.props.join(', ')}</div>}
                                  {vb.lighting && <div><b>Światło:</b> {vb.lighting}</div>}
                                  {vb.composition && <div><b>Kompozycja:</b> {vb.composition}</div>}
                                  {vb.palette?.length && (
                                    <div className="flex items-center gap-1">
                                      <b>Paleta:</b>
                                      {vb.palette.map((c: string, pi: number) => (
                                        <span
                                          key={pi}
                                          title={c}
                                          className="inline-block w-3 h-3 rounded-full border border-slate-300"
                                          style={{ background: c }}
                                        />
                                      ))}
                                    </div>
                                  )}
                                  {vb.mood_keywords?.length && (
                                    <div><b>Mood:</b> {vb.mood_keywords.join(' · ')}</div>
                                  )}
                                  {vb.do && <div className="text-emerald-700"><b>Do:</b> {vb.do}</div>}
                                  {vb.dont && <div className="text-red-700"><b>Don't:</b> {vb.dont}</div>}
                                  {vb.reference_note && (
                                    <div className="text-slate-500"><b>Ref:</b> {vb.reference_note}</div>
                                  )}
                                </div>
                              </details>
                            )}
                            {result && (
                              <div className="mt-2 text-[11px]">
                                {result.error ? (
                                  <div className="text-red-600">⚠ {result.error}</div>
                                ) : (
                                  <div className="text-emerald-700">
                                    ✓ {result.campaign_id ? 'Kampania PAUSED w Meta' : 'Draft w GR'}{' '}
                                    {result.manage_url && (
                                      <a
                                        href={result.manage_url}
                                        target="_blank"
                                        rel="noopener"
                                        className="underline ml-1"
                                      >
                                        Otwórz
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {w.linked_calendar_tasks?.length > 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        Kalendarz: {w.linked_calendar_tasks.join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {plan.next_actions?.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-slate-700 mb-1">Kolejne kroki</div>
                  <ul className="text-xs text-slate-600 list-disc pl-5">
                    {plan.next_actions.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 sticky bottom-0 bg-white pt-2">
                <button
                  onClick={() => setStep('config')}
                  className="flex-1 border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Wstecz
                </button>
                <button
                  onClick={save}
                  disabled={weekCurrent !== null || !(plan?.weeks?.length > 0)}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-lg px-4 py-2 text-sm font-medium"
                >
                  {weekCurrent !== null ? 'Czekaj na zakończenie generacji…' : 'Zapisz jako kampanie draft'}
                </button>
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
              <p className="text-sm text-slate-600">Zapisuję kampanie i zadania w kalendarzu…</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center py-12 gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <p className="text-base font-medium text-slate-900">
                Zapisano {savedCount} kampanii draft
              </p>
              <p className="text-sm text-slate-600">
                Otwórz zakładkę „Kampanie", żeby przejrzeć i aktywować.
              </p>
              <button
                onClick={onClose}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-6 py-2 text-sm font-medium"
              >
                Zamknij
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center py-12 gap-3">
              <AlertTriangle className="w-10 h-10 text-rose-600" />
              <p className="text-base font-medium text-slate-900">Coś poszło nie tak</p>
              <p className="text-sm text-slate-600 max-w-md text-center">{error}</p>
              <button
                onClick={() => setStep('config')}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-6 py-2 text-sm font-medium"
              >
                Spróbuj ponownie
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
