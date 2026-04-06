'use client';

import React, { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  action,
}) => {
  return (
    <div
      className={`
        bg-white rounded-lg shadow-sm border border-gray-100
        hover:shadow-md transition-shadow duration-200
        ${className}
      `}
    >
      {(title || action) && (
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex-1">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
          {action && <div className="ml-4">{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export default Card;
