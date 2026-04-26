// @ts-nocheck
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/components/shell';
import { Share2 as ChIcon } from 'lucide-react';
import {
  Instagram,
  Facebook,
  TrendingUp,
  Mail,
  Search,
  Zap,
  Globe,
} from 'lucide-react';

const ICON_BY_NAME: Record<string, React.ReactNode> = {
  instagram: <Instagram size={24} />,
  facebook: <Facebook size={24} />,
  tiktok: <Zap size={24} />,
  pinterest: <TrendingUp size={24} />,
  email: <Mail size={24} />,
  seo: <Search size={24} />,
  'google ads': <Zap size={24} />,
};

function getIcon(name: string) {
  return ICON_BY_NAME[(name || '').toLowerCase()] || <Globe size={24} />;
}

interface ChannelStats {
  id: number;
  name: string;
  color: string;
  activeCampaigns: number;
  totalBudget: number;
  totalSpent: number;
}

function ChannelCard({ channel }: { channel: ChannelStats }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 transition-shadow duration-200 overflow-hidden hover:shadow-md">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: `${channel.color}20` }}
            >
              <div style={{ color: channel.color }}>{getIcon(channel.name)}</div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{channel.name}</h3>
          </div>
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: channel.color }}
          />
        </div>
      </div>

      <div className="px-6 py-5 space-y-5 bg-slate-50">
        <div>
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Aktywne kampanie
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{channel.activeCampaigns}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Całkowity budżet
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {channel.totalBudget.toLocaleString()} PLN
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Wydano
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {channel.totalSpent.toLocaleString()} PLN
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [chRes, cRes] = await Promise.all([
          fetch('/api/channels'),
          fetch('/api/campaigns'),
        ]);
        const ch = chRes.ok ? await chRes.json() : [];
        const cs = cRes.ok ? await cRes.json() : [];
        if (cancelled) return;
        setChannels(ch || []);
        setCampaigns(cs || []);
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

  const stats: ChannelStats[] = useMemo(() => {
    return (channels || []).map((c: any) => {
      const channelCampaigns = (campaigns || []).filter(
        (cp: any) => cp.channel_id === c.id
      );
      const active = channelCampaigns.filter((cp: any) => cp.status === 'active').length;
      const totalBudget = channelCampaigns.reduce(
        (s: number, cp: any) => s + Number(cp.budget_planned || 0),
        0
      );
      const totalSpent = channelCampaigns.reduce(
        (s: number, cp: any) => s + Number(cp.budget_spent || 0),
        0
      );
      return {
        id: c.id,
        name: c.name,
        color: c.color || '#94A3B8',
        activeCampaigns: active,
        totalBudget,
        totalSpent,
      };
    });
  }, [channels, campaigns]);

  const totalBudget = stats.reduce((s, c) => s + c.totalBudget, 0);
  const activeCampaigns = stats.reduce((s, c) => s + c.activeCampaigns, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacje"
        icon={ChIcon}
        title="Kanały marketingowe"
        description="Zarządzaj kanałami marketingowymi i monitoruj wydajność Brown House & Tea."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-amber-200 p-6">
          <p className="text-sm font-medium text-amber-900 uppercase tracking-wide">
            Całkowity budżet kanałów
          </p>
          <p className="text-3xl font-bold text-amber-900 mt-2">
            {totalBudget.toLocaleString()} PLN
          </p>
          <p className="text-sm text-amber-800 mt-2">We wszystkich aktywnych kampaniach</p>
        </div>

        <div className="bg-white rounded-lg border border-green-200 p-6">
          <p className="text-sm font-medium text-green-900 uppercase tracking-wide">
            Aktywne kampanie
          </p>
          <p className="text-3xl font-bold text-green-900 mt-2">{activeCampaigns}</p>
          <p className="text-sm text-green-800 mt-2">Kampanii w trakcie realizacji</p>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm py-12 text-center">Ładowanie kanałów…</p>
      ) : stats.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-500">Brak kanałów w bazie. Dodaj je, aby zobaczyć podsumowanie.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </div>
  );
}
