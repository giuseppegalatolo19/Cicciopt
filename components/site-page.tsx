"use client";

import Link from "next/link";
import { HomeIcon } from "lucide-react";
import { PublicShell } from "./public-shell";
import { AboutPage, FaqPage, Home, LegalPage, LocationPage, MethodPage, ServiceDetail, ServicesPage } from "./public-pages";
import { AuthPage, BookingConfirmation, BookingPage } from "./booking-auth";
import {
  AdminAvailability,
  AdminCalendar,
  AdminClientDetail,
  AdminClients,
  AdminContent,
  AdminDashboard,
  AdminRequests,
  AdminServices,
  AdminSettings,
  AnamnesisPage,
  ClientCalendar,
  ClientDashboard,
  ClientDocuments,
  ClientProfile,
} from "./dashboard-pages";
import { Container } from "./ui";

export function SitePage({ route }: { route: string }) {
  if (route === "/cliente") return <ClientDashboard />;
  if (route === "/cliente/calendario") return <ClientCalendar />;
  if (route === "/cliente/anamnesi") return <AnamnesisPage />;
  if (route === "/cliente/documenti") return <ClientDocuments />;
  if (route === "/cliente/profilo") return <ClientProfile />;
  if (route === "/admin") return <AdminDashboard />;
  if (route === "/admin/richieste") return <AdminRequests />;
  if (route === "/admin/clienti") return <AdminClients />;
  if (route.startsWith("/admin/clienti/")) return <AdminClientDetail />;
  if (route === "/admin/calendario") return <AdminCalendar />;
  if (route === "/admin/disponibilita") return <AdminAvailability />;
  if (route === "/admin/servizi") return <AdminServices />;
  if (route === "/admin/contenuti") return <AdminContent />;
  if (route === "/admin/impostazioni") return <AdminSettings />;
  if (route === "/login") return <AuthPage mode="login" />;
  if (route === "/registrazione") return <AuthPage mode="register" />;
  if (route === "/recupera-password") return <AuthPage mode="recovery" />;
  if (route === "/prenota") return <PublicShell><BookingPage /></PublicShell>;
  if (route === "/prenotazione/conferma") return <PublicShell><BookingConfirmation /></PublicShell>;

  let page: React.ReactNode = null;
  if (route === "/") page = <Home />;
  else if (route === "/chi-sono") page = <AboutPage />;
  else if (route === "/servizi") page = <ServicesPage />;
  else if (route.startsWith("/servizi/")) page = <ServiceDetail slug={route.split("/")[2]} />;
  else if (route === "/metodo") page = <MethodPage />;
  else if (route === "/sede-contatti") page = <LocationPage />;
  else if (route === "/faq") page = <FaqPage />;
  else if (route === "/privacy") page = <LegalPage type="privacy" />;
  else if (route === "/cookie-policy") page = <LegalPage type="cookie" />;
  else if (route === "/termini") page = <LegalPage type="terms" />;
  else page = <NotFound />;
  return <PublicShell>{page}</PublicShell>;
}

function NotFound() {
  return <section className="not-found"><Container><span>404</span><h1>Questa pagina ha perso il ritmo.</h1><p>Nessun problema: torniamo al punto di partenza.</p><Link className="button button-primary" href="/"><HomeIcon size={17} /> Torna alla home</Link></Container></section>;
}
