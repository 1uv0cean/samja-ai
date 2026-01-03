'use client';

import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const variants = {
      primary: 'bg-[#3182F6] text-white hover:bg-[#1B64DA]',
      secondary: 'bg-[#F4F4F5] text-[#191F28] hover:bg-[#E5E5EA]',
      ghost: 'bg-transparent text-[#6B7684] hover:bg-[#F4F4F5]',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-5 py-3',
      lg: 'px-6 py-4 text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'font-semibold rounded-xl transition-all duration-200',
          'disabled:bg-[#E5E8EB] disabled:text-[#8B95A1] disabled:cursor-not-allowed',
          'active:scale-[0.98]',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
