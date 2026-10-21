import {useEffect,useRef,useState} from 'react';
export function ConfirmationDialog({title,message,onConfirm,onClose}:{title:string;message:string;onConfirm:()=>Promise<void>;onClose:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{const previous=document.activeElement as HTMLElement;ref.current?.showModal();return()=>{ref.current?.close();previous?.focus();};},[]);
 return <dialog ref={ref} className="resource-editor" aria-labelledby="confirmation-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><h2 id="confirmation-title">{title}</h2><p>{message}</p>{error && <p role="alert">{error}</p>}<div className="editor-actions"><button className="button" disabled={busy} onClick={onClose}>Cancel</button><button className="button button--primary" disabled={busy} onClick={async()=>{setBusy(true);try{await onConfirm();onClose();}catch(e){setError(e instanceof Error?e.message:'Unable to complete action.');}finally{setBusy(false);}}}>{busy?'Working…':'Confirm reset'}</button></div></dialog>;
}
