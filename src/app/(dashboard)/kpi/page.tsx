'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Users, Heart, Eye, TrendingUp } from 'lucide-react';
import Card from '@/components/ui/card';
import StatsCard from '@/components/ui/stats-card';

// Channel selector tabs
const channels = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'email', label: 'Email' },
];

// Monthly KPI trend data
const kpiTrendData = [
  {
    month: 'Kwiecień',
    followers: 12500,
    engagement: 4.2,
    reach: 45000,
    conversions: 280,
  },
  {
    month: 'Maj',
    followers: 13200,
    engagement: 4.5,
    reach: 52000,
    conversions: 310,
  },
  {
    month: 'Czerwiec',
    followers: 14100,
    engagement: 4.8,
    reach: 58500,
    conversions: 340,
  },
  {
    month: 'Lipiec',
    followers: 15300,
    engagement: 5.1,
    reach: 64200,
    conversions: 375,
  },
  {
    month: 'Sierpień',
    followers: 16200,
    engagement: 5.3,
    reach: 69800,
    conversions: 405,
  },
  {
    month: 'Wrzesień',
    followers: 17500,
    engagement: 5.6,
    reach: 75400,
    conversions: 445,
  },
];

// Detailed KPI entries by date
const kpiEntries = [
  {
    date: '2026-09-30',
    channel: 'Instagram',
    followers: 17500,
    engagement: 5.6,
    reach: 75400,
    conversions: 445,
  },
  {
    date: '2026-09-25',
    channel: 'Facebook',
    followers: 8200,
    engagement: 3.2,
    reach: 42000,
    conversions: 215,
  },
  {
    date: '2026-09-20',
    channel: 'TikTok',
    followers: 6800,
    engagement: 8.4,
    reach: 125000,
    conversions: 350,
  },
  {
    date: '2026-09-15',
    channel: 'Instagram',
    followers: 17200,
    engagement: 5.4,
    reach: 72000,
    conversions: 420,
  },
  {
    date: '2026-09-10',
    channel: 'Email',
    followers: 3200,
    engagement: 2.8,
    reach: 3200,
    conversions: 95,
  },
  {
    date: '2026-09-05',
    channel: 'Facebook',
    followers: 8000,
    engagement: 3.1,
    reach: 40500,
    conversions: 205,
  },
  {
    date: '2026-08-30',
    channel: 'Instagram',
    followers: 16200,
    engagement: 5.3,
    reach: 69800,
    conversions: 405,
  },
  {
    date: '2026-08-25',
    channel: 'TikTok',
    followers: 6200,
    engagement: 7.9,
    reach: 110000,
    conversions: 320,
  },
  {
    date: '2026-08-20',
    channel: 'Instagram',
    followers: 15900,
    engagement: 5.1,
    reach: 67000,
    conversions: 385,
  },
  {
    date: '2026-08-15',
    channel: 'Email',
    followers: 3100,
    engagement: 2.7,
    reach: 3100,
    conversions: 88,
  },
];

export default function KPIPage() {
  const [selectedChannel, setSelectedChannel] = useState('all');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Wskaźniki KPI</h1>
        <p className="text-stone-600 mt-2">
          Monitorowanie wydajności kanałów marketingowych
        </p>
      </div>

      {/* Channel Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => setSelectedChannel(channel.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              selectedChannel === channel.id
                ? 'bg-amber-700 text-white'
                : 'bg-white text-stone-700 border border-stone-200 hover:border-amber-700'
            }`}
          >
            {channel.label}
          </button>
        ))}
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Obserwujący"
          value="17.5K"
          change={8}
          changeType="positive"
          icon={Users}
        />
        <StatsCard
          title="Zaangażowanie"
          value="5.6%"
          change={5}
          changeType="positive"
          icon={Heart}
        />
        <StatsCard
          title="Zasięg"
          value="75.4K"
          change={12}
          changeType="positive"
          icon={Eye}
        />
        <StatsCard
          title="Konwersje"
          value="445"
          change={14}
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      {/* Monthly Trend Chart */}
      <Card title="Trend wskaźników" subtitle="Zmiana kluczowych metryk w czasie">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={kpiTrendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis
              dataKey="month"
              stroke="#a8a29e"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              yAxisId="left"
              stroke="#a8a29e"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#a8a29e"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fafaf8',
                border: '1px solid #e7e5e4',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="followers"
              stroke="#A0826D"
              strokeWidth={2}
              dot={{ fill: '#A0826D', r: 4 }}
              activeDot={{ r: 6 }}
              name="Obserwujący"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="engagement"
              stroke="#C5A572"
              strokeWidth={2}
              dot={{ fill: '#C5A572', r: 4 }}
              activeDot={{ r: 6 }}
              name="Zaangażowanie (%)"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="reach"
              stroke="#D9B8A0"
              strokeWidth={2}
              dot={{ fill: '#D9B8A0', r: 4 }}
              activeDot={{ r: 6 }}
              name="Zasięg"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="conversions"
              stroke="#E8D4C4"
              strokeWidth={2}
              dot={{ fill: '#E8D4C4', r: 4 }}
              activeDot={{ r: 6 }}
              name="Konwersje"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Detailed KPI Table */}
      <Card title="Historia wskaźników" subtitle="Szczegółowe dane KPI po dacie">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-3 px-4 font-semibold text-stone-900">
                  Data
                </th>
                <th className="text-left py-3 px-4 font-semibold text-stone-900">
                  Kanał
                </th>
                <th className="text-right py-3 px-4 font-semibold text-stone-900">
                  Obserwujący
                </th>
                <th className="text-right py-3 px-4 font-semibold text-stone-900">
                  Zaangażowanie
                </th>
                <th className="text-right py-3 px-4 font-semibold text-stone-900">
                  Zasięg
                </th>
                <th className="text-right py-3 px-4 font-semibold text-stone-900">
                  Konwersje
                </th>
              </tr>
            </thead>
            <tbody>
              {kpiEntries.map((entry, idx) => (
                <tr
                  key={idx}
                  className="border-b border-stone-100 hover:bg-stone-50 transition-colors"
                >
                  <td className="py-3 px-4 text-stone-600 text-sm">
                    {new Date(entry.date).toLocaleDateString('pl-PL')}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-amber-50 text-amber-900 rounded-full text-sm font-medium">
                      {entry.channel}
                    </span>
                  </td>
                  <td className="text-right py-3 px-4 text-stone-900">
                    {entry.followers.toLocaleString('pl-PL')}
                  </td>
                  <td className="text-right py-3 px-4 text-stone-900">
                    {entry.engagement}%
                  </td>
                  <td className="text-right py-3 px-4 text-stone-900">
                    {entry.reach.toLocaleString('pl-PL')}
                  </td>
                  <td className="text-right py-3 px-4 text-stone-900 font-medium">
                    {entry.conversions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* KPI Insights */}
      <Card title="Spostrzeżenia" subtitle="Analiza wydajności kanałów">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border-l-4 border-amber-700 pl-4">
            <p className="text-sm text-stone-600 mb-1">Najszybciej rosnący kanał</p>
            <p className="text-2xl font-bold text-stone-900">Instagram</p>
            <p className="text-sm text-green-600 mt-1">+40% obserwujących w 6 miesięcy</p>
          </div>
          <div className="border-l-4 border-amber-600 pl-4">
            <p className="text-sm text-stone-600 mb-1">Najwyższa konwersja</p>
            <p className="text-2xl font-bold text-stone-900">TikTok</p>
            <p className="text-sm text-green-600 mt-1">8.4% zaangażowania średnio</p>
          </div>
          <div className="border-l-4 border-amber-500 pl-4">
            <p className="text-sm text-stone-600 mb-1">Średni koszt konwersji</p>
            <p className="text-2xl font-bold text-stone-900">32.81 PLN</p>
            <p className="text-sm text-stone-500 mt-1">We wszystkich kanałach</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
