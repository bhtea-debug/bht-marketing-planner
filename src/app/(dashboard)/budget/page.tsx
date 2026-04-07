// @ts-nocheck
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { DollarSign, TrendingDown, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
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
        const res = await fetch('/api/campaigns');
        const data = res.ok ? await res.json() : [];
        if (!cancelled) setCampaigns(data || []);
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

  const { totalBudget, spent, remaining, utilizationPercentage, monthlyRows } = useMemo(() => {
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

    return { totalBudget, spent, remaining, utilizationPercentage, monthlyRows };
  }, [campaigns]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Budżet marketingowy</h1>
        <p className="text-slate-600 mt-2">
          Śledzenie i zarządzanie budżetem kampanii marketingowych
        </p>
      </div>

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
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition hover:border-amber-400 hover:bg-amber-50 ${
                  hasPlan ? 'border-slate-200 bg-white' : 'border-amber-300 bg-amber-50/40'
                }`}
              >
                <div className="flex items-center gap-1 text-xs text-amber-700">
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

      {wizardMonth && (
        <MonthPlanWizard
          initialMonth={wizardMonth}
          onClose={() => setWizardMonth(null)}
        />
      )}
    </div>
  );
}
