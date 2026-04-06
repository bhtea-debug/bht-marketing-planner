// @ts-nocheck
'use client';

import React from 'react';
import { Download, Activity, Zap, Target, TrendingUp } from 'lucide-react';
import Card from '@/components/ui/card';
import StatsCard from '@/components/ui/stats-card';

// Channel performance data
const channelPerformanceData = [
  { channel: 'Instagram', reach: 75400, conversions: 445, roi: 3.8 },
  { channel: 'Facebook', reach: 42000, conversions: 215, roi: 2.1 },
  { channel: 'TikTok', reach: 125000, conversions: 350, roi: 2.9 },
  { channel: 'Email', reach: 3200, conversions: 95, roi: 4.2 },
  { channel: 'Inne', reach: 28400, conversions: 140, roi: 1.8 },
];

// Recent activities
const recentActivities = [
  {
    id: 1,
    type: 'post',
    title: 'Nowy post na Instagramie',
    description: 'Dodano fotę z nową kolekcją herbat',
    timestamp: '2026-09-30T14:32:00',
    channel: 'Instagram',
  },
  {
    id: 2,
    type: 'campaign',
    title: 'Kampania "Jesień" uruchomiona',
    description: 'Nowa kampania marketingowa na Facebooku',
    timestamp: '2026-09-28T10:15:00',
    channel: 'Facebook',
  },
];

export default function ReportsPage() {
  const totalReach = channelPerformanceData.reduce((sum, c) => sum + c.reach, 0);
  const totalConversions = channelPerformanceData.reduce((sum, c) => sum + c.conversions, 0);
  const avgROI = (channelPerformanceData.reduce((sum, c) => sum + c.roi, 0) / channelPerformanceData.length).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Raporty</h1>
        <p className="text-stone-600 mt-2">
          Analiza wydajności kampanii i kanałów marketingowych
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Łączny reach"
          value={`${(totalReach / 1000).toFixed(1)}K`}
          change={15}
          changeType="positive"
          icon={Activity}
        />
        <StatsCard
          title="Konwersje"
          value={totalConversions.toString()}
          change={12}
          changeType="positive"
          icon={Target}
        />
        <StatsCard
          title="Średni ROI"
          value={`${avgROI}x`}
          change={8}
          changeType="positive"
          icon={TrendingUp}
        />
        <StatsCard
          title="Wydajność"
          value="Dobra"
          change={5}
          changeType="positive"
          icon={Zap}
        />
      </div>

      {/* Channel Performance Table */}
      <Card title="Wydajność kanałów" subtitle="Statystyki dla każdego kanału">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-3 px-4 font-semibold text-stone-900">Kanał</th>
                <th className="text-right py-3 px-4 font-semibold text-stone-900">Reach</th>
                <th className="text-right py-3 px-4 font-semibold text-stone-900">Konwersje</th>
                <th className="text-right py-3 px-4 font-semibold text-stone-900">ROI</th>
              </tr>
            </thead>
            <tbody>
              {channelPerformanceData.map((data, idx) => (
                <tr key={idx} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4 text-stone-900">{data.channel}</td>
                  <td className="text-right py-3 px-4 text-stone-900">{(data.reach / 1000).toFixed(1)}K</td>
                  <td className="text-right py-3 px-4 text-stone-900">{data.conversions}</td>
                  <td className="text-right py-3 px-4 text-green-600 font-medium">{data.roi}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Activities */}
      <Card title="Ostatnie aktywności" subtitle="Historia zmian w kampaniach">
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="border-b border-stone-100 pb-4 last:border-b-0">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-stone-900">{activity.title}</h3>
                  <p className="text-sm text-stone-600">{activity.description}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="inline-block px-2 py-1 bg-stone-100 rounded text-xs text-stone-600">
                      {activity.channel}
                    </span>
                    <span className="inline-block px-2 py-1 bg-stone-100 rounded text-xs text-stone-600">
                      {new Date(activity.timestamp).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors">
          <Download size={18} />
          Pobierz raport
        </button>
      </div>
    </div>
  );
}
