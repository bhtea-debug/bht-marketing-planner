// @ts-nocheck
'use client';
import React from 'react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-50 mx-auto flex items-center justify-center mb-4 border border-slate-100">
          <Icon size={20} className="text-slate-400" strokeWidth={2} />
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-slate-900 mb-1">{title}</h3>
      {description && <p className="text-[13px] text-slate-500 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default EmptyState;
