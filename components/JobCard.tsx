'use client'

import { useState } from 'react'
import { Job, JobStatus, STATUS_CONFIG } from '@/lib/types'
import StatusIcon from './StatusIcon'

const STATUSES: JobStatus[] = ['tracking', 'applied', 'interview', 'offer', 'rejected', 'archived']

interface JobCardProps {
  job: Job
  onStatusChange: (id: string, status: JobStatus) => void
  onDelete: (id: string) => void
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') } catch { return '' }
}

export default function JobCard({ job, onStatusChange, onDelete }: JobCardProps) {
  const [imgError, setImgError] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const domain = job.link ? getDomain(job.link) : null
  const logoSrc = job.logo_url || (domain ? `https://logo.clearbit.com/${domain}` : null)

  return (
    <div className="group rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.14)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
    >
      {/* Top: logo + title + AI badge */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
          style={{ background: '#f4f4f8', border: '1px solid rgba(0,0,0,0.07)' }}>
          {logoSrc && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className="w-7 h-7 object-contain"
              onError={() => setImgError(true)} />
          ) : (
            <span className="text-[11px] font-bold uppercase" style={{ color: 'rgba(0,0,0,0.3)', fontFamily: 'var(--mono)' }}>
              {job.company.slice(0, 2)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: 'var(--ink)' }}>
            {job.title}
          </p>
          <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--grey)' }}>{job.company}</p>
        </div>

        {job.source === 'ai' && (
          <span className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md shrink-0"
            style={{ color: 'var(--ink)', background: 'var(--lilac)', fontFamily: 'var(--mono)' }}>
            AI
          </span>
        )}
      </div>

      {/* Overview */}
      {job.overview && (
        <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: 'rgba(0,0,0,0.45)' }}>
          {job.overview}
        </p>
      )}

      {/* Compensation */}
      {job.compensation && (
        <p className="text-[12px] font-medium" style={{ color: 'var(--lilac)', fontFamily: 'var(--mono)' }}>
          {job.compensation}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        {/* Status picker */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-1.5 text-[12px] font-medium transition-colors py-0.5"
            style={{ color: 'rgba(0,0,0,0.5)', fontFamily: 'var(--mono)' }}
          >
            <StatusIcon status={job.status} size={11} />
            {STATUS_CONFIG[job.status].label}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--grey)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute left-0 top-full mt-1.5 z-20 rounded-xl shadow-2xl py-1 min-w-[160px] overflow-hidden"
                style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                {STATUSES.map((s) => (
                  <button key={s}
                    onClick={() => { onStatusChange(job.id, s); setShowMenu(false) }}
                    className="w-full text-left px-3 py-2 text-[12px] font-medium flex items-center gap-2 transition-colors"
                    style={{
                      color: s === job.status ? 'var(--ink)' : 'rgba(0,0,0,0.5)',
                      fontFamily: 'var(--mono)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <StatusIcon status={s} size={11} />
                    {STATUS_CONFIG[s].label}
                    {s === job.status && (
                      <svg className="w-3 h-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--lilac)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {job.link && (
            <a href={job.link} target="_blank" rel="noopener noreferrer"
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--grey)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--lilac)'; (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(195,188,255,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--grey)'; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
            </a>
          )}
          <button
            onClick={() => onDelete(job.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--grey)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--grey)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
