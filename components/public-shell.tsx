"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Facebook, Instagram, LockKeyhole, Menu, X } from "lucide-react";
import { navLinks } from "@/lib/data";
import { Button, Container } from "./ui";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand ${inverse ? "brand-inverse" : ""}`} href="/" aria-label="Francesco Crivello, home">
      <span className="brand-mark">FC</span>
      <span><strong>Francesco Crivello</strong><small>Personal Trainer</small></span>
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
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-top">
          <div><Brand inverse /><p>Allenamento personalizzato, metodo e supporto costante per costruire risultati concreti e sostenibili.</p><div className="socials"><a href="#" aria-label="Instagram"><Instagram size={19} /></a><a href="#" aria-label="Facebook"><Facebook size={19} /></a></div></div>
          <div><h3>Esplora</h3><Link href="/chi-sono">Chi sono</Link><Link href="/servizi">Servizi</Link><Link href="/metodo">Il metodo</Link><Link href="/faq">FAQ</Link></div>
          <div><h3>Contatti</h3><p>+39 000 000 0000</p><p>ciao@francescocrivello.it</p><p>Studio Forma<br />Via Esempio 24, Palermo</p></div>
          <div><h3>Area personale</h3><Link href="/login">Accedi</Link><Link href="/registrazione">Attiva account</Link><Link href="/prenota">Prenota una sessione</Link><Link href="/sede-contatti">Richiedi informazioni</Link></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Francesco Crivello · P. IVA [da inserire]</span><div><Link href="/privacy">Privacy</Link><Link href="/cookie-policy">Cookie</Link><Link href="/termini">Termini e prenotazioni</Link><button onClick={() => localStorage.removeItem("cookie-choice")}>Gestisci cookie</button></div></div>
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
