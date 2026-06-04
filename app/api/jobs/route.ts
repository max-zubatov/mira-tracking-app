import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  let db
  try { db = createServerClient() } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 })
  }
  const { data, error } = await db
    .from('jobs')
    .select('*')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  let db
  try { db = createServerClient() } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 })
  }
  const body = await req.json()

  const { data, error } = await db
    .from('jobs')
    .insert({
      title: body.title,
      company: body.company,
      logo_url: body.logo_url ?? null,
      overview: body.overview ?? null,
      compensation: body.compensation ?? null,
      link: body.link ?? null,
      status: body.status ?? 'tracking',
      source: body.source ?? 'manual',
      fit_score: body.fit_score ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
