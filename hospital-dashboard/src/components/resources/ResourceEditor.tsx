import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { HospitalResourceSummary } from '../../types';
import { resourceService } from '../../services/resourceService';
export type Editor = {kind: 'beds' | 'doctor' | 'ambulance'; id?: string; remove?: boolean};
export function ResourceEditor({editor, data, onClose, onSaved}: {editor: Editor; data: HospitalResourceSummary; onClose: () => void; onSaved: (r: HospitalResourceSummary) => void}) {
 const ref = useRef<HTMLDialogElement>(null);
 const [busy,setBusy] = useState(false); const [error,setError] = useState('');
 const doctor = data.doctors.find(d => d.id === editor.id); const ambulance = data.ambulances.find(a => a.id === editor.id);
 useEffect(() => { const dialog = ref.current; const previous = document.activeElement as HTMLElement; dialog?.showModal(); return () => { dialog?.close(); previous?.focus(); }; }, []);
 async function submit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError('');
  const text = (key: string) => String(f.get(key) ?? '').trim();
  try {
   let result: HospitalResourceSummary;
   if (editor.kind === 'beds') {
    result = await resourceService.updateBeds(data.hospitalId, Object.fromEntries(['general','icu','emergency'].map(k => [k,{total:Number(f.get(k+'Total')),occupied:Number(f.get(k+'Occupied'))}])) as Parameters<typeof resourceService.updateBeds>[1]);
   } else if (editor.kind === 'doctor') {
    const payload = {name:text('name'),department:text('department'),specialization:text('specialization'),phone:text('phone'),status:text('status') as 'AVAILABLE'};
    result = editor.remove ? await resourceService.deleteDoctor(data.hospitalId,editor.id!) : editor.id ? await resourceService.updateDoctor(data.hospitalId,editor.id,payload) : await resourceService.createDoctor(data.hospitalId,payload);
   } else {
    const payload = {vehicleNumber:text('vehicleNumber'),driverName:text('driverName'),driverPhone:text('driverPhone'),status:text('status') as 'AVAILABLE'};
    result = editor.remove ? await resourceService.deleteAmbulance(data.hospitalId,editor.id!) : editor.id ? await resourceService.updateAmbulance(data.hospitalId,editor.id,payload) : await resourceService.createAmbulance(data.hospitalId,payload);
   }
   onSaved(result);
  } catch(e) {setError(e instanceof Error ? e.message : 'Unable to save changes.');} finally {setBusy(false);}
 }
 function field(label: string, name: string, value = '', required = false) { return <label>{label}<input name={name} defaultValue={value} required={required}/></label>; }
 let fields: ReactNode;
 if(editor.remove) fields = <p>Remove <strong>{doctor?.name ?? ambulance?.vehicleNumber}</strong> from this hospital? This cannot be undone.</p>;
 else if(editor.kind === 'beds') fields = <>{(['general','icu','emergency'] as const).map(k => <fieldset key={k}><legend>{k === 'icu' ? 'ICU' : k[0].toUpperCase()+k.slice(1)} beds</legend><div className="editor-grid"><label>Total capacity<input name={k+'Total'} type="number" min="0" step="1" required defaultValue={data.beds[k].total}/></label><label>Occupied<input name={k+'Occupied'} type="number" min="0" step="1" required defaultValue={data.beds[k].occupied}/></label></div></fieldset>)}<p>Available beds are calculated from capacity minus occupied beds.</p></>;
 else if(editor.kind === 'doctor') fields = <>{field('Doctor name','name',doctor?.name,true)}{field('Department','department',doctor?.department)}{field('Specialization','specialization',doctor?.specialization)}{field('Phone (optional)','phone',doctor?.phone)}<label>Status<select name="status" defaultValue={doctor?.status ?? 'AVAILABLE'}>{['AVAILABLE','BUSY','OFF_DUTY'].map(s => <option key={s}>{s}</option>)}</select></label></>;
 else fields = <>{field('Vehicle number','vehicleNumber',ambulance?.vehicleNumber,true)}{field('Driver name (optional)','driverName',ambulance?.driverName)}{field('Driver phone (optional)','driverPhone',ambulance?.driverPhone)}<label>Status<select name="status" defaultValue={ambulance?.status ?? 'AVAILABLE'}>{['AVAILABLE','ASSIGNED','EN_ROUTE','TRANSPORTING','MAINTENANCE','OFFLINE','UNAVAILABLE'].map(s => <option key={s}>{s}</option>)}</select></label></>;
 return <dialog ref={ref} className="resource-editor" aria-labelledby="editor-title" onCancel={e => {e.preventDefault();if(!busy)onClose();}}><form className="management-form" onSubmit={submit}><h2 id="editor-title">{editor.remove ? 'Remove' : editor.id || editor.kind === 'beds' ? 'Edit' : 'Add'} {editor.kind}</h2><fieldset disabled={busy} className="editor-fields">{fields}</fieldset>{error && <p role="alert" className="login-error">{error}</p>}<div className="editor-actions"><button type="button" className="button" onClick={onClose} disabled={busy}>Cancel</button><button className="button button--primary" disabled={busy}>{busy ? 'Saving…' : editor.remove ? 'Remove' : 'Save'}</button></div></form></dialog>;
}
