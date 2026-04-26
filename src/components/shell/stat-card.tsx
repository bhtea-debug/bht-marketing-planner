// @ts-nocheck
'use client';
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ElementType;
  trend?: { direction: 'up' | 'down' | 'flat'; value: string };
  accent?: string;
}

export function StatCard({ label, value, sublabel, icon: Icon, trend, accent = '#92714a' }: StatCardProps) {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  const trendColor = trend?.direction === 'up' ? 'text-emerald-600' : trend?.direction === 'down' ? 'text-red-600' : 'text-slate-400';
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10.5px] uppercase tracking-wider font-semibold text-slate-400">{label}</span>
        {Icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}14` }}>
            <Icon size={14} style={{ color: accent }} strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="text-[24px] font-bold text-slate-900 leading-none tracking-tight">{value}</div>
      <div className="flex items-center gap-2 mt-2">
        {sublabel && <span className="text-[12px] text-slate-500">{sublabel}</span>}
        {trend && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${trendColor}`}>
            <TrendIcon size={11} strokeWidth={2.5} /> {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

export default StatCard;
