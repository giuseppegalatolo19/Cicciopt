const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function missing(name: string): never {
  throw new Error(
    `[Supabase] Variabile ${name} mancante. Copia .env.example in .env.local e inserisci la chiave pubblica del progetto.`,
  );
}

export function getSupabaseConfig() {
  if (!projectUrl) missing("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey || anonKey === "your_supabase_anon_key") {
    missing("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { url: projectUrl, anonKey };
}

export function isSupabaseConfigured() {
  return Boolean(projectUrl && anonKey && anonKey !== "your_supabase_anon_key");
}
