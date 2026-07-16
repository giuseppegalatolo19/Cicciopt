"use client";

import Link from "next/link";
import { Check, ChevronRight, LucideIcon } from "lucide-react";
import { PropsWithChildren, ReactNode } from "react";

export function Container({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`container ${className}`}>{children}</div>;
}

export function Eyebrow({ children, tone = "light" }: PropsWithChildren<{ tone?: "light" | "dark" }>) {
  return <div className={`eyebrow eyebrow-${tone}`}><span />{children}</div>;
}

export function SectionTitle({ eyebrow, title, body, align = "left", light = false }: { eyebrow?: string; title: ReactNode; body?: ReactNode; align?: "left" | "center"; light?: boolean }) {
  return (
    <div className={`section-title ${align === "center" ? "section-title-center" : ""} ${light ? "section-title-light" : ""}`}>
      {eyebrow && <Eyebrow tone={light ? "dark" : "light"}>{eyebrow}</Eyebrow>}
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </div>
  );
}

export function Button({ href, children, variant = "primary", icon = true, className = "" }: PropsWithChildren<{ href: string; variant?: "primary" | "secondary" | "ghost" | "light"; icon?: boolean; className?: string }>) {
  return <Link href={href} className={`button button-${variant} ${className}`}>{children}{icon && <ChevronRight size={17} strokeWidth={2.2} />}</Link>;
}

export function IconTile({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return <div className="icon-tile"><Icon size={20} />{children}</div>;
}

export function CheckItem({ children }: PropsWithChildren) {
  return <div className="check-item"><span><Check size={14} strokeWidth={3} /></span><p>{children}</p></div>;
}

export function Status({ children, tone = "neutral" }: PropsWithChildren<{ tone?: "success" | "warning" | "danger" | "info" | "neutral" }>) {
  return <span className={`status status-${tone}`}><i />{children}</span>;
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  return <span className={`avatar avatar-${size}`}>{name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>;
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state"><span><Icon size={24} /></span><h3>{title}</h3><p>{body}</p>{action}</div>;
}
