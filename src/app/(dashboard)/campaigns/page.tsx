'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import Button from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CampaignCard from '@/components/campaigns/campaign-card';

type CampaignStatus = 'Szkic' | 'Aktywne' | 'Zakończone' | 'Wstrzymane';

interface Campaign {
  id: string;
  name: string;
  description: string;
  channelName: string;
  channelColor: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  budgetPlanned: number;
  budgetSpent: number;
  tasksDone: number;
  tasksTotal: number;
}

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    name: 'Wiosenna kolekcja 2026',
    description: 'Kampania promocyjna nowej wiosennej kolekcji herbat Brown House & Tea',
    channelName: 'Instagram',
    channelColor: '#E1306C',
    status: 'Aktywne',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    budgetPlanned: 5000,
    budgetSpent: 2300,
    tasksDone: 12,
    tasksTotal: 18,
  },
  {
    id: '2',
    name: 'Earl Great Launch',
    description: 'Wielokanałowa kampania uruchomienia nowej linii Earl Grey',
    channelName: 'Multi-kanał',
    channelColor: '#7C3AED',
    status: 'Aktywne',
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    budgetPlanned: 8500,
    budgetSpent: 5200,
    tasksDone: 20,
    tasksTotal: 28,
  },
  {
    id: '3',
    name: 'Matcha Specjal',
    description: 'Kampania promocyjna specjalnej edycji matchy japońskiej',
    channelName: 'TikTok',
    channelColor: '#000000',
    status: 'Szkic',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    budgetPlanned: 3500,
    budgetSpent: 0,
    tasksDone: 2,
    tasksTotal: 15,
  },
  {
    id: '4',
    name: 'Newsletter miesieczny',
    description: 'Regularne wysyłki newslettera do bazy subskrybentów',
    channelName: 'Email',
    channelColor: '#0EA5E9',
    status: 'Aktywne',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budgetPlanned: 1500,
    budgetSpent: 750,
    tasksDone: 8,
    tasksTotal: 12,
  },
  {
    id: '5',
    name: 'SEO - Blog herbatany',
    description: 'Optymalizacja SEO i tworzenie treści edukacyjnych na blogu',
    channelName: 'SEO',
    channelColor: '#10B981',
    status: 'Aktywne',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budgetPlanned: 4000,
    budgetSpent: 1800,
    tasksDone: 15,
    tasksTotal: 24,
  },
  {
    id: '6',
    name: 'Google Ads - Wielkanoc',
    description: 'Kampania Google Ads dla sprzedaży świątecznej zbitek herbaty',
    channelName: 'Google Ads',
    channelColor: '#4285F4',
    status: 'Zakończone',
    startDate: '2026-03-01',
    endDate: '2026-04-15',
    budgetPlanned: 6000,
    budgetSpent: 5950,
    tasksDone: 11,
    tasksTotal: 11,
  },
];

export default function CampaignsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Wszystkie' | CampaignStatus>('Wszystkie');
  const [channelFilter, setChannelFilter] = useState('');

  // Get unique channels for filter
  const channels = Array.from(new Set(MOCK_CAMPAIGNS.map((c) => c.channelName))).sort();

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return MOCK_CAMPAIGNS.filter((campaign) => {
      const matchesSearch =
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'Wszystkie' || campaign.status === statusFilter;

      const matchesChannel = !channelFilter || campaign.channelName === channelFilter;

      return matchesSearch && matchesStatus && matchesChannel;
    });
  }, [searchTerm, statusFilter, channelFilter]);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kampanie marketingowe</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Zarządzaj kampaniami marketingowymi Brown House & Tea
          </p>
        </div>
        <Button variant="primary" size="md" className="flex items-center gap-2">
          <Plus size={16} />
          Nowa kampania
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Szukaj kampanii..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'Wszystkie' | CampaignStatus)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="Wszystkie">Wszystkie statusy</option>
            <option value="Szkic">Szkic</option>
            <option value="Aktywne">Aktywne</option>
            <option value="Zakończone">Zakończone</option>
            <option value="Wstrzymane">Wstrzymane</option>
          </select>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="">Wszystkie kanały</option>
            {channels.map((channel) => (
              <option key={channel} value={channel}>
                {channel}
              </option>
            ))}
          </select>

          {/* Results count */}
          <div className="flex items-center justify-end text-sm text-slate-600">
            <span className="font-medium">{filteredCampaigns.length}</span>
            <span className="ml-1">kampanii</span>
          </div>
        </div>
      </div>

      {/* Campaign Grid */}
      {filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-lg">Brak kampanii spełniających kryteria wyszukiwania</p>
        </div>
      )}
    </div>
  );
}
