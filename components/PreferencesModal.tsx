'use client'

import { useState, useEffect } from 'react'
import { Preferences } from '@/lib/types'
import { getSupabase } from '@/lib/supabase'

async function loadPreferences(): Promise<Partial<Preferences>> {
  const db = getSupabase()
  const { data, error } = await db
    .from('preferences')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error) console.error('load prefs:', error.message)
  return data ?? {}
}

function TagInput({ values, onChange, placeholder }: {
  values: string[]; onChange: (v: string[]) => void; placeholder: string
}) {
  const [input, setInput] = useState('')
  function add() {
    const v = input.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }
  return (
    <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl min-h-[42px] transition-all"
      style={{ background: 'var(--ink)', border: '1px solid var(--line-2)' }}>
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-[0.08em]"
          style={{ background: 'var(--panel)', color: 'var(--lilac)', border: '1px solid var(--line-2)', fontFamily: 'var(--mono)' }}>
          {v}
          <button onClick={() => onChange(values.filter(x => x !== v))}
            className="ml-0.5 leading-none transition-colors"
            style={{ color: 'var(--grey)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--lilac)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--grey)')}>
            ×
          </button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ',') && (e.preventDefault(), add())}
        onBlur={add}
        placeholder={values.length === 0 ? placeholder : ''}
        className="flex-1 min-w-20 text-[13px] outline-none bg-transparent"
        style={{ color: 'var(--paper)', fontFamily: 'var(--sans)' }}
      />
    </div>
  )
}

interface PreferencesModalProps { onClose: () => void; onSaved: () => void }

export default function PreferencesModal({ onClose, onSaved }: PreferencesModalProps) {
  const [form, setForm] = useState<Partial<Preferences>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  useEffect(() => {
    loadPreferences().then(data => { setForm(data); setLoading(false) })
  }, [])

  function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setForm(p => ({ ...p, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    setSaveOk(false)
    try {
      const db = getSupabase()

      // Get the existing row id
      const { data: existing, error: fetchErr } = await db
        .from('preferences')
        .select('id')
        .limit(1)
        .maybeSingle<{ id: string }>()

      if (fetchErr) throw new Error(fetchErr.message)

      const fields = {
        compensation_min:    form.compensation_min,
        compensation_max:    form.compensation_max,
        compensation_fit:    form.compensation_fit,
        company_size_values: form.company_size_values,
        company_size_fit:    form.company_size_fit,
        industry_values:     form.industry_values,
        industry_fit:        form.industry_fit,
        role_values:         form.role_values,
        role_fit:            form.role_fit,
        skill_values:        form.skill_values,
        skills_fit:          form.skills_fit,
        seniority_years:     form.seniority_years ?? null,
        location:            form.location ?? null,
      }

      let error
      if (existing?.id) {
        ;({ error } = await db.from('preferences').update(fields).eq('id', existing.id))
      } else {
        ;({ error } = await db.from('preferences').insert({ ...fields,
          compensation_fit: fields.compensation_fit ?? 3,
          company_size_fit: fields.company_size_fit ?? 3,
          industry_fit:     fields.industry_fit     ?? 3,
          role_fit:         fields.role_fit         ?? 3,
          skills_fit:       fields.skills_fit       ?? 3,
        }))
      }

      if (error) throw new Error(error.message)

      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2000)
      onSaved()
    } catch (e) {
      setSaveError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    background: 'var(--ink)', border: '1px solid var(--line-2)',
    color: 'var(--paper)', fontFamily: 'var(--sans)',
  }

  const sections = [
    {
      key: 'compensation', label: 'Compensation', description: 'Annual salary (USD)',
      content: (
        <div className="flex items-center gap-3">
          {[
            ['compensation_min', 'Min', form.compensation_min],
            ['compensation_max', 'Max', form.compensation_max],
          ].map(([k, ph, val], i) => (
            <div key={k as string} className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px]"
                style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>$</span>
              <input type="number" value={(val as number) ?? ''} placeholder={ph as string}
                onChange={e => set(k as keyof Preferences, Number(e.target.value) as never)}
                className="w-full rounded-xl pl-7 pr-3 py-2.5 text-[13px] outline-none"
                style={inputStyle} />
              {i === 0 && <span className="absolute -right-5 top-1/2 -translate-y-1/2 text-[13px]"
                style={{ color: 'var(--grey)' }}>—</span>}
            </div>
          ))}
        </div>
      ),
    },
    { key: 'company_size', label: 'Company size', description: 'Enter to add',
      content: <TagInput values={form.company_size_values ?? []} onChange={v => set('company_size_values', v)} placeholder="startup, mid-size, enterprise…" /> },
    { key: 'industry', label: 'Industry', description: 'Industries you want',
      content: <TagInput values={form.industry_values ?? []} onChange={v => set('industry_values', v)} placeholder="SaaS, FinTech, Healthcare…" /> },
    { key: 'role', label: 'Role', description: 'Target titles',
      content: <TagInput values={form.role_values ?? []} onChange={v => set('role_values', v)} placeholder="Software Engineer, Tech Lead…" /> },
    { key: 'skills', label: 'Skills', description: 'Technologies to use',
      content: <TagInput values={form.skill_values ?? []} onChange={v => set('skill_values', v)} placeholder="React, TypeScript, Postgres…" /> },
    {
      key: 'seniority', label: 'Seniority', description: 'Years of experience',
      content: (
        <div className="flex items-center gap-3">
          <input type="number" min={0} max={40} value={form.seniority_years ?? ''}
            onChange={e => set('seniority_years', e.target.value === '' ? null : Number(e.target.value))}
            placeholder="e.g. 5"
            className="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] outline-none"
            style={inputStyle} />
          {(form.seniority_years ?? 0) > 0 && (
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap"
              style={{ color: 'var(--lilac)', fontFamily: 'var(--mono)' }}>
              {(form.seniority_years ?? 0) <= 2 ? 'Junior' :
               (form.seniority_years ?? 0) <= 5 ? 'Mid-level' :
               (form.seniority_years ?? 0) <= 9 ? 'Senior' :
               (form.seniority_years ?? 0) <= 13 ? 'Staff / Lead' : 'Principal'}
            </span>
          )}
        </div>
      ),
    },
    { key: 'location', label: 'Location', description: 'City or Remote',
      content: (
        <input type="text" value={form.location ?? ''}
          onChange={e => set('location', e.target.value || null)}
          placeholder="San Francisco, New York, Remote…"
          className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none"
          style={inputStyle} />
      ),
    },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(16,14,28,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] z-50 flex flex-col shadow-2xl"
        style={{ background: 'var(--deep)', borderLeft: '1px solid var(--line-2)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--line)' }}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: 'var(--lilac)', fontFamily: 'var(--mono)', margin: 0 }}>My Account</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--grey-2)', margin: 0 }}>
              Used by Mira when searching for positions
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--grey)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--paper)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--grey)')}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--line-2)', borderTopColor: 'var(--lilac)' }} />
            </div>
          ) : sections.map(s => (
            <div key={s.key} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--lilac)', fontFamily: 'var(--mono)' }}>{s.label}</span>
                <span className="text-[11px]" style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>{s.description}</span>
              </div>
              {s.content}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--line)' }}>
          {saveError && (
            <p className="text-[11px] text-center px-2 py-1.5 rounded-lg"
              style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', fontFamily: 'var(--mono)' }}>
              {saveError}
            </p>
          )}
          <button onClick={handleSave} disabled={saving}
            className="w-full text-[12px] font-bold py-2.5 rounded-xl transition-all uppercase tracking-[0.1em] flex items-center justify-center gap-2"
            style={{
              background: saveOk ? '#16a34a' : 'var(--indigo)',
              color: 'var(--paper)', fontFamily: 'var(--mono)', opacity: saving ? 0.5 : 1,
            }}>
            {saving
              ? <><div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />Saving</>
              : saveOk ? '✓ Saved' : 'Save preferences'}
          </button>
        </div>
      </div>
    </>
  )
}
