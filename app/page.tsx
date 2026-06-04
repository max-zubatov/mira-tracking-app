'use client'

import { useEffect, useState, useCallback } from 'react'
import ChatSidebar from '@/components/ChatSidebar'
import JobBoard from '@/components/JobBoard'
import PreferencesModal from '@/components/PreferencesModal'
import { Job, Preferences } from '@/lib/types'

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [showPrefs, setShowPrefs] = useState(false)

  const fetchJobs = useCallback(async () => {
    const res = await fetch('/api/jobs')
    if (res.ok) setJobs(await res.json())
    setLoadingJobs(false)
  }, [])

  const fetchPreferences = useCallback(async () => {
    const res = await fetch('/api/preferences')
    if (res.ok) setPreferences(await res.json())
  }, [])

  useEffect(() => {
    fetchJobs()
    fetchPreferences()
  }, [fetchJobs, fetchPreferences])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#FCFCF8' }}>
      <ChatSidebar
        preferences={preferences}
        onJobsChanged={fetchJobs}
        onPreferencesChanged={fetchPreferences}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 h-14 border-b shrink-0"
          style={{ background: '#FCFCF8', borderColor: 'rgba(0,0,0,0.08)' }}>

          <span style={{ color: 'var(--ink)', fontFamily: 'var(--serif)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1, fontSize: '22px' }}>
            Arc
          </span>

          {/* My Account button */}
          <button
            onClick={() => setShowPrefs(true)}
            className="flex items-center gap-2 text-[12px] font-medium transition-colors px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--grey)', fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--grey)')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            My Account
          </button>
        </header>

        <main className="flex-1 overflow-hidden">
          <JobBoard jobs={jobs} loading={loadingJobs} onJobsChanged={fetchJobs} />
        </main>
      </div>

      {showPrefs && (
        <PreferencesModal
          onClose={() => setShowPrefs(false)}
          onSaved={() => { fetchPreferences(); setShowPrefs(false) }}
        />
      )}
    </div>
  )
}
