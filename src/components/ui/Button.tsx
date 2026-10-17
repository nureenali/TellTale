import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap cursor-pointer select-none';

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-11 px-5 text-base gap-2.5',
  };

  const variantClasses = {
    primary: 'bg-[#33483A] text-white hover:bg-[#26382F] active:bg-[#1E2C24] dark:bg-[#4D6B57] dark:hover:bg-[#5C7F67] focus-visible:ring-[#33483A] shadow-xs',
    secondary: 'bg-[#F0EEE7] text-[#252722] hover:bg-[#E8E5DC] active:bg-[#DFDBD1] dark:bg-[#262923] dark:text-[#ECEAE4] dark:hover:bg-[#30342C] border border-[#E2E0D8] dark:border-[#34382F]',
    outline: 'bg-transparent text-[#252722] hover:bg-[#F0EEE7] dark:text-[#ECEAE4] dark:hover:bg-[#262923] border border-[#E2E0D8] dark:border-[#34382F]',
    ghost: 'bg-transparent text-[#696D65] hover:text-[#252722] hover:bg-[#F0EEE7] dark:text-[#9FA49A] dark:hover:text-[#ECEAE4] dark:hover:bg-[#262923]',
    destructive: 'bg-[#B42318] text-white hover:bg-[#911D13] active:bg-[#7A1810] focus-visible:ring-[#B42318] shadow-xs',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';
