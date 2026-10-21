import { X } from 'lucide-react';
import { useState } from 'react';

const reasons = [
  'No emergency beds available',
  'No ambulance available',
  'Required specialist unavailable',
  'Hospital capacity exceeded',
  'Other',
];

export function RejectEmergencyDialog({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const [selected, setSelected] = useState(reasons[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (!open) return null;

  async function submit() {
    setSubmitting(true);
    try {
      const reason = selected === 'Other' && note.trim() ? note.trim() : note.trim() ? `${selected}: ${note.trim()}` : selected;
      await onConfirm(reason);
      onClose();
    } finally { setSubmitting(false); }
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="reject-title" onMouseDown={(e) => e.stopPropagation()}>
      <button className="dialog-close" aria-label="Close" onClick={onClose}><X size={18} /></button>
      <span className="eyebrow">Decision record</span>
      <h2 id="reject-title">Reject emergency request</h2>
      <p>Select the operational reason. This is recorded in the case timeline for auditability.</p>
      <div className="reason-list">
        {reasons.map((reason) => <label className={`reason-option ${selected === reason ? 'is-selected' : ''}`} key={reason}>
          <input type="radio" name="rejection-reason" value={reason} checked={selected === reason} onChange={() => setSelected(reason)} />
          <span>{reason}</span>
        </label>)}
      </div>
      <label className="dialog-field">Additional note <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional context for the dispatch team" /></label>
      <div className="dialog-actions"><button className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--danger" disabled={submitting || (selected === 'Other' && !note.trim())} onClick={submit}>{submitting ? 'Recording…' : 'Reject request'}</button></div>
    </section>
  </div>;
}
