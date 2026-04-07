// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

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
    setStep('generating');
    setError(null);
    try {
      const r = await fetch('/api/planner/month-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, accountId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'generation failed');
      setPlan(j.data.plan);
      setDebug(j.data.debug);
      setStep('review');
    } catch (e: any) {
      setError(e.message);
      setStep('error');
    }
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
              <p className="text-sm text-slate-600">Analizuję historię, sprzedaż, stocki i kalendarz…</p>
              <p className="text-xs text-slate-500">To może zająć 20–40 sekund.</p>
            </div>
          )}

          {step === 'review' && plan && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-1">{plan.summary}</h3>
                <div className="text-xs text-amber-800">
                  Tygodnie z luką: {debug?.gapWeeks?.join(', ') || 'brak'} • Łączny budżet propozycji:{' '}
                  {plan.totalBudget?.toLocaleString()} PLN
                </div>
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
                {plan.weeks?.map((w: any, i: number) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-4">
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

                    <div className="space-y-2">
                      {w.channels?.map((ch: any, ci: number) => (
                        <div
                          key={ci}
                          className="bg-slate-50 rounded p-2 text-xs flex items-start justify-between gap-3"
                        >
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
                          <div className="text-slate-900 font-medium whitespace-nowrap">
                            {ch.budget_pln?.toLocaleString()} PLN
                          </div>
                        </div>
                      ))}
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
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Zapisz jako kampanie draft
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
