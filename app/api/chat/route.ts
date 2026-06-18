import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const client = new Anthropic()

// Hard token limit — never adjustable, enforced server-side only
const TOKEN_LIMIT = 100_000

// ─── Tool definitions ─────────────────────────────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: 'find_matching_companies',
    description: 'Step 1. Uses Google (via Serper) to find real companies matching the user\'s preferred industry and company size.',
    input_schema: {
      type: 'object' as const,
      properties: {
        industry:     { type: 'string', description: 'e.g. "SaaS", "FinTech", "Healthcare"' },
        company_size: { type: 'string', description: 'e.g. "startup", "mid-size", "enterprise"' },
        count:        { type: 'number', description: 'Number of companies to return (default 6)' },
      },
      required: ['industry', 'company_size'],
    },
  },
  {
    name: 'find_career_page',
    description:
      'Step 2 of job search. Given a company name, finds the URL of their official careers/jobs page.',
    input_schema: {
      type: 'object' as const,
      properties: {
        company_name: { type: 'string', description: 'Exact company name' },
      },
      required: ['company_name'],
    },
  },
  {
    name: 'scrape_career_page',
    description:
      'Step 3 of job search. Scrapes a company career page and returns all job listings found. You then filter for matching roles and compensation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'The career page URL to scrape' },
        company: { type: 'string', description: 'Company name' },
      },
      required: ['url', 'company'],
    },
  },
  {
    name: 'add_job',
    description: 'Save a confirmed job match to the tracker.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        company: { type: 'string' },
        logo_url: { type: 'string' },
        overview: { type: 'string', description: '2-3 sentence summary of the role' },
        compensation: { type: 'string', description: 'e.g. "$140k–$180k"' },
        link: { type: 'string', description: 'Direct URL to the job posting' },
        fit_score: { type: 'number', description: '1–5 based on how well it matches all preferences' },
      },
      required: ['title', 'company'],
    },
  },
  {
    name: 'fetch_job_url',
    description: 'Fetch and parse a specific job URL pasted by the user.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string' },
      },
      required: ['url'],
    },
  },
  {
    name: 'update_preferences',
    description: "Update the user's saved account preferences.",
    input_schema: {
      type: 'object' as const,
      properties: {
        compensation_min: { type: 'number' },
        compensation_max: { type: 'number' },
        company_size_values: { type: 'array', items: { type: 'string' } },
        industry_values: { type: 'array', items: { type: 'string' } },
        role_values: { type: 'array', items: { type: 'string' } },
        skill_values: { type: 'array', items: { type: 'string' } },
      },
    },
  },
]

// ─── Tool executors ───────────────────────────────────────────────────────────

// ── Serper: real Google results as structured JSON ──
interface SerperResult { title: string; link: string; snippet: string }

async function serperSearch(query: string, num = 10): Promise<SerperResult[]> {
  const key = process.env.SERPER_API_KEY
  if (!key) throw new Error('SERPER_API_KEY not set in .env.local')
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num }),
  })
  if (!res.ok) throw new Error(`Serper responded ${res.status}`)
  const data = await res.json()
  return (data.organic ?? []) as SerperResult[]
}

async function findMatchingCompanies(industry: string, companySize: string, count = 6): Promise<string> {
  try {
    // Run two complementary queries in parallel for broader coverage
    const [a, b] = await Promise.all([
      serperSearch(`top ${companySize} ${industry} companies`, 10),
      serperSearch(`best ${industry} companies to work for ${companySize}`, 10),
    ])
    const combined = [...a, ...b]
    const text = combined.map((r) => `${r.title}\n${r.snippet}`).join('\n\n')
    return JSON.stringify({
      results: combined.map((r) => ({ title: r.title, snippet: r.snippet, link: r.link })),
      task: `From these search results extract up to ${count} distinct company names that are clearly ${companySize} companies in the ${industry} space. Return ONLY a JSON array of strings, e.g. ["Acme", "Globex"]. No markdown.`,
    })
  } catch (e) {
    return JSON.stringify({ error: String(e) })
  }
}

async function steelScrape(url: string, useProxy = true): Promise<string> {
  const key = process.env.STEEL_API_KEY
  if (!key) throw new Error('STEEL_API_KEY not configured')
  // Dynamic import prevents the SDK from touching env at module load time
  const { default: Steel } = await import('steel-sdk')
  const steel = new Steel({ steelAPIKey: key })
  const result = await steel.scrape({ url, format: ['markdown'], useProxy })
  return result.content.markdown ?? ''
}

/** Convert a company name to its most likely .com domain slug */
function toDomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/,?\s+(inc|llc|corp|ltd|co|plc|technologies|technology|software|solutions)\.?$/i, '')
    .replace(/&/g, 'and')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9-]/g, '')
}

/** Probe a URL with a HEAD request. Returns true if the page exists (2xx or 3xx). */
async function urlExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobTracker/1.0)' },
    })
    return res.status < 400
  } catch {
    return false
  }
}

async function findCareerPage(companyName: string): Promise<string> {
  const slug = toDomain(companyName)

  // ── Priority order: probe common patterns without any scraping ──
  const candidates = [
    // ATS-hosted boards (highest hit rate for tech companies)
    `https://boards.greenhouse.io/${slug}`,
    `https://${slug}.lever.co`,
    `https://${slug}.jobs.lever.co`,
    `https://jobs.ashbyhq.com/${slug}`,
    `https://${slug}.rippling-ats.com`,
    // Company-owned pages
    `https://www.${slug}.com/careers`,
    `https://www.${slug}.com/jobs`,
    `https://www.${slug}.com/about/careers`,
    `https://www.${slug}.com/company/careers`,
    `https://careers.${slug}.com`,
    `https://jobs.${slug}.com`,
    `https://www.${slug}.com/en/careers`,
    `https://www.${slug}.com/work-with-us`,
  ]

  // Test all in parallel, take first hit
  const results = await Promise.all(
    candidates.map(async (url) => ({ url, ok: await urlExists(url) }))
  )
  const hit = results.find((r) => r.ok)

  if (hit) {
    return JSON.stringify({ company: companyName, career_url: hit.url })
  }

  // ── Fallback: Serper Google search for the career page URL ──
  try {
    const hits = await serperSearch(`${companyName} careers jobs official`, 5)
    const urlRe = /https?:\/\/[a-z0-9.-]+\/(?:careers|jobs|open-roles|work-with-us)(?:\/[^\s)"<]*)?/i
    const atsRe = /https?:\/\/(?:boards\.greenhouse\.io|[a-z0-9-]+\.lever\.co|jobs\.ashbyhq\.com)\/[^\s)"<]+/i
    for (const hit of hits) {
      if (atsRe.test(hit.link) || urlRe.test(hit.link)) {
        return JSON.stringify({ company: companyName, career_url: hit.link })
      }
    }
    // Last resort: return the top result link for Claude to judge
    if (hits.length > 0) {
      return JSON.stringify({ company: companyName, career_url: hits[0].link, note: 'best guess — verify' })
    }
  } catch {}

  return JSON.stringify({
    company: companyName,
    error: `Could not locate a career page for "${companyName}". Try a different company name or paste the URL directly.`,
  })
}

// ── Tier 1: query ATS public APIs directly — no proxy, no scraping needed ──
async function queryATSApi(url: string, company: string): Promise<string | null> {
  const headers = { 'User-Agent': 'JobTracker/1.0', 'Accept': 'application/json' }
  const timeout = AbortSignal.timeout(8000)

  // Greenhouse public Job Board API — no ?content=true to keep response small
  if (url.includes('greenhouse.io')) {
    const slug = url.match(/greenhouse\.io\/([^/?#]+)/)?.[1] ?? toDomain(company)
    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
        { headers, signal: timeout }
      )
      if (res.ok) {
        const data = await res.json()
        // Only keep the fields Claude actually needs — discard verbose content/metadata
        const jobs = (data.jobs ?? []).slice(0, 15).map((j: Record<string, unknown>) => ({
          title: j.title,
          location: (j.location as Record<string, unknown>)?.name,
          url: j.absolute_url,
          department: (Array.isArray(j.departments) ? j.departments : []).map((d: Record<string, unknown>) => d.name).join(', '),
        }))
        return JSON.stringify({ source: 'greenhouse_api', company, jobs })
      }
    } catch {}
  }

  // Lever public postings API
  if (url.includes('lever.co')) {
    const slug =
      url.match(/([a-z0-9-]+)\.lever\.co/)?.[1] ??
      url.match(/lever\.co\/([^/?#]+)/)?.[1] ??
      toDomain(company)
    try {
      const res = await fetch(
        `https://api.lever.co/v0/postings/${slug}?mode=json`,
        { headers, signal: AbortSignal.timeout(8000) }
      )
      if (res.ok) {
        const raw: Record<string, unknown>[] = await res.json()
        const jobs = raw.slice(0, 15).map((j) => ({
          title: j.text,
          team: (j.categories as Record<string, unknown>)?.team,
          location: (j.categories as Record<string, unknown>)?.location,
          url: j.applyUrl ?? j.hostedUrl,
        }))
        return JSON.stringify({ source: 'lever_api', company, jobs })
      }
    } catch {}
  }

  // Ashby — three-tier approach since their GraphQL API blocks server-side requests
  if (url.includes('ashbyhq.com')) {
    const initialSlug =
      url.match(/ashbyhq\.com\/([^/?#]+)/)?.[1] ?? toDomain(company)

    // Tier A: GraphQL API with full browser headers (required to bypass origin checks)
    const callAshby = async (slug: string): Promise<string | null> => {
      try {
        const res = await fetch('https://jobs.ashbyhq.com/api/non-user-graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Origin': 'https://jobs.ashbyhq.com',
            'Referer': `https://jobs.ashbyhq.com/${slug}`,
            'Accept': 'application/json',
            'apollographql-client-name': 'web',
          },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            operationName: 'ApiJobBoardWithTeams',
            variables: { organizationHostedJobsPageName: slug },
            query: `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
              jobBoard: publishedJobBoard(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
                jobPostings { id title locationName teamName applicationLink externalLink }
              }
            }`,
          }),
        })
        if (!res.ok) return null
        const data = await res.json()
        const postings: Record<string, unknown>[] = data?.data?.jobBoard?.jobPostings ?? []
        if (postings.length === 0) return null
        const jobs = postings.slice(0, 15).map((j) => ({
          title: j.title,
          location: j.locationName,
          team: j.teamName,
          url: j.applicationLink ?? j.externalLink ?? `https://jobs.ashbyhq.com/${slug}/${j.id}`,
        }))
        return JSON.stringify({ source: 'ashby_api', company, jobs })
      } catch { return null }
    }

    // Tier B: Parse __NEXT_DATA__ from the SSR-rendered HTML page (no API needed)
    const parseAshbyHtml = async (slug: string): Promise<string | null> => {
      try {
        const res = await fetch(`https://jobs.ashbyhq.com/${slug}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) return null
        const html = await res.text()
        const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(\{.+?\})<\/script>/)
        if (!match) return null
        const nextData = JSON.parse(match[1])
        const postings: Record<string, unknown>[] =
          nextData?.props?.pageProps?.jobPostings ??
          nextData?.props?.pageProps?.jobBoard?.jobPostings ?? []
        if (postings.length === 0) return null
        const jobs = postings.slice(0, 15).map((j) => ({
          title: j.title,
          location: j.locationName ?? j.location,
          team: j.teamName ?? j.team,
          url: j.applicationLink ?? j.externalLink ?? `https://jobs.ashbyhq.com/${slug}/${j.id}`,
        }))
        return JSON.stringify({ source: 'ashby_html', company, jobs })
      } catch { return null }
    }

    // Tier C: Serper — Google has indexed individual Ashby job pages; use site: search
    const serperAshby = async (slug: string): Promise<string | null> => {
      try {
        const queries = [
          `site:jobs.ashbyhq.com/${slug}`,
          `"${company}" jobs site:jobs.ashbyhq.com`,
        ]
        for (const q of queries) {
          const hits = await serperSearch(q, 10)
          // Keep only deep URLs (job posting pages, not the board root)
          const jobHits = hits.filter(h =>
            h.link.includes('ashbyhq.com/') &&
            (h.link.match(/\//g) ?? []).length >= 4
          )
          if (jobHits.length > 0) {
            const jobs = jobHits.slice(0, 10).map(h => ({
              title: h.title.replace(/\s+at\s+.+$/i, '').trim(),
              url: h.link,
              snippet: h.snippet,
            }))
            return JSON.stringify({ source: 'ashby_serper', company, jobs })
          }
        }
      } catch {}
      return null
    }

    // Run all three tiers in sequence, stopping at first success
    let result = await callAshby(initialSlug)

    if (!result) {
      // Real slug might differ — search Serper to resolve it, retry API + HTML
      try {
        const hits = await serperSearch(`${company} site:jobs.ashbyhq.com`, 3)
        for (const hit of hits) {
          const realSlug = hit.link.match(/jobs\.ashbyhq\.com\/([^/?#\s]+)/)?.[1]
          if (realSlug && realSlug !== initialSlug) {
            result = await callAshby(realSlug) ?? await parseAshbyHtml(realSlug)
            if (result) break
          }
        }
      } catch {}
    }

    if (!result) result = await parseAshbyHtml(initialSlug)
    if (!result) result = await serperAshby(initialSlug)

    if (result) return result
  }

  return null // not a directly queryable ATS
}

async function scrapeCareerPage(url: string, company: string): Promise<string> {
  // Each tier catches its own errors and falls through automatically.

  // Tier 1: ATS public API (Greenhouse / Lever / Ashby) — instant, no proxy
  try {
    const api = await queryATSApi(url, company)
    if (api) return api
  } catch {}

  // Tier 2: Steel scrape — direct (no proxy)
  try {
    const md = await steelScrape(url, false)
    if (md.length >= 80) return JSON.stringify({ company, url, content: md.slice(0, 4000) })
  } catch {}

  // Tier 3: Steel scrape — proxied
  try {
    const md = await steelScrape(url, true)
    if (md.length >= 80) return JSON.stringify({ company, url, content: md.slice(0, 4000) })
  } catch {}

  // Tier 4: Serper — actually run the search now, return real job links
  try {
    const queries = [
      `"${company}" software engineer jobs site:greenhouse.io OR site:lever.co OR site:ashbyhq.com OR site:workday.com`,
      `"${company}" open roles jobs careers`,
    ]
    for (const q of queries) {
      const hits = await serperSearch(q, 8)
      const jobHits = hits.filter(h =>
        /greenhouse\.io|lever\.co|ashbyhq\.com|workday\.com|careers|\/jobs?\//i.test(h.link)
      )
      const relevant = jobHits.length > 0 ? jobHits : hits
      if (relevant.length > 0) {
        return JSON.stringify({
          source: 'serper_fallback',
          company,
          jobs: relevant.slice(0, 8).map(h => ({
            title: h.title.replace(/\s+at\s+.+$/i, '').trim(),
            url: h.link,
            snippet: h.snippet,
          })),
        })
      }
    }
  } catch {}

  return JSON.stringify({ company, url, error: 'All access methods failed for this company.' })
}

async function verifyLinkActive(url: string): Promise<{ active: boolean; status: number | null }> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobTracker/1.0)' },
    })
    // 405 = HEAD not allowed but page exists; treat as active
    const active = res.status < 400 || res.status === 405
    return { active, status: res.status }
  } catch {
    // Network error — assume active (don't block the save)
    return { active: true, status: null }
  }
}

async function addJob(input: Record<string, unknown>): Promise<string> {
  const link    = input.link    ? String(input.link)    : null
  const title   = input.title   ? String(input.title)   : null
  const company = input.company ? String(input.company) : null

  // Verify the job URL is still live before saving
  if (link) {
    const { active, status } = await verifyLinkActive(link)
    if (!active) {
      return JSON.stringify({
        skipped: true,
        reason: `Job URL returned HTTP ${status} — position likely filled or removed.`,
        url: link,
      })
    }
  }

  const db = createServerClient()

  // Deduplication — skip if already tracked (any non-archived status)
  // Check 1: same URL
  if (link) {
    const { data: existing } = await db
      .from('jobs').select('id, title, status')
      .eq('link', link).neq('status', 'archived')
      .limit(1).maybeSingle()
    if (existing) {
      return JSON.stringify({
        duplicate: true,
        reason: `Already tracking "${existing.title}" (${existing.status}) with this URL.`,
      })
    }
  }

  // Check 2: same company + same title (case-insensitive)
  if (company && title) {
    const { data: existing } = await db
      .from('jobs').select('id, title, status')
      .ilike('company', company).ilike('title', title)
      .neq('status', 'archived')
      .limit(1).maybeSingle()
    if (existing) {
      return JSON.stringify({
        duplicate: true,
        reason: `Already tracking "${existing.title}" at ${company} (${existing.status}).`,
      })
    }
  }

  const { data, error } = await db
    .from('jobs')
    .insert({ ...input, source: 'ai', status: 'tracking' })
    .select()
    .single()
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ success: true, id: data.id, title: data.title, company: data.company })
}

async function updatePreferences(input: Record<string, unknown>): Promise<string> {
  const db = createServerClient()
  const { data: existing } = await db.from('preferences').select('id').limit(1).single()
  const op = existing
    ? db.from('preferences').update(input).eq('id', existing.id).select().single()
    : db.from('preferences').insert(input).select().single()
  const { error } = await op
  if (error) return JSON.stringify({ error: error.message })
  return JSON.stringify({ success: true })
}

async function fetchJobUrl(url: string): Promise<string> {
  // Try Steel first, fall back to plain fetch if key not set
  try {
    const md = await steelScrape(url, true)
    if (md) return JSON.stringify({ url, content: md.slice(0, 8000) })
  } catch {}

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JobTracker/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000)
    return JSON.stringify({ url, content: text })
  } catch (e) {
    return JSON.stringify({ error: String(e) })
  }
}

// ─── Preferences helpers ──────────────────────────────────────────────────────

interface PrefsShape {
  compensation_min?: number
  compensation_max?: number
  company_size_values?: string[]
  industry_values?: string[]
  role_values?: string[]
  skill_values?: string[]
  seniority_years?: number | null
  location?: string | null
}

function fmt(n?: number) {
  if (!n) return null
  return `$${(n / 1000).toFixed(0)}k`
}

async function fetchPrefsFromDB(): Promise<PrefsShape> {
  try {
    const db = createServerClient()
    const { data } = await db.from('preferences').select('*').limit(1).maybeSingle()
    return data ?? {}
  } catch {
    return {}
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(prefs: PrefsShape): string {
  const comp = (prefs.compensation_min || prefs.compensation_max)
    ? `${fmt(prefs.compensation_min) ?? 'any'} – ${fmt(prefs.compensation_max) ?? 'any'}`
    : null
  const roles      = prefs.role_values?.length        ? prefs.role_values.join(', ')        : null
  const skills     = prefs.skill_values?.length       ? prefs.skill_values.join(', ')       : null
  const sizes      = prefs.company_size_values?.length ? prefs.company_size_values.join(', '): null
  const industries = prefs.industry_values?.length    ? prefs.industry_values.join(', ')    : null

  const yoe        = prefs.seniority_years ?? null
  const location   = prefs.location?.trim() || null

  // Derive the seniority band so Claude can match job titles
  function seniorityBand(y: number): string {
    if (y <= 2)  return 'Junior / Entry-level (0-2 yrs)'
    if (y <= 5)  return 'Mid-level (3-5 yrs)'
    if (y <= 9)  return 'Senior (6-9 yrs)'
    if (y <= 13) return 'Staff / Lead (10-13 yrs)'
    return 'Principal / Director (14+ yrs)'
  }

  const seniorityLabel = yoe != null ? `${yoe} years — ${seniorityBand(yoe)}` : null

  // Maximum seniority band the user should see (never one level higher)
  const maxSeniorityNote = yoe != null
    ? `Do NOT show roles above "${seniorityBand(yoe)}" — e.g. if user is Mid-level, exclude Staff/Principal/Director titles.`
    : ''

  return `You are a proactive job search assistant embedded in a personal job tracker.

━━ USER ACCOUNT PREFERENCES ━━━━━━━━━━━━━━━
Roles:         ${roles             ?? '(not set)'}
Skills:        ${skills            ?? '(not set)'}
Company size:  ${sizes             ?? '(not set)'}
Industries:    ${industries        ?? '(not set)'}
Compensation:  ${comp              ?? '(not set)'}
Seniority:     ${seniorityLabel    ?? '(not set)'}
Location:      ${location          ?? '(not set)'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHEN THE USER ASKS YOU TO SEARCH FOR JOBS — follow exactly this 4-step process:

STEP 1 — Find target companies  [use find_matching_companies]
  For each combination of (industry × company_size) from the preferences,
  call find_matching_companies. It uses real Google results via Serper.
  Aim for 5–8 distinct companies total across all calls.

STEP 2 — Find career pages  [use find_career_page for each company]
  For every company from Step 1, call find_career_page(company_name).
  It probes known ATS URLs (Greenhouse, Lever, Ashby, Rippling) and the
  company's own domain — no Google scraping involved.
  If a company returns an error, skip it and move on.

STEP 3 — Scrape & filter  [use scrape_career_page for each URL found]
  Scrape each career URL. The tool automatically cascades through 4 tiers until one succeeds:
  (1) ATS native API — Greenhouse/Lever/Ashby, (2) direct fetch, (3) proxied fetch,
  (4) Serper Google search for direct job links. No action needed from you on fallbacks.
  From whatever the tool returns, keep ONLY jobs that pass ALL filters below:

    FILTER A — Role: must relate to ${roles ?? 'any'}
    FILTER B — Compensation: if listed, must be ≥ ${fmt(prefs.compensation_min) ?? '$0'}
    FILTER C — Seniority: ${yoe != null ? `user has ${yoe} years of experience (${seniorityBand(yoe)}). ${maxSeniorityNote}` : '(not set — do not filter by seniority)'}
    FILTER D — Location: ${location ? `ONLY accept roles in "${location}" or fully remote. Reject any job that is onsite in a different city.` : '(not set — do not filter by location)'}

  Discard everything else.

STEP 4 — Save results  [MUST call add_job for EVERY match — no exceptions]
  CRITICAL: You MUST call add_job as a tool for each matching job. Results go directly
  into the tracker board — do NOT list or describe jobs in your chat response.
  The tool verifies the link is live and checks for duplicates before saving.
  If add_job returns skipped:true — link is dead, skip silently.
  If add_job returns duplicate:true — already tracked, skip silently.
  Only use URLs you actually found — never guess.

OTHER CAPABILITIES:
  - fetch_job_url — parse a specific job URL the user pastes
  - update_preferences — update account settings on request

STRICT RESPONSE RULES — apply to every single message:
  1. No emojis. Ever.
  2. Never list job titles, companies, links, or descriptions in chat text.
     Job results belong in the tracker, not the conversation.
  3. While searching: one short line per company, e.g. "Stripe — checked, 2 added."
  4. Final message: one sentence only — total count added and any failures.
     Example: "Added 4 jobs to your board. Could not reach Notion or Linear."
  5. No tables, no bullet lists of results, no "Here is what I found" paragraphs.
  6. For non-search requests (preferences, URL parsing): answer in 1-2 plain sentences.`
}

// ─── SSE helper ───────────────────────────────────────────────────────────────

function sse(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

// ─── Main route ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Fail fast with a clear message if required keys are missing
  if (!process.env.ANTHROPIC_API_KEY) {
    const enc = new TextEncoder()
    const body = new ReadableStream({ start(c) {
      c.enqueue(enc.encode(sse({ type: 'done', content: 'Missing ANTHROPIC_API_KEY — add it in Vercel → Settings → Environment Variables, then redeploy.' })))
      c.enqueue(enc.encode('data: [DONE]\n\n'))
      c.close()
    }})
    return new Response(body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
  }

  const { messages } = await req.json()
  const preferences = await fetchPrefsFromDB()

  // ── Token gate (server-side, not bypassable) ──────────────────────────────
  const db = createServerClient()
  const { data: usageRow } = await db
    .from('preferences')
    .select('id, tokens_used')
    .limit(1)
    .maybeSingle<{ id: string; tokens_used: number }>()

  const tokensAlreadyUsed = usageRow?.tokens_used ?? 0

  if (tokensAlreadyUsed >= TOKEN_LIMIT) {
    const encoder = new TextEncoder()
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sse({
          type: 'done',
          content: `You have reached the 100,000 token limit for this account. No further requests can be processed.`,
        })))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    return new Response(body, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }
  // ─────────────────────────────────────────────────────────────────────────

  const encoder = new TextEncoder()
  let jobsChanged = false
  let prefsChanged = false
  let sessionTokens = 0  // tokens used in this request

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(sse(data)))
      }

      try {
        const agentMessages: Anthropic.MessageParam[] = messages.map(
          (m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })
        )

        let iterations = 0
        const MAX_ITERATIONS = 14  // 1 company search + ~6 career lookups + ~6 scrapes + add_job calls

        while (iterations < MAX_ITERATIONS) {
          iterations++
          send({ type: 'status', message: iterations === 1 ? 'Thinking…' : 'Working…' })

          const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: buildSystemPrompt(preferences),
            messages: agentMessages,
            tools,
          })

          // Accumulate real token usage reported by Anthropic
          sessionTokens += (response.usage.input_tokens ?? 0) + (response.usage.output_tokens ?? 0)

          const textBlocks   = response.content.filter((b) => b.type === 'text')
          const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use')

          for (const block of textBlocks) {
            if (block.type === 'text') send({ type: 'text', delta: block.text })
          }

          agentMessages.push({ role: 'assistant', content: response.content })

          if (response.stop_reason !== 'tool_use' || toolUseBlocks.length === 0) {
            const finalText = textBlocks.map((b) => (b.type === 'text' ? b.text : '')).join('')
            send({ type: 'done', content: finalText })
            break
          }

          const toolResults: Anthropic.ToolResultBlockParam[] = []

          for (const block of toolUseBlocks) {
            if (block.type !== 'tool_use') continue
            const input = block.input as Record<string, unknown>
            let result = ''

            switch (block.name) {
              case 'find_matching_companies':
                send({ type: 'status', message: `Searching for ${input.company_size} ${input.industry} companies…` })
                result = await findMatchingCompanies(
                  String(input.industry),
                  String(input.company_size),
                  Number(input.count ?? 6)
                )
                break

              case 'find_career_page':
                send({ type: 'status', message: `Looking up career page for ${input.company_name}…` })
                result = await findCareerPage(String(input.company_name))
                break

              case 'scrape_career_page':
                send({ type: 'status', message: `Scanning ${input.company} jobs…` })
                result = await scrapeCareerPage(String(input.url), String(input.company))
                break

              case 'add_job':
                send({ type: 'status', message: `Adding ${input.title} at ${input.company}…` })
                result = await addJob(input)
                jobsChanged = true
                break

              case 'fetch_job_url':
                send({ type: 'status', message: 'Parsing job URL…' })
                result = await fetchJobUrl(String(input.url))
                break

              case 'update_preferences':
                send({ type: 'status', message: 'Updating preferences…' })
                result = await updatePreferences(input)
                prefsChanged = true
                break

              default:
                result = JSON.stringify({ error: `Unknown tool: ${block.name}` })
            }

            // Cap stored tool results to keep message history small and avoid token rate limits.
            // Claude only needs enough to make the next decision — not the full payload.
            const MAX_RESULT_CHARS = 2500
            const stored = result.length > MAX_RESULT_CHARS
              ? result.slice(0, MAX_RESULT_CHARS) + '…[truncated for context window]'
              : result
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: stored })
          }

          agentMessages.push({ role: 'user', content: toolResults })

          if (jobsChanged) { send({ type: 'action', action: 'jobs_changed' }); jobsChanged = false }
          if (prefsChanged) { send({ type: 'action', action: 'preferences_changed' }); prefsChanged = false }
        }
      } catch (err) {
        send({ type: 'done', content: `Error: ${String(err)}` })
      } finally {
        // Persist token usage — always runs, even on error
        if (sessionTokens > 0 && usageRow?.id) {
          await db
            .from('preferences')
            .update({ tokens_used: tokensAlreadyUsed + sessionTokens })
            .eq('id', usageRow.id)
        }
        if (jobsChanged) controller.enqueue(encoder.encode(sse({ type: 'action', action: 'jobs_changed' })))
        if (prefsChanged) controller.enqueue(encoder.encode(sse({ type: 'action', action: 'preferences_changed' })))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
