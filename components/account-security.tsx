"use client";

import { FormEvent, useRef, useState } from "react";
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PortalShell } from "./dashboard-pages";

export function AccountSecurityPanel() {
  const inFlight=useRef(false); const [message,setMessage]=useState(""); const [error,setError]=useState(""); const [saving,setSaving]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(inFlight.current)return;const form=new FormData(event.currentTarget);const password=String(form.get("password")||"");const confirmation=String(form.get("confirmation")||"");setMessage("");setError("");if(password.length<10)return setError("La password deve contenere almeno 10 caratteri.");if(password!==confirmation)return setError("Le password non coincidono.");inFlight.current=true;setSaving(true);const {error:updateError}=await createClient().auth.updateUser({password});inFlight.current=false;setSaving(false);if(updateError)return setError(updateError.message.toLowerCase().includes("same")?"Scegli una password diversa da quella attuale.":"Aggiornamento non riuscito. Riprova.");event.currentTarget.reset();setMessage("Password aggiornata correttamente.")}
  return <form className="panel profile-form password-panel" onSubmit={submit}><div className="panel-head"><div><span>Sicurezza account</span><h2>Cambia password</h2></div><KeyRound/></div><p>La modifica usa Supabase Auth e non richiede l’invio di un’email quando sei già autenticato.</p><div className="form-grid"><label className="field"><span>Nuova password</span><input name="password" type="password" minLength={10} required autoComplete="new-password"/></label><label className="field"><span>Conferma password</span><input name="confirmation" type="password" minLength={10} required autoComplete="new-password"/></label></div>{error&&<div className="medical-notice" role="alert"><p>{error}</p></div>}{message&&<div className="inline-success" role="status"><CheckCircle2/>{message}</div>}<button className="button button-primary" disabled={saving}><ShieldCheck size={16}/>{saving?"Aggiornamento…":"Aggiorna password"}</button></form>;
}

export function AdminAccountSettings(){return <PortalShell type="admin" eyebrow="Profilo e sicurezza" title="Impostazioni"><AccountSecurityPanel/><section className="panel"><div className="panel-head"><div><span>Autenticazione</span><h2>Recupero e MFA</h2></div><ShieldCheck/></div><p>Il recupero per utenti non autenticati resta disponibile via email. La MFA viene mantenuta per tutta la sessione e richiesta nuovamente soltanto dopo un nuovo accesso o la scadenza della sessione.</p></section></PortalShell>}
