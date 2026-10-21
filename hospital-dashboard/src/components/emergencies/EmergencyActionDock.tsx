import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { Emergency, EmergencyStatus } from '../../types';

const nextActions: Partial<Record<EmergencyStatus, { label: string; next: EmergencyStatus; note: string }>> = {
  AMBULANCE_ASSIGNED: { label: 'Mark ambulance en route', next: 'EN_ROUTE', note: 'Ambulance and receiving team are assigned.' },
  EN_ROUTE: { label: 'Confirm patient pickup', next: 'PATIENT_PICKED_UP', note: 'Update once the patient is inside the ambulance.' },
  PATIENT_PICKED_UP: { label: 'Confirm hospital arrival', next: 'ARRIVED', note: 'Record arrival at the receiving facility.' },
  ARRIVED: { label: 'Complete emergency case', next: 'COMPLETED', note: 'Close the transport workflow after clinical handoff.' },
};

export function EmergencyActionDock({ emergency, busy, message, onAccept, onReject, onAdvance }: {
  emergency: Emergency;
  busy: boolean;
  message: string;
  onAccept: () => void;
  onReject: () => void;
  onAdvance: (status: EmergencyStatus) => void;
}) {
  if (emergency.status === 'REJECTED') return <section className="action-dock action-dock--closed"><div><strong>Request rejected</strong><p>{emergency.rejectionReason || message}</p></div><CheckCircle2 size={20} /></section>;
  if (emergency.status === 'COMPLETED') return <section className="action-dock action-dock--closed"><div><strong>Emergency completed</strong><p>Transport workflow and hospital handoff are complete.</p></div><CheckCircle2 size={20} /></section>;

  if (emergency.status === 'RECEIVED' || emergency.status === 'UNDER_REVIEW') return <section className="action-dock"><div><strong>This emergency requires a hospital response.</strong><p>{message || 'Review the patient and priority information before deciding.'}</p></div><div className="action-dock__buttons"><button className="button button--secondary" disabled={busy} onClick={onReject}>Reject</button><button className="button button--primary" disabled={busy} onClick={onAccept}>{busy ? 'Updating…' : 'Accept emergency'}</button></div></section>;

  if (emergency.status === 'ACCEPTED') return <section className="action-dock"><div><strong>Case accepted</strong><p>{message || 'Assign an ambulance to unlock transport status updates.'}</p></div><span className="action-hint">Resource assignment required</span></section>;

  const action = nextActions[emergency.status];
  return <section className="action-dock"><div><strong>{action?.note}</strong><p>{message || 'Keep the case state synchronized with the field response.'}</p></div>{action && <button className="button button--primary" disabled={busy} onClick={() => onAdvance(action.next)}>{busy ? 'Updating…' : action.label}<ArrowRight size={16} /></button>}</section>;
}
