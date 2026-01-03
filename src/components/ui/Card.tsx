'use client';

import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'glow';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-black/60 backdrop-blur-sm',
      bordered: 'bg-black/60 backdrop-blur-sm border border-gray-800',
      glow: 'bg-black/80 backdrop-blur-sm border border-orange-500/50 shadow-lg shadow-orange-500/20',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg p-4',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
