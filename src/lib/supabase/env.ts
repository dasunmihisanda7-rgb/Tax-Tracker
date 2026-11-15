// Public Supabase settings. Safe for the browser: access is enforced by Row Level Security.
// The service-role key must never be read here or in any client code.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
