"use client";

import Link from "next/link";
import { HomeIcon } from "lucide-react";
import { PublicShell } from "./public-shell";
import { AboutPage, ContactPage, FaqPage, Home, LegalPage, MethodPage, ServiceDetail, ServicesPage } from "./public-pages";
import { AuthPage, BookingConfirmation, ResetPasswordPage } from "./booking-auth";
import BookingPage from "./booking-live";
import { MfaPage } from "./mfa-page";
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
import { LiveAdminCalendar, LiveAdminClientDetail, LiveAdminClients, LiveAdminContent, LiveAdminDashboard, LiveAdminRequests, LiveAdminAvailability, LiveAdminServices, LiveAnamnesisPage, LiveClientCalendar, LiveClientDashboard, LiveClientDocuments, LiveClientProfile } from "./live-portal-pages";

export function SitePage({ route }: { route: string }) {
  if (route === "/cliente") return <LiveClientDashboard />;
  if (route === "/cliente/calendario") return <LiveClientCalendar />;
  if (route === "/cliente/anamnesi") return <LiveAnamnesisPage />;
  if (route === "/cliente/documenti") return <LiveClientDocuments />;
  if (route === "/cliente/profilo") return <LiveClientProfile />;
  if (route === "/admin") return <LiveAdminDashboard />;
  if (route === "/admin/richieste") return <LiveAdminRequests />;
  if (route === "/admin/clienti") return <LiveAdminClients />;
  if (route.startsWith("/admin/clienti/")) return <LiveAdminClientDetail />;
  if (route === "/admin/calendario") return <LiveAdminCalendar />;
  if (route === "/admin/disponibilita") return <LiveAdminAvailability />;
  if (route === "/admin/servizi") return <LiveAdminServices />;
  if (route === "/admin/contenuti") return <LiveAdminContent />;
  if (route === "/admin/impostazioni") return <AdminSettings />;
  if (route === "/login") return <AuthPage mode="login" />;
  if (route === "/registrazione") return <AuthPage mode="register" />;
  if (route === "/recupera-password") return <AuthPage mode="recovery" />;
  if (route === "/reset-password" || route === "/aggiorna-password") return <ResetPasswordPage />;
  if (route === "/mfa") return <MfaPage />;
  if (route === "/prenota") return <PublicShell><BookingPage /></PublicShell>;
  if (route === "/prenotazione/conferma") return <PublicShell><BookingConfirmation /></PublicShell>;

  let page: React.ReactNode = null;
  if (route === "/") page = <Home />;
  else if (route === "/chi-sono") page = <AboutPage />;
  else if (route === "/servizi") page = <ServicesPage />;
  else if (route.startsWith("/servizi/")) page = <ServiceDetail slug={route.split("/")[2]} />;
  else if (route === "/metodo") page = <MethodPage />;
  else if (route === "/contatti" || route === "/sede-contatti") page = <ContactPage />;
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
