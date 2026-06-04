import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  let db
  try { db = createServerClient() } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 })
  }

  const { data, error } = await db
    .from('preferences')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[GET /api/preferences]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? {})
}

export async function PUT(req: NextRequest) {
  let db
  try { db = createServerClient() } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 })
  }
  const body = await req.json()

  // Only write the columns that exist and have real values — drop undefined/null fit fields
  // that the modal no longer surfaces. Use nullish coalescing to fall back to safe defaults.
  const fields: Record<string, unknown> = {}

  if (body.compensation_min  !== undefined) fields.compensation_min  = Number(body.compensation_min)
  if (body.compensation_max  !== undefined) fields.compensation_max  = Number(body.compensation_max)
  if (body.company_size_values !== undefined) fields.company_size_values = body.company_size_values
  if (body.industry_values   !== undefined) fields.industry_values   = body.industry_values
  if (body.role_values       !== undefined) fields.role_values       = body.role_values
  if (body.skill_values      !== undefined) fields.skill_values      = body.skill_values
  if (body.seniority_years  !== undefined) fields.seniority_years   = body.seniority_years === null ? null : Number(body.seniority_years)
  if (body.location         !== undefined) fields.location          = body.location ?? null

  // Keep fit columns at their defaults if they come through (backward compat)
  if (body.compensation_fit  !== undefined) fields.compensation_fit  = body.compensation_fit
  if (body.company_size_fit  !== undefined) fields.company_size_fit  = body.company_size_fit
  if (body.industry_fit      !== undefined) fields.industry_fit      = body.industry_fit
  if (body.role_fit          !== undefined) fields.role_fit          = body.role_fit
  if (body.skills_fit        !== undefined) fields.skills_fit        = body.skills_fit

  const { data: existing } = await db
    .from('preferences')
    .select('id')
    .limit(1)
    .maybeSingle()

  let result
  if (existing) {
    result = await db
      .from('preferences')
      .update(fields)
      .eq('id', existing.id)
      .select()
      .single()
  } else {
    result = await db
      .from('preferences')
      .insert({
        ...fields,
        // Ensure required NOT NULL columns have defaults on fresh insert
        compensation_fit:  fields.compensation_fit  ?? 3,
        company_size_fit:  fields.company_size_fit  ?? 3,
        industry_fit:      fields.industry_fit      ?? 3,
        role_fit:          fields.role_fit          ?? 3,
        skills_fit:        fields.skills_fit        ?? 3,
      })
      .select()
      .single()
  }

  if (result.error) {
    console.error('[PUT /api/preferences]', result.error.message)
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }
  return NextResponse.json(result.data)
}
