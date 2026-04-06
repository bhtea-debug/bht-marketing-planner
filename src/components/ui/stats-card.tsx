'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative';
  icon: LucideIcon;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  changeType = 'positive',
  icon: Icon,
}) => {
  const isPositive = changeType === 'positive';

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 transition-all duration-200 hover:shadow-md hover:border-slate-300/80 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium text-slate-500">{title}</span>
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/80 flex items-center justify-center group-hover:from-amber-100 group-hover:to-amber-200/60 transition-all duration-200">
          <Icon className="w-[18px] h-[18px] text-amber-700/80" strokeWidth={1.75} />
        </div>
      </div>

      {/* Value */}
      <p className="text-2xl font-bold text-slate-900 tracking-tight mb-1">{value}</p>

      {/* Change */}
      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${
            isPositive
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-600'
          }`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositive ? '+' : '-'}{Math.abs(change)}%
          </div>
          <span className="text-[11px] text-slate-400">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
