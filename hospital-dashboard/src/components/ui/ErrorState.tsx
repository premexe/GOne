import { AlertCircle } from 'lucide-react';

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section className="empty-state" role="alert"><span><AlertCircle size={24} /></span><div><h2>Unable to load this information</h2><p>{message}</p><button className="button button--secondary" type="button" onClick={onRetry}>Retry</button></div></section>;
}
