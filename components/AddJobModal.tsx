'use client'

import { useState, useRef, useEffect } from 'react'

interface AddJobModalProps {
  onClose: () => void
  onAdded: () => void
}

export default function AddJobModal({ onClose, onAdded }: AddJobModalProps) {
  const [mode, setMode] = useState<'url' | 'manual'>('url')
  const [url, setUrl] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [overview, setOverview] = useState('')
  const [compensation, setCompensation] = useState('')
  const [link, setLink] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 60) }, [])

  async function handleParseUrl() {
    if (!url.trim()) return
    setParsing(true); setParseError('')
    try {
      const res = await fetch('/api/jobs/parse', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTitle(data.title || ''); setCompany(data.company || '')
      setOverview(data.overview || ''); setCompensation(data.compensation || '')
      setLink(url.trim()); setMode('manual')
    } catch {
      setParseError('Could not parse this URL — fill in details manually.')
      setLink(url.trim()); setMode('manual')
    } finally { setParsing(false) }
  }

  async function handleSave() {
    if (!title.trim() || !company.trim()) return
    setSaving(true)
    await fetch('/api/jobs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, company, overview, compensation, link, source: 'manual' }),
    })
    setSaving(false); onAdded(); onClose()
  }

  const inputCls = "w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-all"
  const inputStyle = {
    background: 'var(--ink)',
    border: '1px solid var(--line-2)',
    color: 'var(--paper)',
    fontFamily: 'var(--sans)',
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(16,14,28,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />
      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--deep)', border: '1px solid var(--line-2)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--line)' }}>
          <span className="text-[13px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--lilac)', fontFamily: 'var(--mono)' }}>Add job</span>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--grey)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--paper)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--grey)')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mx-5 mt-4 p-1 rounded-xl"
          style={{ background: 'var(--panel)' }}>
          {(['url', 'manual'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className="flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all uppercase tracking-[0.12em] capitalize"
              style={{
                fontFamily: 'var(--mono)',
                background: mode === m ? 'var(--ink-2)' : 'transparent',
                color: mode === m ? 'var(--paper)' : 'var(--grey)',
              }}>
              {m === 'url' ? 'Paste URL' : 'Manual'}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          {mode === 'url' ? (
            <>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.18em] block mb-1.5"
                  style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>Job listing URL</label>
                <input ref={inputRef} value={url} onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleParseUrl()}
                  placeholder="https://boards.greenhouse.io/..."
                  className={inputCls} style={inputStyle} />
                {parseError && <p className="text-[12px] mt-1.5" style={{ color: '#f87171' }}>{parseError}</p>}
              </div>
              <button onClick={handleParseUrl} disabled={!url.trim() || parsing}
                className="w-full text-[12px] font-bold py-2.5 rounded-xl transition-all uppercase tracking-[0.1em] flex items-center justify-center gap-2 mt-1"
                style={{ background: 'var(--indigo)', color: 'var(--paper)', fontFamily: 'var(--mono)', opacity: (!url.trim() || parsing) ? 0.4 : 1 }}>
                {parsing ? <><div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />Parsing</> : 'Parse & continue'}
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[['Title *', title, setTitle, 'Senior Engineer'], ['Company *', company, setCompany, 'Acme Corp']].map(([label, val, setter, ph]) => (
                  <div key={label as string}>
                    <label className="text-[10px] font-bold uppercase tracking-[0.18em] block mb-1.5"
                      style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>{label as string}</label>
                    <input value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)}
                      placeholder={ph as string} className={inputCls} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.18em] block mb-1.5"
                  style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>Compensation</label>
                <input value={compensation} onChange={e => setCompensation(e.target.value)}
                  placeholder="$150k – $180k" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.18em] block mb-1.5"
                  style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>Overview</label>
                <textarea value={overview} onChange={e => setOverview(e.target.value)}
                  rows={3} placeholder="Brief description of the role..."
                  className={`${inputCls} resize-none`} style={inputStyle} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.18em] block mb-1.5"
                  style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>Link</label>
                <input value={link} onChange={e => setLink(e.target.value)}
                  placeholder="https://..." className={inputCls} style={inputStyle} />
              </div>
              <button onClick={handleSave} disabled={!title.trim() || !company.trim() || saving}
                className="w-full text-[12px] font-bold py-2.5 rounded-xl transition-all uppercase tracking-[0.1em] flex items-center justify-center gap-2 mt-1"
                style={{ background: 'var(--indigo)', color: 'var(--paper)', fontFamily: 'var(--mono)', opacity: (!title.trim() || !company.trim() || saving) ? 0.4 : 1 }}>
                {saving ? <><div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />Saving</> : 'Add job'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
