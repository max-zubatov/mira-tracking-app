import { createClient } from '@supabase/supabase-js'

// Lazy singleton for client-side usage
let _client: ReturnType<typeof createClient> | null = null
export function getSupabase() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}

// Server-side client with service role (bypasses RLS)
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || url === 'https://your-project.supabase.co' || !url.startsWith('https://')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured. Add your real Supabase project URL to .env.local')
  }
  if (!key || key === 'your-anon-key' || key === 'your-service-role-key') {
    throw new Error('Supabase API key is not configured. Add your real key to .env.local')
  }

  return createClient(url, key)
}
