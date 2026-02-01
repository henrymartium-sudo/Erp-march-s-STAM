import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase pour utilisation côté client (Client Components)
 * Utilise la clé anon publique
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  })
}
