export type JobStatus = 'tracking' | 'applied' | 'interview' | 'offer' | 'rejected' | 'archived'
export type FitScore = 1 | 2 | 3 | 4 | 5

export interface Job {
  id: string
  title: string
  company: string
  logo_url?: string | null
  overview?: string | null
  compensation?: string | null
  link?: string | null
  status: JobStatus
  source: 'manual' | 'ai'
  fit_score?: FitScore | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface Preferences {
  id: string
  compensation_min: number
  compensation_max: number
  compensation_fit: FitScore
  company_size_values: string[]
  company_size_fit: FitScore
  industry_values: string[]
  industry_fit: FitScore
  role_values: string[]
  role_fit: FitScore
  skill_values: string[]
  skills_fit: FitScore
  seniority_years?: number | null
  location?: string | null
  updated_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const FIT_LABELS: Record<number, string> = {
  1: 'Not a Fit',
  2: 'Poor Fit',
  3: 'Neutral',
  4: 'Good Fit',
  5: 'Excellent Fit',
}

export const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  tracking:  { label: 'Tracking',  color: 'text-blue-700',   bg: 'bg-blue-100'   },
  applied:   { label: 'Applied',   color: 'text-amber-700',  bg: 'bg-amber-100'  },
  interview: { label: 'Interview', color: 'text-emerald-700',bg: 'bg-emerald-100' },
  offer:     { label: 'Offer',     color: 'text-purple-700', bg: 'bg-purple-100' },
  rejected:  { label: 'Rejected',  color: 'text-red-600',    bg: 'bg-red-100'    },
  archived:  { label: 'Archived',  color: 'text-gray-500',   bg: 'bg-gray-100'   },
}
