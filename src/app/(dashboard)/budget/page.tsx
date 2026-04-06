'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
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

const budgetByChannelData = [
  { name: 'Reklamy', value: 6000 },
  { name: 'Treści', value: 3500 },
  { name: 'Narzędzia', value: 3000 },
  { name: 'Influencerzy', value: 1500 },
  { name: 'Inne', value: 500 },
];

const budgetByCategoryPie = [
  { name: 'Reklamy', value: 6000 },
  { name: 'Treści', value: 3500 },
  { name: 'Narzędzia', value: 3000 },
  { name: 'Influencerzy', value: 1500 },
  { name: 'Inne', value: 500 },
];

const COLORS = ['#A0826D', '#C5A572', '#D9B8A0', '#E8D4C4', '#F2E5D7'];

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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget by Channel - Horizontal Bar Chart */}
        <Card title="Budżet na kanały" subtitle="Alokacja budżetu po kanałach marketingowych">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={budgetByChannelData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={190} />
              <Tooltip
                formatter={(value) => `${value.toLocaleString()} PLN`}
                contentStyle={{
                  backgroundColor: '#fafaf8',
                  border: '1px solid #e7e5e4',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="#A0826D" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Budget by Category - Pie Chart */}
        <Card title="Podział budżetu" subtitle="Procentowy udział kategorii">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={budgetByCategoryPie}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) =>
                  `${name}: ${Math.round((value / totalBudget) * 100)}%`
                }
                outerRadius={100}
                fill="#A0826D"
                dataKey="value"
              >
                {budgetByCategoryPie.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [
                  `${Math.round((value / totalBudget) * 100)}%`,
                  'Udział',
                ]}
                contentStyle={{
                  backgroundColor: '#fafaf8',
                  border: '1px solid #e7e5e4',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Budget Summary */}
      <Card title="Streszczenie budżetu" subtitle="Podsumowanie wydatków">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-l-4 border-amber-700 pl-4">
            <p className="text-sm text-stone-600 mb-1">Średni koszt miesięczny</p>
            <p className="text-2xl font-bold text-stone-900">
              {Math.round(spent / 6).toLocaleString()} PLN
            </p>
          </div>
          <div className="border-l-4 border-amber-600 pl-4">
            <p className="text-sm text-stone-600 mb-1">Największa kategoria</p>
            <p className="text-2xl font-bold text-stone-900">Reklamy</p>
            <p className="text-sm text-stone-500 mt-1">40% budżetu</p>
          </div>
          <div className="border-l-4 border-amber-500 pl-4">
            <p className="text-sm text-stone-600 mb-1">Projektowany koniec roku</p>
            <p className="text-2xl font-bold text-stone-900">
              {Math.round((spent / 6) * 12).toLocaleString()} PLN
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
