"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Facebook, Instagram, LockKeyhole, Menu, X } from "lucide-react";
import { navLinks } from "@/lib/data";
import { Button, Container } from "./ui";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand ${inverse ? "brand-inverse" : ""}`} href="/" aria-label="Francesco Crivello, home">
      <span className="brand-logo"><Image src="/brand/francesco-crivello-logo.jpeg" alt="" fill sizes="220px" /></span>
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="site-header">
      <Container className="header-inner">
        <Brand />
        <nav className={open ? "main-nav main-nav-open" : "main-nav"} aria-label="Navigazione principale">
          {navLinks.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={pathname === href ? "active" : ""}>{label}</Link>)}
          <Link href="/login" onClick={() => setOpen(false)} className="nav-login"><LockKeyhole size={15} /> Area clienti</Link>
          <Button href="/prenota" icon={false}>Prenota</Button>
        </nav>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Chiudi menu" : "Apri menu"}>{open ? <X /> : <Menu />}</button>
      </Container>
    </header>
  );
}

export function Footer() {
  const [content,setContent]=useState({text:"Allenamento personalizzato, metodo e supporto costante per costruire risultati concreti e sostenibili.",credits:"© 2026 Francesco Crivello · P. IVA [da inserire]",phone:"+39 000 000 0000",email:"ciao@francescocrivello.it",instagram:"#"});
  useEffect(()=>{if(!isSupabaseConfigured())return;(createClient().from("site_content") as any).select("content_key,value").in("content_key",["footer.main","contact.main"]).eq("is_published",true).then(({data}:{data:any[]|null})=>{if(!data)return;const footer=data.find(row=>row.content_key==="footer.main")?.value||{};const contact=data.find(row=>row.content_key==="contact.main")?.value||{};setContent(current=>({...current,...footer,phone:contact.phone||current.phone,email:contact.email||current.email,instagram:contact.instagram||current.instagram}))})},[]);
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-top">
          <div><Brand inverse /><p>{content.text}</p><div className="socials"><a href={content.instagram.startsWith("http")?content.instagram:"#"} aria-label="Instagram"><Instagram size={19} /></a><a href="#" aria-label="Facebook"><Facebook size={19} /></a></div></div>
          <div><h3>Esplora</h3><Link href="/chi-sono">Chi sono</Link><Link href="/servizi">Servizi</Link><Link href="/metodo">Il metodo</Link><Link href="/faq">FAQ</Link></div>
          <div><h3>Contatti</h3><p>{content.phone}</p><p>{content.email}</p><p>Online, a domicilio o nella palestra del cliente, previo accordo.</p></div>
          <div><h3>Area personale</h3><Link href="/login">Accedi</Link><Link href="/registrazione">Attiva account</Link><Link href="/prenota">Prenota una sessione</Link><Link href="/contatti">Richiedi informazioni</Link></div>
        </div>
        <div className="footer-bottom"><span>{content.credits}</span><div><Link href="/privacy">Privacy</Link><Link href="/cookie-policy">Cookie</Link><Link href="/termini">Termini e prenotazioni</Link><button onClick={() => localStorage.removeItem("cookie-choice")}>Gestisci cookie</button></div></div>
      </Container>
    </footer>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <><Header /><main>{children}</main><Footer /><CookieBanner /></>;
}

function CookieBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(!localStorage.getItem("cookie-choice")), []);
  if (!visible) return null;
  const choose = (value: string) => { localStorage.setItem("cookie-choice", value); setVisible(false); };
  return <div className="cookie-banner" role="dialog" aria-label="Preferenze cookie"><div><strong>La tua privacy, senza giri di parole.</strong><p>Usiamo solo cookie necessari. Gli analytics restano disattivati finché non li accetti.</p></div><div><button onClick={() => choose("necessary")}>Solo necessari</button><button className="cookie-accept" onClick={() => choose("all")}>Accetta tutti</button></div></div>;
}
