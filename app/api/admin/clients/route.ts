import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).single();
  if (profile?.role !== "admin" || !profile.is_active) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const { data, error } = await supabase.from("clients").select("id,account_status,primary_goal,next_action,created_at,profiles(id,email,first_name,last_name,phone)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Clienti non disponibili." }, { status: 400 });
  return NextResponse.json({ clients: data ?? [] });
}
