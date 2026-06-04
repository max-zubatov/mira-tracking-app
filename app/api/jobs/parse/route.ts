import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import Steel from 'steel-sdk'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  try {
    // Use Steel to scrape — handles JS-heavy job boards (Greenhouse, Lever, Workday, etc.)
    const steel = new Steel({ steelAPIKey: process.env.STEEL_API_KEY })
    const scraped = await steel.scrape({ url, format: ['markdown'], useProxy: true })
    const text = (scraped.content.markdown ?? '').slice(0, 8000)

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Extract job listing details from this page. Return ONLY a JSON object with: title, company, overview (2-3 sentence summary), compensation (if mentioned, e.g. "$120k-$150k"). Use null for missing fields.

Page content:
${text}

Return JSON only, no markdown.`,
        },
      ],
    })

    const raw = (response.content[0] as { type: string; text: string }).text.trim()
    const json = JSON.parse(raw.startsWith('```') ? raw.replace(/```json?\n?|```/g, '') : raw)
    return NextResponse.json(json)
  } catch {
    return NextResponse.json({ title: null, company: null, overview: null, compensation: null })
  }
}
