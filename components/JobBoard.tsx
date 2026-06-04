'use client'

import { useState } from 'react'
import { Job, JobStatus, STATUS_CONFIG } from '@/lib/types'
import JobCard from './JobCard'
import AddJobModal from './AddJobModal'
import StatusIcon from './StatusIcon'

const COLUMNS: JobStatus[] = ['tracking', 'applied', 'interview', 'offer', 'rejected']

interface JobBoardProps {
  jobs: Job[]
  loading: boolean
  onJobsChanged: () => void
}

export default function JobBoard({ jobs, loading, onJobsChanged }: JobBoardProps) {
  const [showAdd, setShowAdd] = useState(false)

  async function handleStatusChange(id: string, status: JobStatus) {
    await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    onJobsChanged()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
    onJobsChanged()
  }

  const byStatus = (s: JobStatus) => jobs.filter((j) => j.status === s)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--line-2)', borderTopColor: 'var(--lilac)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#FCFCF8' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-end px-6 h-12 shrink-0"
        style={{ background: '#FCFCF8', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-1.5 rounded-xl transition-all"
          style={{ background: 'var(--indigo)', color: 'var(--paper)', fontFamily: 'var(--mono)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--indigo-600)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--indigo)')}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add job
        </button>
      </div>

      {/* Kanban — horizontal scroll when narrow */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-max" style={{ gap: '1px', background: 'rgba(0,0,0,0.07)' }}>
          {COLUMNS.map((status) => {
            const colJobs = byStatus(status)
            return (
              <div key={status} className="flex flex-col w-[260px] shrink-0"
                style={{ background: '#FCFCF8' }}>
                {/* Column header */}
                <div className="flex items-center gap-2 px-4 py-3"
                  style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#FCFCF8' }}>
                  <StatusIcon status={status} size={12} />
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>
                    {STATUS_CONFIG[status].label}
                  </span>
                  <span className="ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center"
                    style={{ color: 'var(--grey)', background: 'rgba(0,0,0,0.06)', fontFamily: 'var(--mono)' }}>
                    {colJobs.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                  {colJobs.length === 0 ? (
                    <div className="flex items-center justify-center h-20 rounded-2xl"
                      style={{ border: '1px dashed var(--line-2)' }}>
                      <span className="text-[11px] font-medium" style={{ color: 'rgba(0,0,0,0.2)', fontFamily: 'var(--mono)' }}>
                        Empty
                      </span>
                    </div>
                  ) : (
                    colJobs.map((job) => (
                      <JobCard key={job.id} job={job}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showAdd && (
        <AddJobModal onClose={() => setShowAdd(false)} onAdded={onJobsChanged} />
      )}
    </div>
  )
}
