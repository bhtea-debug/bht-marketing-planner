// @ts-nocheck
'use client';
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  accent?: string; // hex color for hover top accent line
}

const padMap = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' };

export function Card({ children, className = '', onClick, interactive, padding = 'md', accent }: CardProps) {
  const interactiveClasses = (interactive || onClick) ? 'cursor-pointer hover:shadow-[0_8px_24px_-8px_rgba(99,102,241,0.18)] hover:border-indigo-200/60 hover:-translate-y-[2px] transition-all duration-200' : '';
  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_-4px_rgba(99,102,241,0.06)] overflow-hidden ${interactiveClasses} ${className}`}
    >
      {accent && (interactive || onClick) && (
        <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: accent }} />
      )}
      <div className={padMap[padding]}>{children}</div>
    </div>
  );
}

export default Card;
