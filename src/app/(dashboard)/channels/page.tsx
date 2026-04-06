'use client';

import React from 'react';
import {
  Instagram,
  Facebook,
  TrendingUp,
  Mail,
  Search,
  Zap,
} from 'lucide-react';

interface ChannelStats {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  activeCampaigns: number;
  totalBudget: number;
  keyMetricLabel: string;
  keyMetricValue: string;
  performanceChange: number;
  performanceType: 'positive' | 'negative';
}

const MOCK_CHANNELS: ChannelStats[] = [
  {
    id: '1',
    name: 'Instagram',
    icon: <Instagram size={24} />,
    color: '#E1306C',
    activeCampaigns: 2,
    totalBudget: 7300,
    keyMetricLabel: 'Zasięg',
    keyMetricValue: '125,400',
    performanceChange: 12,
    performanceType: 'positive',
  },
  {
    id: '2',
    name: 'Facebook',
    icon: <Facebook size={24} />,
    color: '#1877F2',
    activeCampaigns: 1,
    totalBudget: 3200,
    keyMetricLabel: 'Konwersje',
    keyMetricValue: '284',
    performanceChange: 8,
    performanceType: 'positive',
  },
  {
    id: '3',
    name: 'TikTok',
    icon: <Zap size={24} />,
    color: '#000000',
    activeCampaigns: 0,
    totalBudget: 0,
    keyMetricLabel: 'Widoki',
    keyMetricValue: '0',
    performanceChange: 0,
    performanceType: 'negative',
  },
  {
    id: '4',
    name: 'Pinterest',
    icon: <TrendingUp size={24} />,
    color: '#E60023',
    activeCampaigns: 0,
    totalBudget: 0,
    keyMetricLabel: 'Kliknięcia',
    keyMetricValue: '0',
    performanceChange: 0,
    performanceType: 'negative',
  },
  {
    id: '5',
    name: 'Email',
    icon: <Mail size={24} />,
    color: '#0EA5E9',
    activeCampaigns: 1,
    totalBudget: 750,
    keyMetricLabel: 'Współczynnik otwarć',
    keyMetricValue: '34.2%',
    performanceChange: 5,
    performanceType: 'positive',
  },
  {
    id: '6',
    name: 'SEO',
    icon: <Search size={24} />,
    color: '#10B981',
    activeCampaigns: 1,
    totalBudget: 1800,
    keyMetricLabel: 'Pozycja średnia',
    keyMetricValue: '8.3',
    performanceChange: 3,
    performanceType: 'positive',
  },
  {
    id: '7',
    name: 'Google Ads',
    icon: <Zap size={24} />,
    color: '#4285F4',
    activeCampaigns: 0,
    totalBudget: 5950,
    keyMetricLabel: 'ROAS',
    keyMetricValue: '3.2x',
    performanceChange: 15,
    performanceType: 'positive',
  },
];

function ChannelCard({ channel }: { channel: ChannelStats }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-lg"
              style={{
                backgroundColor: `${channel.color}20`,
              }}
            >
              <div style={{ color: channel.color }}>{channel.icon}</div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{channel.name}</h3>
          </div>
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: channel.color }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-5 space-y-5 bg-gray-50">
        {/* Active Campaigns */}
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Aktywne kampanie
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{channel.activeCampaigns}</p>
        </div>

        {/* Total Budget */}
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Całkowity budżet
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${channel.totalBudget.toLocaleString()}
          </p>
        </div>

        {/* Key Metric */}
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            {channel.keyMetricLabel}
          </p>
          <div className="flex items-end justify-between mt-1">
            <p className="text-2xl font-bold text-gray-900">{channel.keyMetricValue}</p>
            {channel.performanceChange !== 0 && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                  channel.performanceType === 'positive'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                <TrendingUp size={14} />
                {channel.performanceType === 'positive' ? '+' : '-'}
                {channel.performanceChange}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-white border-t border-gray-100">
        <button className="w-full text-center text-amber-700 hover:text-amber-800 text-sm font-medium transition-colors py-2">
          Przejdź do szczegółów →
        </button>
      </div>
    </div>
  );
}

export default function ChannelsPage() {
  const totalBudget = MOCK_CHANNELS.reduce((sum, channel) => sum + channel.totalBudget, 0);
  const activeCampaigns = MOCK_CHANNELS.reduce((sum, channel) => sum + channel.activeCampaigns, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Kanały marketingowe</h1>
        <p className="text-stone-600 mt-2">
          Zarządzaj kanałami marketingowymi i monitoruj wydajność Brown House & Tea
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Budget */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200 p-6">
          <p className="text-sm font-medium text-amber-900 uppercase tracking-wide">
            Całkowity budżet kanałów
          </p>
          <p className="text-3xl font-bold text-amber-900 mt-2">
            ${totalBudget.toLocaleString()}
          </p>
          <p className="text-sm text-amber-800 mt-2">We wszystkich aktywnych kampaniach</p>
        </div>

        {/* Active Campaigns */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-6">
          <p className="text-sm font-medium text-green-900 uppercase tracking-wide">
            Aktywne kampanie
          </p>
          <p className="text-3xl font-bold text-green-900 mt-2">{activeCampaigns}</p>
          <p className="text-sm text-green-800 mt-2">Kampanii w trakcie realizacji</p>
        </div>
      </div>

      {/* Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_CHANNELS.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} />
        ))}
      </div>
    </div>
  );
}
