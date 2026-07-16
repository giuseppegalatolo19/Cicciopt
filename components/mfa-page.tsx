"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "./public-shell";

export function MfaPage() {
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(async ({ data, error: listError }) => {
      if (listError) { setError(listError.message); setLoading(false); return; }
      const verified = data.totp.find((factor) => factor.status === "verified");
      if (verified) { setFactorId(verified.id); setLoading(false); return; }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Francesco Crivello admin" });
      if (enrollError) setError(enrollError.message);
      else { setFactorId(enrolled.id); setQrCode(enrolled.totp.qr_code); setSecret(enrolled.totp.secret); }
      setLoading(false);
    });
  }, []);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setVerifying(true); setError("");
    const code = String(new FormData(event.currentTarget).get("code") || "").replace(/\s/g, "");
    const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) { setError("Codice non valido o scaduto."); setVerifying(false); return; }
    window.location.assign("/admin");
  }

  return <section className="auth-page"><div className="auth-visual"><Brand inverse/><div><span>Protezione amministratore</span><blockquote>“Un secondo fattore protegge clienti, agenda e documentazione.”</blockquote></div><small>Supabase Auth · TOTP · AAL2</small></div><div className="auth-form-wrap"><Link className="auth-home" href="/"><ArrowLeft size={15}/>Torna al sito</Link><div className="auth-form"><span className="auth-icon"><LockKeyhole/></span><h1>Verifica in due passaggi.</h1><p>{qrCode ? "Scansiona il QR con un’app autenticatore, poi inserisci il codice a sei cifre." : "Inserisci il codice generato dalla tua app autenticatore."}</p>{loading?<p>Preparazione verifica…</p>:<>{qrCode&&<div className="auth-success"><img src={qrCode} alt="QR code per configurare l’autenticazione TOTP" width={180} height={180}/><strong>Chiave di recupero manuale</strong><p>{secret}</p></div>}{error&&<div className="auth-success" role="alert"><ShieldCheck/><strong>Verifica non riuscita</strong><p>{error}</p></div>}<form onSubmit={verify}><label className="field"><span>Codice autenticatore</span><input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required/></label><button className="button button-primary full-button" disabled={verifying||!factorId}>{verifying?"Verifica…":"Verifica e accedi"}<CheckCircle2 size={17}/></button></form></>}</div></div></section>;
}
