// @ts-nocheck
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Search, Plus, X, LayoutGrid, GanttChartSquare } from 'lucide-react';
import Button from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CampaignCard from '@/components/campaigns/campaign-card';
import CampaignTimeline from '@/components/campaigns/campaign-timeline';
import Modal from '@/components/ui/modal';

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

const CHANNEL_OPTIONS = [
  { name: 'Instagram', color: '#E1306C' },
  { name: 'Facebook', color: '#1877F2' },
  { name: 'TikTok', color: '#000000' },
  { name: 'Google Ads', color: '#4285F4' },
  { name: 'Email', color: '#0EA5E9' },
  { name: 'SEO', color: '#10B981' },
  { name: 'Pinterest', color: '#E60023' },
  { name: 'Multi-kanał', color: '#7C3AED' },
];

const INITIAL_CAMPAIGNS: Campaign[] = [
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
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Wszystkie' | CampaignStatus>('Wszystkie');
  const [channelFilter, setChannelFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('timeline');

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formChannel, setFormChannel] = useState('Instagram');
  const [formStatus, setFormStatus] = useState<CampaignStatus>('Szkic');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formBudget, setFormBudget] = useState('');

  const channels = Array.from(new Set(campaigns.map((c) => c.channelName))).sort();

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const matchesSearch =
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'Wszystkie' || campaign.status === statusFilter;
      const matchesChannel = !channelFilter || campaign.channelName === channelFilter;
      return matchesSearch && matchesStatus && matchesChannel;
    });
  }, [campaigns, searchTerm, statusFilter, channelFilter]);

  const resetForm = useCallback(() => {
    setFormName('');
    setFormDesc('');
    setFormChannel('Instagram');
    setFormStatus('Szkic');
    setFormStartDate('');
    setFormEndDate('');
    setFormBudget('');
  }, []);

  const handleOpenModal = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formName.trim() || !formStartDate || !formEndDate) return;

    const channelObj = CHANNEL_OPTIONS.find(c => c.name === formChannel) || CHANNEL_OPTIONS[0];
    const newCampaign: Campaign = {
      id: `camp-${Date.now()}`,
      name: formName.trim(),
      description: formDesc.trim() || `Nowa kampania ${formChannel}`,
      channelName: channelObj.name,
      channelColor: channelObj.color,
      status: formStatus,
      startDate: formStartDate,
      endDate: formEndDate,
      budgetPlanned: parseInt(formBudget) || 0,
      budgetSpent: 0,
      tasksDone: 0,
      tasksTotal: 0,
    };

    setCampaigns(prev => [newCampaign, ...prev]);
    setIsModalOpen(false);
    resetForm();
  }, [formName, formDesc, formChannel, formStatus, formStartDate, formEndDate, formBudget, resetForm]);

  const inputClass = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 bg-white placeholder:text-slate-400 transition-all";
  const labelClass = "block text-[13px] font-medium text-slate-700 mb-1.5";

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
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GanttChartSquare size={14} />
              Oś czasu
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid size={14} />
              Karty
            </button>
          </div>
          <Button variant="primary" size="md" className="flex items-center gap-2" onClick={handleOpenModal}>
            <Plus size={16} />
            Nowa kampania
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="">Wszystkie kanały</option>
            {channels.map((channel) => (
              <option key={channel} value={channel}>{channel}</option>
            ))}
          </select>
          <div className="flex items-center justify-end text-sm text-slate-600">
            <span className="font-medium">{filteredCampaigns.length}</span>
            <span className="ml-1">kampanii</span>
          </div>
        </div>
      </div>

      {/* Campaign Views */}
      {viewMode === 'timeline' ? (
        <CampaignTimeline campaigns={filteredCampaigns} />
      ) : filteredCampaigns.length > 0 ? (
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

      {/* New Campaign Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Nowa kampania" size="lg">
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className={labelClass}>Nazwa kampanii *</label>
            <input
              type="text"
              placeholder="np. Letnia promocja herbat"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className={inputClass}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Opis</label>
            <textarea
              placeholder="Krótki opis kampanii..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Channel + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Kanał</label>
              <select
                value={formChannel}
                onChange={(e) => setFormChannel(e.target.value)}
                className={inputClass}
              >
                {CHANNEL_OPTIONS.map((ch) => (
                  <option key={ch.name} value={ch.name}>{ch.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as CampaignStatus)}
                className={inputClass}
              >
                <option value="Szkic">Szkic</option>
                <option value="Aktywne">Aktywne</option>
                <option value="Wstrzymane">Wstrzymane</option>
              </select>
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Data rozpoczęcia *</label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Data zakończenia *</label>
              <input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className={labelClass}>Planowany budżet (PLN)</label>
            <input
              type="number"
              placeholder="0"
              value={formBudget}
              onChange={(e) => setFormBudget(e.target.value)}
              className={inputClass}
              min="0"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 mt-5">
            <Button variant="ghost" size="md" onClick={handleCloseModal}>
              Anuluj
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={!formName.trim() || !formStartDate || !formEndDate}
            >
              <Plus size={16} />
              Utwórz kampanię
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
