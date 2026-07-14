import { createClient } from "@supabase/supabase-js";

const defaultSupabaseUrl = "https://uvhmgijhgqmjgavhdqdk.supabase.co";
const defaultSupabaseAnonKey = "sb_publishable_4WigmsKKSPPaWBuBpJJg3Q_H77NEkue";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to run against the database."
  );
}
