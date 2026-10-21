import { CheckCircle2, X } from 'lucide-react';
import { useEffect } from 'react';

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3600);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);
  if (!message) return null;
  return <div className="toast" role="status" aria-live="polite"><CheckCircle2 size={19} /><span>{message}</span><button aria-label="Dismiss notification" onClick={onClose}><X size={16} /></button></div>;
}
