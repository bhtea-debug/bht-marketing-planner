'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number; // percentage change
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
  const trendColor = isPositive ? 'text-green-600' : 'text-red-600';
  const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 p-6">
      {/* Header with icon */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className="p-2 bg-amber-50 rounded-lg">
          <Icon className="w-5 h-5 text-amber-700" />
        </div>
      </div>

      {/* Main value */}
      <div className="mb-4">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>

      {/* Change indicator */}
      {change !== undefined && (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 ${trendColor} px-2 py-1 rounded-md ${bgColor}`}>
            {isPositive ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}
            <span className="text-sm font-medium">
              {isPositive ? '+' : '-'}{Math.abs(change)}%
            </span>
          </div>
          <p className="text-xs text-gray-500">vs last period</p>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
