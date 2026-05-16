import { useRef, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Message, AgentState } from '../types'
import { dark, light } from '../theme'
import { ACCENTS, EMOJIS } from '../store'

interface Props {
  messages: Message[]; streamingText: string
  agentState: AgentState; accent: string; isDark: boolean
}

function fmt(ts: number) {
  const d = new Date(ts)
  const h = d.getHours() % 12 || 12
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
}


function TypingIndicator({ isDark }: { isDark: boolean }) {
  const theme = isDark ? dark : light
  const [showReasoning, setShowReasoning] = useState(false)

  useEffect(() => {
    setShowReasoning(false)
    const t = setTimeout(() => setShowReasoning(true), 8000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
      <div style={{
        display: 'flex', gap: 5, alignItems: 'center',
        background: theme.surface, borderRadius: 18, borderBottomLeftRadius: 6,
        padding: '12px 14px',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: 4, background: theme.textDim,
            animation: `dot-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>
      <div style={{
        textAlign: 'center', fontSize: 11, color: theme.textFaint, marginTop: 6,
        opacity: showReasoning ? 1 : 0, transition: 'opacity 300ms',
      }}>
        Reasoning…
      </div>
    </div>
  )
}

type Group = { role: 'user' | 'assistant'; msgs: Message[]; persona?: string }

export default function MessageList({ messages, streamingText, agentState, accent, isDark }: Props) {
  const theme = isDark ? dark : light
  const endRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isNearBottom = useRef(true)

  const showTyping = agentState === 'thinking' && !streamingText

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  useEffect(() => {
    if (isNearBottom.current) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingText, showTyping])

  const groups = useMemo<Group[]>(() => {
    const result: Group[] = []
    for (const msg of messages) {
      const last = result[result.length - 1]
      if (last && last.role === msg.role && last.persona === (msg.persona ?? undefined)) {
        last.msgs.push(msg)
      } else {
        result.push({ role: msg.role, msgs: [msg], persona: msg.persona })
      }
    }
    return result
  }, [messages])

  const mdComponents = useMemo(() => ({
    code({ className, children, ...props }: any) {
      const isBlock = className?.startsWith('language-')
      return isBlock
        ? <pre style={{ background: 'rgba(0,0,0,0.12)', borderRadius: 6, padding: '8px 10px', overflowX: 'auto', margin: '4px 0' }}><code style={{ fontFamily: 'monospace', fontSize: 13 }}>{children}</code></pre>
        : <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.15)', borderRadius: 3, padding: '1px 4px', fontSize: 13 }} {...props}>{children}</code>
    },
    p({ children }: any) { return <p style={{ margin: '0 0 4px' }}>{children}</p> },
    ul({ children }: any) { return <ul style={{ margin: '2px 0', paddingLeft: 20 }}>{children}</ul> },
    ol({ children }: any) { return <ol style={{ margin: '2px 0', paddingLeft: 20 }}>{children}</ol> },
    li({ children }: any) { return <li style={{ margin: '1px 0' }}>{children}</li> },
  }), [])

  return (
    <>
      <style>{`
        @keyframes dot-bounce {
          0%, 60%, 100% { transform: scale(0.4); }
          30% { transform: scale(1); }
        }
        @keyframes breathe { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ height: '100%', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column' }}
      >
        {groups.map((group, gi) => {
          const isUser = group.role === 'user'
          const lastTs = group.msgs[group.msgs.length - 1].timestamp
          const accentColor = !isUser && group.persona ? (ACCENTS[group.persona] ?? 'transparent') : 'transparent'

          return (
            <div key={gi}>
              {!isUser && group.persona && (
                <div style={{ color: ACCENTS[group.persona] ?? theme.textDim, fontSize: 12, fontWeight: 700, marginBottom: 3, marginLeft: 2 }}>
                  {EMOJIS[group.persona]} {group.persona.charAt(0).toUpperCase() + group.persona.slice(1)}
                </div>
              )}
              {group.msgs.map((msg, mi) => {
                const isLast = mi === group.msgs.length - 1
                const borderBottomRight = isUser ? (isLast ? 4 : 18) : 18
                const borderBottomLeft = isUser ? 18 : (isLast ? 4 : 18)
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 2 }}>
                    <div style={{
                      maxWidth: '80%', padding: '10px 14px',
                      borderRadius: 18,
                      borderBottomRightRadius: borderBottomRight,
                      borderBottomLeftRadius: borderBottomLeft,
                      background: isUser ? accent : theme.surface,
                      color: isUser ? '#fff' : theme.text,
                      fontSize: 15, lineHeight: 1.5,
                      borderLeft: !isUser ? `2px solid ${accentColor}` : undefined,
                    }}>
                      {isUser ? msg.text : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                          {msg.text}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                )
              })}
              <div style={{ textAlign: 'center', color: theme.textFaint, fontSize: 11, margin: '4px 0 8px' }}>
                {fmt(lastTs)}
              </div>
            </div>
          )
        })}

        {showTyping && <TypingIndicator isDark={isDark} />}

        {!showTyping && streamingText && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 6 }}>
            <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: 18, borderBottomLeftRadius: 4, background: theme.surface, color: theme.text, fontSize: 15, lineHeight: 1.5 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {streamingText}
              </ReactMarkdown>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </>
  )
}
