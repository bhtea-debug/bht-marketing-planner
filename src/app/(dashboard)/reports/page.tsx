'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
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
  {
    id: 3,
    type: 'post',
    title: 'Video TikTok opublikowane',
    description: 'Poradnik: Jak parzyć idealną herbatę',
    timestamp: '2026-09-27T16:45:00',
    channel: 'TikTok',
  },
  {
    id: 4,
    type: 'email',
    title: 'Newsletter wysłany',
    description: 'Wiadomość do 3.2K subskrybentów',
    timestamp: '2026-09-25T09:20:00',
    channel: 'Email',
  },
  {
    id: 5,
    type: 'post',
    title: 'Carousel post na Instagramie',
    description: '5 typów herbat na różne okazje',
    timestamp: '2026-09-23T13:10:00',
    channel: 'Instagram',
  },
  {
    id: 6,
    type: 'campaign',
    title: 'A/B test zakończony',
    description: 'Wariant A uzyskał 12% lepszy CTR',
    timestamp: '2026-09-21T11:30:00',
    channel: 'Facebook',
  },
  {
    id: 7,
    type: 'post',
    title: 'Reel na Instagramie',
    description: 'Unboxing limitowanej edycji',
    timestamp: '2026-09-19T15:55:00',
    channel: 'Instagram',
  },
  {
    id: 8,
    type: 'email',
    title: 'Newsletter wysłany',
    description: 'Promocja weekendowa dla wiernych klientów',
    timestamp: '2026-09-18T08:45:00',
    channel: 'Email',
  },
  {
    id: 9,
    type: 'post',
    title: 'Sponsorowany post',
    description: 'Współpraca z micro-influencerem',
    timestamp: '2026-09-15T12:20:00',
    channel: 'Instagram',
  },
  {
    id: 10,
    type: 'campaign',
    title: 'Nowa kampania na TikToku',
    description: 'Hashtag challenge #BrownHouseChallenge',
    timestamp: '2026-09-12T10:00:00',
    channel: 'TikTok',
  },
];

// Get icon for activity type
const getActivityIcon = (type: string) => {
  switch (type) {
    case 'post':
      return '📸';
    case 'campaign':
      return '🎯';
    case 'email':
      return '📧';
    default:
      return '📝';
  }
};

// Get color badge for channel
const getChannelColor = (channel: string) => {
  switch (channel) {
    case 'Instagram':
      return 'bg-pink-50 text-pink-700';
    case 'Facebook':
      return 'bg-blue-50 text-blue-700';
    case 'TikTok':
      return 'bg-gray-50 text-gray-700';
    case 'Email':
      return 'bg-purple-50 text-purple-700';
    default:
      return 'bg-amber-50 text-amber-700';
  }
};

// Format timestamp
const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'przed chwilą';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m temu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h temu`;
  const days = Math.floor(hours / 24);
  return `${days}d temu`;
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Raporty</h1>
          <p className="text-stone-600 mt-2">
            Przegląd wydajności kampanii i kanałów marketingowych
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium">
          <Download size={20} />
          Eksportuj raport
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Aktywne kampanie"
          value="8"
          change={2}
          changeType="positive"
          icon={Target}
        />
        <StatsCard
          title="Zadania w toku"
          value="12"
          change={3}
          changeType="negative"
          icon={Zap}
        />
        <StatsCard
          title="Budżet miesięczny"
          value="2.5K PLN"
          change={8}
          changeType="positive"
          icon={TrendingUp}
        />
        <StatsCard
          title="ROI średni"
          value="3.1x"
          change={15}
          changeType="positive"
          icon={Activity}
        />
      </div>

      {/* Channel Performance Comparison Chart */}
      <Card title="Porównanie kanałów" subtitle="Wydajność i ROI po kanałach">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={channelPerformanceData}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="channel" stroke="#a8a29e" style={{ fontSize: '12px' }} />
            <YAxis
              yAxisId="left"
              stroke="#a8a29e"
              style={{ fontSize: '12px' }}
              label={{ value: 'Zasięg / Konwersje', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#a8a29e"
              style={{ fontSize: '12px' }}
              label={{ value: 'ROI', angle: 90, position: 'insideRight' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fafaf8',
                border: '1px solid #e7e5e4',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="reach"
              fill="#A0826D"
              radius={[8, 8, 0, 0]}
              name="Zasięg"
            />
            <Bar
              yAxisId="left"
              dataKey="conversions"
              fill="#C5A572"
              radius={[8, 8, 0, 0]}
              name="Konwersje"
            />
            <Bar
              yAxisId="right"
              dataKey="roi"
              fill="#D9B8A0"
              radius={[8, 8, 0, 0]}
              name="ROI"
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Best Channels Section */}
      <Card title="Najlepsze kanały" subtitle="Ranking kanałów po wydajności">
        <div className="space-y-4">
          {channelPerformanceData
            .sort((a, b) => b.roi - a.roi)
            .map((channel, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-800">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-stone-900">{channel.channel}</h4>
                    <span className="text-sm font-medium text-amber-700">
                      ROI: {channel.roi}x
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-stone-600">
                    <span>Zasięg: {channel.reach.toLocaleString('pl-PL')}</span>
                    <span>Konwersje: {channel.conversions}</span>
                  </div>
                  <div className="mt-2 w-full bg-stone-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-amber-700 to-amber-500 h-2 rounded-full"
                      style={{
                        width: `${(channel.roi / 4.2) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Recent Activities Timeline */}
      <Card title="Ostatnie aktywności" subtitle="Historia działań marketingowych">
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex gap-4 pb-4 border-b border-stone-100 last:border-b-0 last:pb-0"
            >
              {/* Timeline dot */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-xl">
                {getActivityIcon(activity.type)}
              </div>

              {/* Activity content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-stone-900">{activity.title}</h4>
                    <p className="text-sm text-stone-600 mt-1">{activity.description}</p>
                  </div>
                  <span className="text-xs text-stone-500 flex-shrink-0">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>

                {/* Channel badge */}
                <div className="mt-2">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${getChannelColor(
                      activity.channel
                    )}`}
                  >
                    {activity.channel}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary Statistics */}
      <Card title="Podsumowanie miesiąca" subtitle="Kluczowe metryki za wrzesień 2026">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-stone-600 mb-2">Całkowity zasięg</p>
            <p className="text-3xl font-bold text-stone-900">274K</p>
            <p className="text-xs text-green-600 mt-1">↑ 18% vs poprzedni miesiąc</p>
          </div>
          <div>
            <p className="text-sm text-stone-600 mb-2">Całkowite konwersje</p>
            <p className="text-3xl font-bold text-stone-900">1.245</p>
            <p className="text-xs text-green-600 mt-1">↑ 22% vs poprzedni miesiąc</p>
          </div>
          <div>
            <p className="text-sm text-stone-600 mb-2">Średnie zaangażowanie</p>
            <p className="text-3xl font-bold text-stone-900">5.2%</p>
            <p className="text-xs text-green-600 mt-1">↑ 8% vs poprzedni miesiąc</p>
          </div>
          <div>
            <p className="text-sm text-stone-600 mb-2">Średni ROI</p>
            <p className="text-3xl font-bold text-stone-900">3.1x</p>
            <p className="text-xs text-green-600 mt-1">↑ 12% vs poprzedni miesiąc</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
