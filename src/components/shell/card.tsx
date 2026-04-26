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
  const interactiveClasses = (interactive || onClick) ? 'cursor-pointer hover:shadow-md hover:border-slate-300 hover:-translate-y-[1px] transition-all duration-200' : '';
  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden ${interactiveClasses} ${className}`}
    >
      {accent && (interactive || onClick) && (
        <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: accent }} />
      )}
      <div className={padMap[padding]}>{children}</div>
    </div>
  );
}

export default Card;
