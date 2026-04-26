// @ts-nocheck
'use client';
import React from 'react';

interface HeroBannerProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ElementType;
  chips?: React.ReactNode[];
  action?: React.ReactNode;
  variant?: 'amber' | 'violet' | 'slate';
}

const VARIANTS = {
  amber: 'linear-gradient(135deg, #6b4e2e 0%, #92714a 45%, #b08e63 100%)',
  violet: 'linear-gradient(135deg, #4338ca 0%, #6366f1 45%, #818cf8 100%)',
  slate: 'linear-gradient(135deg, #1e293b 0%, #334155 45%, #475569 100%)',
};

export function HeroBanner({ eyebrow, title, description, icon: Icon, chips, action, variant = 'amber' }: HeroBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl text-white shadow-md mb-7" style={{ background: VARIANTS[variant] }}>
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 0%, transparent 40%), radial-gradient(circle at 80% 80%, white 0%, transparent 35%)' }} />
      <div className="relative px-6 py-7 md:px-8 md:py-8 flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-0">
          {(eyebrow || Icon) && (
            <div className="flex items-center gap-2 mb-2">
              {Icon && <Icon size={14} className="opacity-80" />}
              {eyebrow && <span className="text-[10px] font-semibold tracking-[0.18em] uppercase opacity-90">{eyebrow}</span>}
            </div>
          )}
          <h1 className="text-[26px] md:text-[28px] font-bold tracking-tight">{title}</h1>
          {description && <p className="text-[13px] md:text-[14px] mt-1.5 opacity-85 max-w-xl leading-relaxed">{description}</p>}
          {chips && chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-5">
              {chips.map((chip, i) => (
                <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full text-[12px] font-medium ring-1 ring-white/20">
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </section>
  );
}

export default HeroBanner;
