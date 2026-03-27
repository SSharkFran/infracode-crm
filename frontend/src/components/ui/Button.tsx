import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  icon: 'btn-icon',
};

export function Button({
  children,
  className,
  fullWidth = false,
  leftIcon,
  rightIcon,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(variantClasses[variant], fullWidth && 'w-full', className)}
      type={type}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
