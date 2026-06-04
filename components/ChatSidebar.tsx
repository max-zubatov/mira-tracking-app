'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChatMessage, Preferences } from '@/lib/types'

interface ChatSidebarProps {
  preferences: Preferences | null
  onJobsChanged: () => void
  onPreferencesChanged: () => void
}

function formatMessage(text: string): string {
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline break-all">$1</a>')
    .replace(/(?<!href="|src=")(https?:\/\/[^\s&<"']+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline break-all">$1</a>')
    .replace(/\n/g, '<br/>')
  return html
}

const SUGGESTIONS = [
  'Find senior React roles at SaaS startups',
  'Search for remote TypeScript jobs paying $150k+',
  'Look for tech lead roles in FinTech',
]

export default function ChatSidebar({ preferences, onJobsChanged, onPreferencesChanged }: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, statusMsg])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)
    setStatusMsg('Thinking...')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, preferences }),
      })
      if (!res.ok || !res.body) throw new Error('Failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const evt = JSON.parse(data)
            if (evt.type === 'status') setStatusMsg(evt.message)
            else if (evt.type === 'text') {
              assistantContent += evt.delta
              setMessages([...newMessages, { role: 'assistant', content: assistantContent }])
            } else if (evt.type === 'action') {
              if (evt.action === 'jobs_changed') onJobsChanged()
              if (evt.action === 'preferences_changed') onPreferencesChanged()
            } else if (evt.type === 'done') {
              assistantContent = evt.content
              setMessages([...newMessages, { role: 'assistant', content: assistantContent }])
            }
          } catch {}
        }
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Something went wrong. Check your API keys.' }])
    } finally { setLoading(false); setStatusMsg('') }
  }, [input, loading, messages, preferences, onJobsChanged, onPreferencesChanged])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col w-[45vw] shrink-0" style={{ background: 'var(--ink-2)', borderRight: '1px solid var(--line)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 h-14 shrink-0"
        style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2.5">
          {/* Mira spark icon */}
          <div className="w-7 h-7 rounded-[22%] flex items-center justify-center shrink-0"
            style={{
              background: 'radial-gradient(120% 120% at 28% 18%, #7A6CFF 0%, #5847E6 42%, #4536C2 100%)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset',
            }}>
            <svg viewBox="0 0 96 96" className="w-4 h-4">
              <path d="M24,75 L24,29 L48,57 L72,29 L72,75" fill="none"
                stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M48,8 L52,19 L63,23 L52,27 L48,38 L44,27 L33,23 L44,19 Z" fill="#DBD2FF"/>
            </svg>
          </div>
          <div>
            <span style={{ color: 'var(--paper)', fontFamily: 'var(--serif)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1, fontSize: '22px', display: 'block' }}>Mira</span>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} title="New chat"
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--grey)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--paper)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--grey)')}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center py-8">
            {/* Hero mark */}
            <div className="w-14 h-14 rounded-[22%] flex items-center justify-center"
              style={{
                background: 'radial-gradient(120% 120% at 28% 18%, #7A6CFF 0%, #5847E6 42%, #4536C2 100%)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.22) inset, 0 12px 36px -12px rgba(67,54,194,0.8)',
              }}>
              <svg viewBox="0 0 96 96" className="w-8 h-8">
                <path d="M24,75 L24,29 L48,57 L72,29 L72,75" fill="none"
                  stroke="white" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M48,8 L52,19 L63,23 L52,27 L48,38 L44,27 L33,23 L44,19 Z" fill="#DBD2FF"/>
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-normal" style={{ color: 'var(--paper)', fontFamily: 'var(--serif)', letterSpacing: '-0.01em', margin: '0 0 6px' }}>
                What are you looking for?
              </p>
              <p className="text-[12px]" style={{ color: 'var(--grey)', margin: 0 }}>
                Describe the role and Mira will find it.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-[12px] px-4 py-3 rounded-xl transition-all"
                  style={{
                    color: 'var(--grey-2)', background: 'var(--ink)',
                    border: '1px solid var(--line-2)', fontFamily: 'var(--sans)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--paper)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--line-2)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--panel)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--grey-2)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--ink)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          return (
            <div key={i} className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-1"
                style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>
                {isUser ? 'You' : 'Mira'}
              </span>
              <div
                className="max-w-[90%] text-[13px] leading-relaxed chat-prose rounded-2xl px-4 py-3"
                style={isUser ? {
                  background: 'var(--indigo)',
                  color: 'var(--paper)',
                  borderBottomRightRadius: '4px',
                } : {
                  background: 'var(--ink)',
                  color: 'var(--grey-2)',
                  border: '1px solid var(--line-2)',
                  borderBottomLeftRadius: '4px',
                }}
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
            </div>
          )
        })}

        {loading && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex gap-1">
              {[0, 150, 300].map(d => (
                <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: 'var(--lilac)', animationDelay: `${d}ms` }} />
              ))}
            </div>
            <span className="text-[11px]" style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>{statusMsg}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 shrink-0">
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 transition-all min-h-[44px]"
          style={{ background: 'var(--ink)', border: '1px solid var(--line-2)' }}>
          <textarea ref={textareaRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1} disabled={loading}
            placeholder="Ask Mira to find jobs, parse a URL, update preferences..."
            className="flex-1 bg-transparent resize-none outline-none leading-relaxed self-center text-[13px]"
            style={{
              color: 'var(--paper)',
              fontFamily: 'var(--sans)',
              height: '20px',
              maxHeight: '120px',
            }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="w-7 h-7 flex items-center justify-center rounded-xl transition-all shrink-0"
            style={{
              background: input.trim() && !loading ? 'var(--indigo)' : 'var(--panel)',
              opacity: !input.trim() || loading ? 0.5 : 1,
            }}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'white' }}>
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-center mt-1.5" style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>
          Shift + Enter for new line
        </p>
      </div>
    </div>
  )
}
