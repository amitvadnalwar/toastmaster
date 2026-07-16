import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'draft' | 'published' | 'completed' | 'success' | 'warning' | 'danger' | 'default';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-600',
  default: 'bg-gray-100 text-gray-600',
};

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
