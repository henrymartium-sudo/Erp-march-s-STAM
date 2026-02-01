import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase pour utilisation côté serveur (Server Components, Server Actions)
 * Utilise la clé service_role pour opérations privilégiées (upload, delete, etc.)
 *
 * IMPORTANT : Ce client a des privilèges élevés, utiliser uniquement côté serveur
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
