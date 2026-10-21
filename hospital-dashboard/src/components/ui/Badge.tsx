import type { PropsWithChildren } from 'react';

interface BadgeProps extends PropsWithChildren {
  tone?: 'neutral' | 'critical' | 'high' | 'medium' | 'low' | 'teal';
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
