// @ts-nocheck
'use client';
import React from 'react';
import { ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function PageHeader({ eyebrow, title, description, icon: Icon, actions, meta, breadcrumbs }: PageHeaderProps) {
  return (
    <header className="mb-7 pb-5 border-b border-slate-200/80">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-[11.5px] text-slate-400 mb-2">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={11} className="opacity-50" />}
              {b.href ? (
                <a href={b.href} className="hover:text-slate-700 transition-colors">{b.label}</a>
              ) : (
                <span>{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon size={20} strokeWidth={2} className="text-indigo-600" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-indigo-600/80 mb-1">
                {eyebrow}
              </p>
            )}
            <h1 className="text-[22px] md:text-[26px] font-bold text-slate-900 tracking-tight leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed max-w-2xl">
                {description}
              </p>
            )}
            {meta && <div className="mt-2.5">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

export default PageHeader;
