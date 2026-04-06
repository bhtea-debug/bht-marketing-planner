'use client';

import React from 'react';
import { Calendar, CheckCircle2 } from 'lucide-react';
import Badge from '@/components/ui/badge';

type CampaignStatus = 'Szkic' | 'Aktywne' | 'Zakończone' | 'Wstrzymane';

interface CampaignCardProps {
  campaign: {
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
  };
}

const getStatusColor = (status: CampaignStatus): string => {
  switch (status) {
    case 'Szkic':
      return '#6B7280'; // gray
    case 'Aktywne':
      return '#10B981'; // green
    case 'Zakończone':
      return '#3B82F6'; // blue
    case 'Wstrzymane':
      return '#FBBF24'; // yellow
    default:
      return '#6B7280';
  }
};

const getStatusText = (status: CampaignStatus): string => {
  switch (status) {
    case 'Szkic':
      return 'Szkic';
    case 'Aktywne':
      return 'Aktywne';
    case 'Zakończone':
      return 'Zakończone';
    case 'Wstrzymane':
      return 'Wstrzymane';
    default:
      return status;
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function CampaignCard({ campaign }: CampaignCardProps) {
  const budgetPercentage = (campaign.budgetSpent / campaign.budgetPlanned) * 100;
  const taskPercentage = (campaign.tasksDone / campaign.tasksTotal) * 100;

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Card Header with Status */}
      <div className="p-6 border-b border-gray-100 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
        </div>
        <Badge color={getStatusColor(campaign.status)} size="sm">
          {getStatusText(campaign.status)}
        </Badge>
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-5">
        {/* Channel Badge */}
        <div className="flex items-center gap-2">
          <Badge color={campaign.channelColor} size="sm">
            {campaign.channelName}
          </Badge>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar size={16} className="text-amber-700" />
          <span>
            {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
          </span>
        </div>

        {/* Budget Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Budżet</span>
            <span className="text-sm text-gray-600">
              ${campaign.budgetSpent.toLocaleString()} / ${campaign.budgetPlanned.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-600 to-amber-700 h-full transition-all duration-300"
              style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{budgetPercentage.toFixed(0)}% wydanego</p>
        </div>

        {/* Tasks Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Zadania</span>
            <span className="text-sm text-gray-600">
              {campaign.tasksDone} / {campaign.tasksTotal}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-300"
              style={{ width: `${taskPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{taskPercentage.toFixed(0)}% wykonanych</p>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle2 size={16} className="text-green-600" />
          <span>{campaign.tasksDone} zadań wykonanych</span>
        </div>
        <button className="text-amber-700 hover:text-amber-800 text-sm font-medium transition-colors">
          Szczegóły →
        </button>
      </div>
    </div>
  );
}
