import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY

  let readResult = null
  let writeResult = null
  let readError = null
  let writeError = null

  try {
    const db = createServerClient()

    // Test read
    const r = await db.from('preferences').select('id').limit(1).maybeSingle()
    readResult = r.data ? 'ok' : 'no rows'
    readError = r.error?.message ?? null

    // Test write (no-op update to existing row)
    if (r.data?.id) {
      const w = await db
        .from('preferences')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', r.data.id)
      writeResult = w.error ? 'failed' : 'ok'
      writeError = w.error?.message ?? null
    } else {
      writeResult = 'skipped (no row to update)'
    }
  } catch (e) {
    readError = String(e)
  }

  return NextResponse.json({
    env: { hasUrl, hasAnon, hasServiceRole },
    db: { readResult, readError, writeResult, writeError },
  })
}
