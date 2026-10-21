import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: 'default' | 'critical' | 'ivory';
}

export function MetricCard({ label, value, detail, icon: Icon, tone = 'default' }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__top">
        <span className="eyebrow">{label}</span>
        <span className="metric-card__icon"><Icon size={18} strokeWidth={1.7} /></span>
      </div>
      <strong className="metric-card__value">{value}</strong>
      <p>{detail}</p>
    </article>
  );
}
