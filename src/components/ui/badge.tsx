'use client';

import React, { ReactNode } from 'react';

type BadgeVariant = 'solid' | 'outline';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  color: string; // hex color string (e.g., "#D97706")
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-1 text-xs font-medium',
  md: 'px-3 py-1.5 text-sm font-medium',
};

const Badge: React.FC<BadgeProps> = ({
  children,
  color,
  variant = 'solid',
  size = 'md',
}) => {
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  };

  const [r, g, b] = hexToRgb(color);

  const solidStyle = {
    backgroundColor: color,
    color: `rgb(${r}, ${g}, ${b})`,
  };

  const outlineStyle = {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
    color: color,
    border: `1px solid ${color}`,
  };

  const baseStyle = variant === 'solid' ? solidStyle : outlineStyle;

  return (
    <span
      className={`
        inline-block rounded-full
        ${sizeStyles[size]}
        ${variant === 'solid' ? 'text-white' : ''}
        transition-colors duration-200
      `}
      style={baseStyle}
    >
      {children}
    </span>
  );
};

export default Badge;
