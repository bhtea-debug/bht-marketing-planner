// @ts-nocheck
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { DollarSign, TrendingDown, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/shell';
import Card from '@/components/ui/card';
import StatsCard from '@/components/ui/stats-card';
import MonthPlanWizard from '@/components/planner/month-plan-wizard';

const MONTH_NAMES = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

export default function BudgetPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardMonth, setWizardMonth] = useState<string | null>(null);

  // Build the next 6 months including current
  const upcomingMonths = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({ key, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
    }
    return out;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch('/api/campaigns').then((x) => (x.ok ? x.json() : [])),
          fetch('/api/channels').then((x) => (x.ok ? x.json() : [])),
        ]);
        if (!cancelled) {
          setCampaigns(r1 || []);
          setChannels(r2 || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { totalBudget, spent, remaining, utilizationPercentage, monthlyRows, channelRows } = useMemo(() => {
    const totalBudget = campaigns.reduce(
      (s, c) => s + Number(c.budget_planned || 0),
      0
    );
    const spent = campaigns.reduce((s, c) => s + Number(c.budget_spent || 0), 0);
    const remaining = totalBudget - spent;
    const utilizationPercentage = totalBudget
      ? Math.round((spent / totalBudget) * 100)
      : 0;

    // Bucket by month of start_date
    const buckets: Record<string, { planned: number; actual: number }> = {};
    for (const c of campaigns) {
      if (!c.start_date) continue;
      const d = new Date(c.start_date);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[key]) buckets[key] = { planned: 0, actual: 0 };
      buckets[key].planned += Number(c.budget_planned || 0);
      buckets[key].actual += Number(c.budget_spent || 0);
    }
    const monthlyRows = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [y, m] = key.split('-');
        return {
          month: `${MONTH_NAMES[Number(m) - 1]} ${y}`,
          planned: v.planned,
          actual: v.actual,
          difference: v.planned - v.actual,
        };
      });

    // Per-channel breakdown (incl. tiktok, meta paid, email, etc.)
    const chanMap: Record<number, { name: string; color: string }> = {};
    for (const c of channels) chanMap[c.id] = { name: c.name, color: c.color };
    const chanBuckets: Record<string, { name: string; color: string; planned: number; actual: number; count: number }> = {};
    for (const c of campaigns) {
      const meta = chanMap[c.channel_id];
      const key = meta?.name || 'inne';
      if (!chanBuckets[key]) chanBuckets[key] = { name: key, color: meta?.color || '#94a3b8', planned: 0, actual: 0, count: 0 };
      chanBuckets[key].planned += Number(c.budget_planned || 0);
      chanBuckets[key].actual += Number(c.budget_spent || 0);
      chanBuckets[key].count += 1;
    }
    // Always show TikTok row even if 0 — so user sees the gap
    if (!chanBuckets['tiktok']) chanBuckets['tiktok'] = { name: 'tiktok', color: '#000000', planned: 0, actual: 0, count: 0 };
    const channelRows = Object.values(chanBuckets).sort((a, b) => b.planned - a.planned);

    return { totalBudget, spent, remaining, utilizationPercentage, monthlyRows, channelRows };
  }, [campaigns, channels]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finanse"
        icon={DollarSign}
        title="Budżet marketingowy"
        description="Śledzenie i zarządzanie budżetem kampanii marketingowych."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Budżet całkowity"
          value={`${totalBudget.toLocaleString()} PLN`}
          icon={DollarSign}
        />
        <StatsCard
          title="Wydano"
          value={`${spent.toLocaleString()} PLN`}
          icon={TrendingDown}
        />
        <StatsCard
          title="Pozostało"
          value={`${remaining.toLocaleString()} PLN`}
          icon={AlertCircle}
        />
        <StatsCard
          title="% wykorzystania"
          value={`${utilizationPercentage}%`}
          icon={CheckCircle}
        />
      </div>

      <Card
        title="Planowanie miesięczne z AI"
        subtitle="AI zidentyfikuje luki w planie, ściągnie historię + sprzedaż + stocki i zaproponuje plan tygodniowy"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {upcomingMonths.map((m) => {
            const hasPlan = monthlyRows.some((r) => r.month === m.label);
            return (
              <button
                key={m.key}
                onClick={() => setWizardMonth(m.key)}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50/60 ${
                  hasPlan ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50/40'
                }`}
              >
                <div className="flex items-center gap-1 text-xs text-indigo-700">
                  <Sparkles className="w-3 h-3" />
                  {hasPlan ? 'Edytuj plan' : 'Zaplanuj'}
                </div>
                <div className="text-sm font-medium text-slate-900">{m.label}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Budżet miesięczny" subtitle="Porównanie planu z rzeczywistością">
        {loading ? (
          <p className="text-slate-500 text-sm py-6 text-center">Ładowanie danych…</p>
        ) : monthlyRows.length === 0 ? (
          <p className="text-slate-500 text-sm py-6 text-center">
            Brak kampanii w bazie. Dodaj kampanie w sekcji „Kampanie", aby zobaczyć rozbicie miesięczne.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Miesiąc</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">Planowany</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">Rzeczywisty</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">Różnica</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">%</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-900">{row.month}</td>
                    <td className="text-right py-3 px-4 text-slate-900">
                      {row.planned.toLocaleString()} PLN
                    </td>
                    <td className="text-right py-3 px-4 text-slate-900">
                      {row.actual.toLocaleString()} PLN
                    </td>
                    <td
                      className={`text-right py-3 px-4 ${
                        row.difference >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {row.difference >= 0 ? '+' : ''}
                      {row.difference.toLocaleString()} PLN
                    </td>
                    <td className="text-right py-3 px-4 text-slate-900">
                      {row.planned > 0
                        ? Math.round((row.actual / row.planned) * 100)
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Budżet per kanał" subtitle="Rozbicie planu i wydatków per platforma — w tym TikTok jako osobna linia">
        {loading ? (
          <p className="text-slate-500 text-sm py-6 text-center">Ładowanie...</p>
        ) : channelRows.length === 0 ? (
          <p className="text-slate-500 text-sm py-6 text-center">Brak kanałów do wyświetlenia.</p>
        ) : (
          <div className="space-y-2.5">
            {channelRows.map((c, idx) => {
              const pct = totalBudget > 0 ? (c.planned / totalBudget) * 100 : 0;
              const utilization = c.planned > 0 ? Math.min(100, (c.actual / c.planned) * 100) : 0;
              return (
                <div key={idx} className="bg-white rounded-xl border border-slate-200/60 p-3">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[13px] font-semibold text-slate-900 capitalize">{c.name}</div>
                          <div className="text-[11px] text-slate-500">{c.count} {c.count === 1 ? 'kampania' : 'kampanii'} {c.name === 'tiktok' && c.count === 0 && '— brak zaplanowanych'}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[13px] font-bold text-slate-900">{c.planned.toLocaleString()} PLN</div>
                          <div className="text-[11px] text-slate-500">wydano: {c.actual.toLocaleString()} PLN</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${utilization}%`, backgroundColor: c.color, opacity: 0.85 }} />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 min-w-[36px] text-right">{Math.round(pct)}% planu</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {wizardMonth && (
        <MonthPlanWizard
          initialMonth={wizardMonth}
          onClose={() => setWizardMonth(null)}
        />
      )}
    </div>
  );
}
