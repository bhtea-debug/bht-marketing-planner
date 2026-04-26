// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { Users, Heart, Eye, TrendingUp } from 'lucide-react';
import Card from '@/components/ui/card';
import StatsCard from '@/components/ui/stats-card';
import { PageHeader } from '@/components/shell';
import { BarChart3 as KPIIcon } from 'lucide-react';

// Channel selector tabs
const channels = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'email', label: 'Email' },
];

export default function KPIPage() {
  const [selectedChannel, setSelectedChannel] = useState('all');

  const stats = [
    { label: 'Obserwujący', value: '14,100', change: 8, icon: Users },
    { label: 'Zaangażowanie', value: '4.8%', change: 12, icon: Heart },
    { label: 'Reach', value: '58,500', change: 15, icon: Eye },
    { label: 'Konwersje', value: '340', change: 21, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pomiar"
        icon={KPIIcon}
        title="Wskaźniki KPI"
        description="Śledzenie wydajności kampanii marketingowych."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <StatsCard
            key={idx}
            title={stat.label}
            value={stat.value}
            change={stat.change}
            changeType="positive"
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Channel Tabs */}
      <Card title="Wybierz kanał" subtitle="Przeglądaj metryki dla wybranego kanału">
        <div className="flex flex-wrap gap-2">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedChannel === channel.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              {channel.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Summary */}
      <Card title="Podsumowanie" subtitle="Ogólne statystyki">
        <div className="text-center text-slate-600">
          <p>Wybrano kanał: <strong>{selectedChannel}</strong></p>
        </div>
      </Card>
    </div>
  );
}
