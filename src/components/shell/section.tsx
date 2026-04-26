// @ts-nocheck
'use client';
import React from 'react';

interface SectionProps {
  icon?: React.ElementType;
  iconColor?: string;
  label: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Section({ icon: Icon, iconColor = 'text-indigo-600', label, subtitle, action, children, className = '' }: SectionProps) {
  return (
    <section className={`mb-7 ${className}`}>
      <div className="flex items-center gap-2 mb-3.5 px-1">
        {Icon && <Icon size={15} className={`${iconColor} flex-shrink-0`} strokeWidth={2.2} />}
        <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-slate-700">{label}</span>
        {subtitle && (
          <>
            <span className="text-slate-300">·</span>
            <span className="text-[11.5px] text-slate-400 font-medium lowercase tracking-wide">{subtitle}</span>
          </>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export default Section;
