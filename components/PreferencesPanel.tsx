'use client'

import { useState, useEffect } from 'react'
import { Preferences, FitScore } from '@/lib/types'
import FitScale from './FitScale'

interface PreferencesPanelProps {
  preferences: Preferences | null
  loading: boolean
  onSaved: () => void
}

function TagInput({ values, onChange, placeholder }: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [input, setInput] = useState('')

  function add() {
    const v = input.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }

  return (
    <div className="flex flex-wrap gap-2 p-2.5 border border-slate-300 rounded-lg bg-white min-h-[42px] focus-within:ring-2 focus-within:ring-indigo-500">
      {values.map((v) => (
        <span key={v} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2 py-0.5 rounded-full font-medium">
          {v}
          <button onClick={() => onChange(values.filter((x) => x !== v))} className="text-indigo-400 hover:text-indigo-700 ml-0.5">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), add())}
        onBlur={add}
        placeholder={values.length === 0 ? placeholder : ''}
        className="flex-1 min-w-24 text-sm outline-none bg-transparent"
      />
    </div>
  )
}

export default function PreferencesPanel({ preferences, loading, onSaved }: PreferencesPanelProps) {
  const [form, setForm] = useState<Partial<Preferences>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (preferences) setForm(preferences)
  }, [preferences])

  function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onSaved()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400">Loading…</div>
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Account Preferences</h2>
          <p className="text-sm text-slate-500 mt-1">Define what makes an ideal job. The AI uses these when searching for positions.</p>
        </div>

        {/* Compensation */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-slate-800">Compensation Range</h3>
              <p className="text-xs text-slate-500 mt-0.5">Annual salary in USD</p>
            </div>
            <FitScale
              value={(form.compensation_fit ?? 3) as FitScore}
              onChange={(v) => set('compensation_fit', v)}
            />
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 block mb-1">Minimum</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  value={form.compensation_min ?? 0}
                  onChange={(e) => set('compensation_min', Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="text-slate-400 mt-5">—</div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 block mb-1">Maximum</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  value={form.compensation_max ?? 0}
                  onChange={(e) => set('compensation_max', Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Company Size */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-slate-800">Company Size</h3>
              <p className="text-xs text-slate-500 mt-0.5">Press Enter or comma to add options</p>
            </div>
            <FitScale
              value={(form.company_size_fit ?? 3) as FitScore}
              onChange={(v) => set('company_size_fit', v)}
            />
          </div>
          <div className="mt-4">
            <TagInput
              values={form.company_size_values ?? []}
              onChange={(v) => set('company_size_values', v)}
              placeholder="startup, mid-size, enterprise…"
            />
          </div>
        </section>

        {/* Industry */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-slate-800">Industry</h3>
              <p className="text-xs text-slate-500 mt-0.5">Industries you want to work in</p>
            </div>
            <FitScale
              value={(form.industry_fit ?? 3) as FitScore}
              onChange={(v) => set('industry_fit', v)}
            />
          </div>
          <div className="mt-4">
            <TagInput
              values={form.industry_values ?? []}
              onChange={(v) => set('industry_values', v)}
              placeholder="SaaS, FinTech, Healthcare…"
            />
          </div>
        </section>

        {/* Role */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-slate-800">Role / Title</h3>
              <p className="text-xs text-slate-500 mt-0.5">Roles you are targeting</p>
            </div>
            <FitScale
              value={(form.role_fit ?? 3) as FitScore}
              onChange={(v) => set('role_fit', v)}
            />
          </div>
          <div className="mt-4">
            <TagInput
              values={form.role_values ?? []}
              onChange={(v) => set('role_values', v)}
              placeholder="Software Engineer, Tech Lead…"
            />
          </div>
        </section>

        {/* Skills */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-slate-800">Skills</h3>
              <p className="text-xs text-slate-500 mt-0.5">Technologies and skills you want to use</p>
            </div>
            <FitScale
              value={(form.skills_fit ?? 3) as FitScore}
              onChange={(v) => set('skills_fit', v)}
            />
          </div>
          <div className="mt-4">
            <TagInput
              values={form.skill_values ?? []}
              onChange={(v) => set('skill_values', v)}
              placeholder="React, TypeScript, Postgres…"
            />
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end pb-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            } disabled:opacity-60 flex items-center gap-2`}
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </>
            ) : saved ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </>
            ) : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}
