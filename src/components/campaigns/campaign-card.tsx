'use client';

import React from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';
import Badge from '@/components/ui/badge';

type CampaignStatus = 'Szkic' | 'Aktywne' | 'Zakończone' | 'Wstrzymane';

interface CampaignCardProps {
  campaign: {
    id: string; name: string; description: string; channelName: string;
    channelColor: string; status: CampaignStatus; startDate: string;
    endDate: string; budgetPlanned: number; budgetSpent: number;
    tasksDone: number; tasksTotal: number;
  };
}

const getStatusColor = (status: CampaignStatus): string => {
  const colors: Record<CampaignStatus, string> = {
    'Szkic': '#94a3b8', 'Aktywne': '#059669', 'Zakończone': '#2563eb', 'Wstrzymane': '#d97706',
  };
  return colors[status] || '#94a3b8';
};

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('pl-PL', { month: 'short', day: 'numeric', year: 'numeric' });

export default function CampaignCard({ campaign }: CampaignCardProps) {
  const budgetPercentage = (campaign.budgetSpent / campaign.budgetPlanned) * 100;
  const taskPercentage = (campaign.tasksDone / campaign.tasksTotal) * 100;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-slate-300/80 transition-all duration-200 overflow-hidden group">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-[15px] font-semibold text-slate-900 group-hover:text-amber-800 transition-colors">{campaign.name}</h3>
          <Badge color={getStatusColor(campaign.status)} size="sm" variant="outline">
            {campaign.status}
          </Badge>
        </div>
        <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-1">{campaign.description}</p>
      </div>

      {/* Body */}
      <div className="px-5 pb-5 space-y-4">
        {/* Channel + Date */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge color={campaign.channelColor} size="sm">{campaign.channelName}</Badge>
          <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
            <Calendar size={13} />
            <span>{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>
          </div>
        </div>

        {/* Budget */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-slate-500">Budżet</span>
            <span className="text-[12px] font-semibold text-slate-700">
              ${campaign.budgetSpent.toLocaleString()} / ${campaign.budgetPlanned.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{budgetPercentage.toFixed(0)}% wydanego</p>
        </div>

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-slate-500">Zadania</span>
            <span className="text-[12px] font-semibold text-slate-700">{campaign.tasksDone} / {campaign.tasksTotal}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${taskPercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{taskPercentage.toFixed(0)}% wykonanych</p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span>{campaign.tasksDone} wykonanych</span>
        </div>
        <button className="text-[13px] font-medium text-amber-700 hover:text-amber-800 transition-colors">
          Szczegóły →
        </button>
      </div>
    </div>
  );
}
