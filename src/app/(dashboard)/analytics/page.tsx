// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/button';
import { PageHeader } from '@/components/shell';
import { TrendingUp as TrendIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Share2, Users, BarChart3, Zap, Mail, Facebook, Instagram, AlertCircle } from 'lucide-react';

// No fake/demo data — when API returns nothing, show zeros instead.
const EMPTY_DATA = {
  meta: {
    facebook: { pageLikes: 0, pageLikesChange: 0, postReach: 0, postReachChange: 0, engagement: 0, engagementChange: 0, impressions: 0, impressionsChange: 0 },
    instagram: { followers: 0, followersChange: 0, reach: 0, reachChange: 0, profileVisits: 0, profileVisitsChange: 0, impressions: 0, impressionsChange: 0, topPosts: [] },
    ads: { spend: 0, spendChange: 0, cpc: 0, cpcChange: 0, ctr: 0, ctrChange: 0, conversions: 0, conversionsChange: 0, roas: 0, roasChange: 0, budgetUsed: 0, budgetLimit: 0 },
  },
  getresponse: { totalSubscribers: 0, totalLists: 0, averageOpenRate: 0, averageClickRate: 0, lastCampaigns: [] },
};

interface AnalyticsData {
  integrations: string[];
  meta?: any;
  getresponse?: any;
}

interface Errors {
  meta?: string;
  getresponse?: string;
}

const StatCard = ({
  label,
  value,
  change,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  gradient: string;
}) => {
  const isPositive = change >= 0;

  return (
    <div
      className={`rounded-xl p-6 text-white shadow-lg border border-opacity-20 border-white backdrop-blur-sm ${gradient}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-white/80 mb-2">{label}</p>
          <h3 className="text-4xl font-bold mb-3">{value}</h3>
          <div className="flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-emerald-300" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-300" />
            )}
            <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
              {Math.abs(change)}%
            </span>
          </div>
        </div>
        <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">{Icon}</div>
      </div>
    </div>
  );
};

const MiniBar = ({ value, max, label, percentage }: { value: number; max: number; label: string; percentage: number }) => {
  const width = (value / max) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs font-semibold text-slate-900">{percentage.toFixed(1)}%</span>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-600 to-amber-500 rounded-full" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

const PercentageBar = ({ percentage, label }: { percentage: number; label: string }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-sm font-bold text-slate-900">{percentage.toFixed(1)}%</span>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
    </div>
  );
};

const PlatformNotConnected = ({ platform, icon: Icon }: { platform: string; icon: React.ReactNode }) => {
  const labels: Record<string, string> = {
    meta: 'Meta',
    getresponse: 'GetResponse',
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 p-12 text-center bg-slate-50/50">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">{Icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">Połącz {labels[platform]}</h3>
      <p className="text-slate-600 text-sm mb-6">Aby zobaczyć statystyki ze swojego konta {labels[platform]}, najpierw je połącz.</p>
      <Button variant="primary" size="md" onClick={() => (window.location.href = `/integrations`)}>
        Połącz {labels[platform]}
      </Button>
    </div>
  );
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');
  const [data, setData] = useState<AnalyticsData>({ integrations: [] });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrors({});

      try {
        // Fetch integrations
        const integrationsRes = await fetch('/api/integrations');
        const integrationsData = await integrationsRes.json();
        // API returns array of integration objects, extract active platform names
        const integrationsList = Array.isArray(integrationsData)
          ? integrationsData.filter((i: any) => i.status === 'active').map((i: any) => i.platform)
          : [];

        const newData: AnalyticsData = { integrations: integrationsList };

        // Fetch Meta data if connected
        if (integrationsList.includes('meta')) {
          try {
            const metaRes = await fetch(`/api/integrations/meta/insights?period=${period}`);
            if (metaRes.ok) {
              const metaData = await metaRes.json();
              newData.meta = metaData.data || EMPTY_DATA.meta;
            } else {
              newData.meta = EMPTY_DATA.meta;
            }
          } catch (err) {
            newData.meta = EMPTY_DATA.meta;
            setErrors((prev) => ({ ...prev, meta: 'Failed to fetch Meta data' }));
          }
        }

        // Fetch GetResponse data if connected
        if (integrationsList.includes('getresponse')) {
          try {
            const getresponseRes = await fetch(`/api/integrations/getresponse/stats`);
            if (getresponseRes.ok) {
              const getresponseData = await getresponseRes.json();
              newData.getresponse = getresponseData.data || EMPTY_DATA.getresponse;
            } else {
              newData.getresponse = EMPTY_DATA.getresponse;
            }
          } catch (err) {
            newData.getresponse = EMPTY_DATA.getresponse;
            setErrors((prev) => ({ ...prev, getresponse: 'Failed to fetch GetResponse data' }));
          }
        }

        setData(newData);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const periodLabels = {
    '7': '7 dni',
    '30': '30 dni',
    '90': '90 dni',
  };

  // Calculate aggregated stats
  const aggregatedStats = {
    reach: data.meta?.facebook?.postReach || 0,
    reachChange: data.meta?.facebook?.postReachChange || 0,
    engagement: (data.meta?.facebook?.engagement || 0) + (data.meta?.instagram?.engagement || 0),
    engagementChange:
      ((data.meta?.facebook?.engagement || 0) + (data.meta?.instagram?.engagement || 0)) > 0
        ? data.meta?.facebook?.engagementChange || 0
        : 0,
    clicks: (data.meta?.ads?.conversions || 0) * 5, // Estimate clicks from conversions
    clicksChange: data.meta?.ads?.conversionsChange || 0,
    spend: data.meta?.ads?.spend || 0,
    spendChange: data.meta?.ads?.spendChange || 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
          <div className="h-12 bg-slate-200 rounded-lg w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const noIntegrations = data.integrations.length === 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Pomiar"
        icon={TrendIcon}
        title="Analityka kanałów"
        description="Śledź wydajność marketingową na wszystkich platformach."
      />

        {/* Period Selector */}
        <div className="flex items-center gap-3 bg-white rounded-lg p-2 w-fit border border-slate-200 shadow-sm">
          {(['7', '30', '90'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                period === p
                  ? 'bg-amber-700 text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {noIntegrations ? (
          // No integrations connected
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-16 text-center bg-slate-50">
            <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Żadne platformy nie są połączone</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Połącz swoje konta mediów społecznościowych i narzędzi email marketingu, aby zobaczyć pełną analitykę tutaj.
            </p>
            <Button variant="primary" size="lg" onClick={() => (window.location.href = '/integrations')}>
              Przejdź do integracji
            </Button>
          </div>
        ) : (
          <>
            {/* Top Stats Row */}
            {!noIntegrations && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  label="Zasięg"
                  value={aggregatedStats.reach.toLocaleString()}
                  change={aggregatedStats.reachChange}
                  icon={<Share2 className="w-6 h-6 text-white/70" />}
                  gradient="bg-gradient-to-br from-blue-600 to-blue-700"
                />
                <StatCard
                  label="Zaangażowanie"
                  value={aggregatedStats.engagement.toLocaleString()}
                  change={aggregatedStats.engagementChange}
                  icon={<Zap className="w-6 h-6 text-white/70" />}
                  gradient="bg-gradient-to-br from-amber-600 to-amber-700"
                />
                <StatCard
                  label="Kliknięcia"
                  value={aggregatedStats.clicks.toLocaleString()}
                  change={aggregatedStats.clicksChange}
                  icon={<BarChart3 className="w-6 h-6 text-white/70" />}
                  gradient="bg-gradient-to-br from-purple-600 to-purple-700"
                />
                <StatCard
                  label="Wydatki"
                  value={`zł ${aggregatedStats.spend.toFixed(2)}`}
                  change={aggregatedStats.spendChange}
                  icon={<TrendingUp className="w-6 h-6 text-white/70" />}
                  gradient="bg-gradient-to-br from-rose-600 to-rose-700"
                />
              </div>
            )}

            {/* Meta Section */}
            {data.integrations.includes('meta') && data.meta ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900">Meta</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Facebook Stats */}
                  <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 rounded-lg bg-blue-50">
                        <Facebook className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">Facebook</h3>
                    </div>

                    <div className="space-y-6">
                      <MiniBar
                        value={data.meta.facebook.pageLikes}
                        max={20000}
                        label="Polubienia strony"
                        percentage={(data.meta.facebook.pageLikes / 20000) * 100}
                      />
                      <MiniBar
                        value={data.meta.facebook.postReach}
                        max={100000}
                        label="Zasięg postów"
                        percentage={(data.meta.facebook.postReach / 100000) * 100}
                      />
                      <MiniBar
                        value={data.meta.facebook.engagement}
                        max={5000}
                        label="Zaangażowanie"
                        percentage={(data.meta.facebook.engagement / 5000) * 100}
                      />
                      <MiniBar
                        value={data.meta.facebook.impressions}
                        max={200000}
                        label="Wyświetlenia"
                        percentage={(data.meta.facebook.impressions / 200000) * 100}
                      />
                    </div>
                  </div>

                  {/* Instagram Stats */}
                  <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 rounded-lg bg-gradient-to-br from-pink-50 to-purple-50">
                        <Instagram className="w-6 h-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">Instagram</h3>
                    </div>

                    <div className="space-y-6">
                      <MiniBar
                        value={data.meta.instagram.followers}
                        max={20000}
                        label="Obserwujący"
                        percentage={(data.meta.instagram.followers / 20000) * 100}
                      />
                      <MiniBar
                        value={data.meta.instagram.reach}
                        max={100000}
                        label="Zasięg"
                        percentage={(data.meta.instagram.reach / 100000) * 100}
                      />
                      <MiniBar
                        value={data.meta.instagram.profileVisits}
                        max={10000}
                        label="Odwiedziny profilu"
                        percentage={(data.meta.instagram.profileVisits / 10000) * 100}
                      />
                      <MiniBar
                        value={data.meta.instagram.impressions}
                        max={150000}
                        label="Wyświetlenia"
                        percentage={(data.meta.instagram.impressions / 150000) * 100}
                      />
                    </div>
                  </div>
                </div>

                {/* Top Posts Performance */}
                {data.meta.instagram?.topPosts && (
                  <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Najlepsze posty (Instagram)</h3>
                    <div className="space-y-4">
                      {data.meta.instagram.topPosts.map((post: any, idx: number) => (
                        <div key={idx} className="pb-4 border-b border-slate-100 last:border-0">
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium text-slate-900 text-sm">{post.title}</span>
                            <span className="text-xs font-semibold text-slate-600">{post.engagement} zaangażowań</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                              style={{ width: `${Math.min((post.engagementRate / 20) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-600 mt-1 block">{post.engagementRate.toFixed(1)}% współczynnik zaangażowania</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ads Stats */}
                {data.meta.ads && (
                  <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Kampanie reklamowe</h3>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-xs text-slate-600 font-medium mb-2">Wydatki</p>
                        <p className="text-2xl font-bold text-slate-900">zł {data.meta.ads.spend.toFixed(2)}</p>
                        <p className={`text-xs mt-2 ${data.meta.ads.spendChange >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {data.meta.ads.spendChange >= 0 ? '+' : ''}{data.meta.ads.spendChange.toFixed(1)}%
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-xs text-slate-600 font-medium mb-2">CPC</p>
                        <p className="text-2xl font-bold text-slate-900">zł {data.meta.ads.cpc.toFixed(2)}</p>
                        <p className={`text-xs mt-2 ${data.meta.ads.cpcChange >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {data.meta.ads.cpcChange >= 0 ? '+' : ''}{data.meta.ads.cpcChange.toFixed(1)}%
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-xs text-slate-600 font-medium mb-2">CTR</p>
                        <p className="text-2xl font-bold text-slate-900">{data.meta.ads.ctr.toFixed(2)}%</p>
                        <p className={`text-xs mt-2 ${data.meta.ads.ctrChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {data.meta.ads.ctrChange >= 0 ? '+' : ''}{data.meta.ads.ctrChange.toFixed(1)}%
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                        <p className="text-xs text-slate-600 font-medium mb-2">ROAS</p>
                        <p className="text-2xl font-bold text-slate-900">{data.meta.ads.roas.toFixed(1)}x</p>
                        <p className={`text-xs mt-2 ${data.meta.ads.roasChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {data.meta.ads.roasChange >= 0 ? '+' : ''}{data.meta.ads.roasChange.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Budget Usage */}
                    <div>
                      <p className="text-sm font-bold text-slate-900 mb-3">Wykorzystanie budżetu</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Zł {data.meta.ads.budgetUsed.toFixed(2)}</span>
                          <span className="text-slate-900 font-semibold">
                            {((data.meta.ads.budgetUsed / data.meta.ads.budgetLimit) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-500 rounded-full"
                            style={{ width: `${Math.min((data.meta.ads.budgetUsed / data.meta.ads.budgetLimit) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-600">Limit: zł {data.meta.ads.budgetLimit.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              data.integrations.includes('meta') && (
                <PlatformNotConnected platform="meta" icon={<Facebook className="w-8 h-8 text-slate-400" />} />
              )
            )}

            {/* GetResponse Section */}
            {data.integrations.includes('getresponse') && data.getresponse ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900">GetResponse</h2>

                {/* Overview Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs text-slate-600 font-medium mb-2">Wszyscy subskrybenci</p>
                    <p className="text-3xl font-bold text-slate-900">{data.getresponse.totalSubscribers.toLocaleString()}</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs text-slate-600 font-medium mb-2">Listy e-mail</p>
                    <p className="text-3xl font-bold text-slate-900">{data.getresponse.totalLists}</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs text-slate-600 font-medium mb-2">Średni open rate</p>
                    <p className="text-3xl font-bold text-slate-900">{data.getresponse.averageOpenRate.toFixed(1)}%</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs text-slate-600 font-medium mb-2">Średni click rate</p>
                    <p className="text-3xl font-bold text-slate-900">{data.getresponse.averageClickRate.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Recent Campaigns */}
                <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Ostatnie kampanie e-mail</h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-200">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Kampania</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Data wysłania</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Open Rate</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Click Rate</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Odbiorcy</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.getresponse.lastCampaigns.map((campaign: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4">
                              <p className="font-medium text-slate-900">{campaign.name}</p>
                            </td>
                            <td className="py-4 px-4 text-slate-600">
                              {new Date(campaign.sendDate).toLocaleDateString('pl-PL')}
                            </td>
                            <td className="py-4 px-4">
                              <PercentageBar percentage={campaign.openRate} label="" />
                            </td>
                            <td className="py-4 px-4">
                              <PercentageBar percentage={campaign.clickRate} label="" />
                            </td>
                            <td className="py-4 px-4 text-slate-600">{campaign.recipients.toLocaleString()}</td>
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                Wysłana
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              data.integrations.includes('getresponse') && (
                <PlatformNotConnected platform="getresponse" icon={<Mail className="w-8 h-8 text-slate-400" />} />
              )
            )}
          </>
        )}
      </div>
  );
}
