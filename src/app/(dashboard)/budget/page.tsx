// @ts-nocheck
'use client';

import React from 'react';
import { DollarSign, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '@/components/ui/card';
import StatsCard from '@/components/ui/stats-card';

// Mock data
const monthlyBudgetData = [
  { month: 'Kwiecień', planned: 2500, actual: 2400, difference: 100 },
  { month: 'Maj', planned: 2500, actual: 2650, difference: -150 },
  { month: 'Czerwiec', planned: 2500, actual: 2480, difference: 20 },
  { month: 'Lipiec', planned: 2500, actual: 2520, difference: -20 },
  { month: 'Sierpień', planned: 2500, actual: 2580, difference: -80 },
  { month: 'Wrzesień', planned: 2500, actual: 2390, difference: 110 },
];

const totalBudget = 15000;
const spent = 14620;
const remaining = totalBudget - spent;
const utilizationPercentage = Math.round((spent / totalBudget) * 100);

export default function BudgetPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Budżet marketingowy</h1>
        <p className="text-stone-600 mt-2">
          Śledzenie i zarządzanie budżetem kampanii marketingowych
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Budżet całkowity"
          value={`${totalBudget.toLocaleString()} PLN`}
          icon={DollarSign}
        />
        <StatsCard
          title="Wydano"
          value={`${spent.toLocaleString()} PLN`}
          change={12}
          changeType="negative"
          icon={TrendingDown}
        />
        <StatsCard
          title="Pozostało"
          value={`${remaining.toLocaleString()} PLN`}
          change={5}
          changeType="positive"
          icon={AlertCircle}
        />
        <StatsCard
          title="% wykorzystania"
          value={`${utilizationPercentage}%`}
          change={3}
          changeType="negative"
          icon={CheckCircle}
        />
      </div>

      {/* Monthly Budget Table */}
      <Card title="Budżet miesięczny" subtitle="Porównanie planu z rzeczywistością">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-3 px-4 font-semibold text-stone-900">
                  Miesiąc
                </th>
                <th className="text-right py-3 px-4 font-semibold text-stone-900">
                  Planowany
                </th>
                <th className="text-right py-3 px-4 font-semibold text-stone-900">
                  Rzeczywisty
                </th>
                <th className="text-right py-3 px-4 font-semibold text-stone-900">
                  Różnica
                </th>
                <th className="text-right py-3 px-4 font-semibold text-stone-900">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {monthlyBudgetData.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-stone-100 hover:bg-stone-50 transition-colors"
                >
                  <td className="py-3 px-4 text-stone-900">{row.month}</td>
                  <td className="text-right py-3 px-4 text-stone-900">
                    {row.planned.toLocaleString()} PLN
                  </td>
                  <td className="text-right py-3 px-4 text-stone-900">
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
                  <td className="text-right py-3 px-4 text-stone-900">
                    {Math.round((row.actual / row.planned) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
