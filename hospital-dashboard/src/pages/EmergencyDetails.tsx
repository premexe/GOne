import { Ambulance as AmbulanceIcon, ArrowLeft, Building2, Check, Clock3, MapPin, Navigation, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AssignmentPanel } from '../components/emergencies/AssignmentPanel';
import { EmergencyActionDock } from '../components/emergencies/EmergencyActionDock';
import { RejectEmergencyDialog } from '../components/emergencies/RejectEmergencyDialog';
import { EmergencyMap, type MapRouteState } from '../components/maps/EmergencyMap';
import { Badge } from '../components/ui/Badge';
import { ErrorState } from '../components/ui/ErrorState';
import { Toast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { emergencyApi, resourceApi } from '../services/api';
import type { Ambulance, Doctor, Emergency, EmergencyStatus } from '../types';
import { prototypeAmbulanceEta } from '../utils/map';

export function EmergencyDetails() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { currentHospital } = useAuth();
  const [emergency, setEmergency] = useState<Emergency | null | undefined>(undefined);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [ambulanceId, setAmbulanceId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [routeState, setRouteState] = useState<MapRouteState>({ result: null, loading: true, unavailable: false });
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  async function refreshCase() {
    if (!currentHospital) return;
    setEmergency(await emergencyApi.getById(id, currentHospital.id));
  }

  useEffect(() => {
    if (!currentHospital) return;
    setLoadError('');
    Promise.all([emergencyApi.getById(id, currentHospital.id), resourceApi.getAmbulances(currentHospital.id), resourceApi.getDoctors(currentHospital.id)]).then(([caseData, ambulanceData, doctorData]) => {
      setEmergency(caseData); setAmbulances(ambulanceData); setDoctors(doctorData);
    }).catch((caught: unknown) => setLoadError(caught instanceof Error ? caught.message : 'Please check the LifeLink backend connection.'));
  }, [id, currentHospital, reloadKey]);

  if (!currentHospital) return null;
  const hospitalId = currentHospital.id;
  if (loadError) return <div className="page"><ErrorState message={loadError} onRetry={() => setReloadKey((value) => value + 1)} /></div>;
  if (emergency === undefined) return <div className="page loading-state">Loading emergency…</div>;
  if (!emergency) return <div className="page not-found-state"><span className="eyebrow">Hospital-scoped access</span><h1>Emergency not found</h1><p>This case is not allocated to {currentHospital.name}.</p><Link className="button button--primary" to="/dashboard">Return to overview</Link></div>;

  const tone = emergency.priority.level.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
  const canAssignResources = emergency.requestStatus === 'ACCEPTED' && !['REJECTED', 'COMPLETED'].includes(emergency.status);
  const routedMinutes = routeState.result?.durationMinutes ?? emergency.estimatedArrivalMinutes ?? null;
  const ambulanceArrival = prototypeAmbulanceEta(emergency.status, routedMinutes);
  const roadDistance = routeState.result?.distanceKm ?? emergency.distanceKm;
  const backTarget = emergency.requestStatus === 'PENDING' ? '/new-emergencies' : emergency.status === 'COMPLETED' || emergency.status === 'REJECTED' ? '/dashboard' : '/ongoing-cases';
  const backLabel = emergency.requestStatus === 'PENDING' ? 'New Emergencies' : emergency.status === 'COMPLETED' || emergency.status === 'REJECTED' ? 'Overview' : 'Ongoing Cases';

  async function runAction(action: () => Promise<unknown>, success: string) {
    setBusy(true); setMessage('');
    try {
      await action(); await refreshCase();
      const [ambulanceData, doctorData] = await Promise.all([resourceApi.getAmbulances(hospitalId), resourceApi.getDoctors(hospitalId)]);
      setAmbulances(ambulanceData); setDoctors(doctorData); setMessage(success);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update emergency.');
      return false;
    } finally { setBusy(false); }
  }

  const acceptCase = () => runAction(() => emergencyApi.accept(emergency.id, hospitalId), 'Emergency accepted · moved to Ongoing Cases');
  const rejectCase = async (reason: string) => {
    const succeeded = await runAction(() => emergencyApi.reject(emergency.id, hospitalId, reason), 'Emergency rejected · removed from New Emergencies');
    if (succeeded) window.setTimeout(() => navigate('/new-emergencies'), 900);
  };
  const assignAmbulance = () => {
    const selected = ambulances.find((item) => item.id === ambulanceId);
    return runAction(() => emergencyApi.assignAmbulance(emergency.id, hospitalId, ambulanceId), `Ambulance ${selected?.vehicleNumber ?? ''} assigned`.trim());
  };
  const assignDoctor = () => {
    const selected = doctors.find((item) => item.id === doctorId);
    return runAction(() => emergencyApi.assignDoctor(emergency.id, hospitalId, doctorId), `${selected?.name ?? 'Doctor'} assigned`);
  };
  const statusMessages: Partial<Record<EmergencyStatus, string>> = { EN_ROUTE: 'Ambulance is now en route', PATIENT_PICKED_UP: 'Patient pickup confirmed · route updated toward hospital', ARRIVED: 'Patient arrived at hospital', COMPLETED: 'Emergency case completed · resources released' };
  const advanceStatus = async (status: EmergencyStatus) => {
    const succeeded = await runAction(() => emergencyApi.updateStatus(emergency.id, hospitalId, status), statusMessages[status] ?? `Case updated to ${status.replaceAll('_', ' ').toLowerCase()}`);
    if (succeeded && status === 'COMPLETED') window.setTimeout(() => navigate('/completed-cases'), 1200);
  };

  return <div className="page detail-page">
    <Link to={backTarget} className="back-link"><ArrowLeft size={16} /> {backLabel}</Link>
    <header className="case-header"><div><span className="eyebrow">{emergency.id} · {currentHospital.id}</span><h1>{emergency.type}</h1><p><Clock3 size={15} /> Request allocated to {currentHospital.shortName} from {emergency.location.area}</p></div><div className="case-header__status"><Badge tone={tone}>{emergency.priority.level}</Badge><span className="request-state">{emergency.requestStatus}</span><span className="case-state">{emergency.status.replaceAll('_', ' ')}</span></div></header>
    <section className="detail-hero-grid">
      <article className="detail-panel patient-panel"><span className="eyebrow">Patient</span><h2>{emergency.patient.name}</h2><p className="patient-meta">{[emergency.patient.age && `${emergency.patient.age} years`, emergency.patient.gender, emergency.patient.bloodGroup].filter(Boolean).join(' · ')}</p><div className="detail-columns"><div><span className="field-label">Known conditions</span>{emergency.patient.medicalConditions?.length ? emergency.patient.medicalConditions.map((item) => <p key={item}>{item}</p>) : <p>None reported</p>}</div><div><span className="field-label">Allergies</span>{emergency.patient.allergies?.length ? emergency.patient.allergies.map((item) => <p key={item}>{item}</p>) : <p>None reported</p>}</div><div><span className="field-label">Current medications</span>{emergency.patient.medications?.length ? emergency.patient.medications.map((item) => <p key={item}>{item}</p>) : <p>None reported</p>}</div><div><span className="field-label">SOS symptoms</span>{emergency.symptoms?.length ? emergency.symptoms.map((item) => <p key={item}>{item}</p>) : <p>None reported</p>}</div></div>{emergency.patient.criticalNotes?.length ? <div className="patient-context"><span className="field-label">Emergency notes &amp; uploaded records</span>{emergency.patient.criticalNotes.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}</div> : null}</article>
      <article className={`detail-panel priority-panel priority-panel--${tone}`}><span className="eyebrow">AI-assisted priority</span><div className="priority-panel__score"><strong>{emergency.priority.score}</strong><span>/100</span></div><Badge tone={tone}>{emergency.priority.level}</Badge><div className="priority-reasons">{emergency.priority.reasons.map((reason) => <div key={reason}><Check size={15} /> {reason}</div>)}</div><p className="ai-disclaimer"><ShieldAlert size={16} /> AI-generated priority supports operations and does not replace clinical assessment. Hospital allocation is not performed by this frontend.</p></article>
    </section>
    <section className="location-card location-card--map">
      <div className="location-card__intro"><span className="eyebrow">Road routing</span><h2>{emergency.location.area}</h2><p><MapPin size={15} /> {emergency.location.city}, Maharashtra</p><div className="location-metrics"><div><span>{routeState.result ? 'Road distance' : 'Approx. hospital distance'}</span><strong>{roadDistance ?? '—'} km</strong></div><div><span>{routeState.result ? 'Estimated route time' : 'Prototype travel estimate'}</span><strong>{routedMinutes ? `${routedMinutes} min` : 'Calculating…'}</strong></div>{emergency.assignedAmbulance && <div><span>Ambulance ETA</span><strong>{ambulanceArrival === 0 ? 'At route milestone' : ambulanceArrival ? `${ambulanceArrival} min` : 'Calculating…'}</strong></div>}</div><small className={`estimate-note ${routeState.unavailable ? 'estimate-note--warning' : ''}`}>{routeState.loading ? 'Requesting an OpenStreetMap-compatible road route…' : routeState.unavailable ? 'Road route temporarily unavailable. A dashed approximate route is shown.' : 'OSRM prototype estimate · not live emergency traffic or navigation.'}</small></div>
      <EmergencyMap emergency={emergency} hospital={currentHospital} onRouteState={setRouteState} />
      <div className="map-legend" aria-label="Map locations"><div><MapPin size={17} /><span><strong>Patient</strong>Emergency location · {emergency.location.address}</span></div><div><Building2 size={17} /><span><strong>Hospital</strong>{currentHospital.name} · {currentHospital.department}</span></div>{emergency.assignedAmbulance && <div><AmbulanceIcon size={18} /><span><strong>Ambulance</strong>{emergency.assignedAmbulance.vehicleNumber} · {emergency.status.replaceAll('_', ' ')}</span></div>}<div className="route-key"><Navigation size={17} /><span><strong>Road route</strong>{['PATIENT_PICKED_UP', 'ARRIVED', 'COMPLETED'].includes(emergency.status) ? 'Patient/ambulance toward the current hospital' : emergency.assignedAmbulance ? 'Ambulance toward the patient; hospital route remains visible' : 'Current hospital toward the emergency location'}</span></div></div>
    </section>
    {canAssignResources && <AssignmentPanel emergency={emergency} ambulances={ambulances} doctors={doctors} ambulanceId={ambulanceId} doctorId={doctorId} onAmbulanceChange={setAmbulanceId} onDoctorChange={setDoctorId} onAssignAmbulance={assignAmbulance} onAssignDoctor={assignDoctor} busy={busy} />}
    <section className="timeline-card"><span className="eyebrow">Case activity</span><div className="timeline">{emergency.timeline.map((event) => <div className={`timeline-item ${event.completed ? 'is-complete' : ''} ${event.current ? 'is-current' : ''}`} key={event.id}><span className="timeline-node" /><div><strong>{event.label}</strong>{event.timestamp && <span>{event.timestamp}</span>}</div></div>)}</div></section>
    <EmergencyActionDock emergency={emergency} busy={busy} message={message} onAccept={acceptCase} onReject={() => setRejectOpen(true)} onAdvance={advanceStatus} />
    <RejectEmergencyDialog open={rejectOpen} onClose={() => setRejectOpen(false)} onConfirm={rejectCase} />
    <Toast message={message} onClose={() => setMessage('')} />
  </div>;
}
