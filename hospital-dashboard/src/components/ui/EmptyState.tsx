import { CheckCircle2 } from 'lucide-react';

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <section className="empty-state"><span><CheckCircle2 size={24} /></span><div><h2>{title}</h2><p>{message}</p></div></section>;
}
