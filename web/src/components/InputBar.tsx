import { useState, useRef } from 'react'
import { dark, light } from '../theme'

export interface AttachedFile {
  name: string
  content: string
  mime: string
}

interface Props {
  accent: string
  isStreaming: boolean
  onSend(t: string, file?: AttachedFile): void
  onAbort(): void
  isDark: boolean
}

export default function InputBar({ accent, isStreaming, onSend, onAbort, isDark }: Props) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<AttachedFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const theme = isDark ? dark : light
  const can = (text.trim().length > 0 || file !== null) && !isStreaming

  function send() {
    if (!can) return
    onSend(text.trim(), file ?? undefined)
    setText('')
    setFile(null)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) return
    const isImage = picked.type.startsWith('image/')
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(isImage
        ? (reader.result as string).split(',')[1]  // strip data:...;base64, prefix
        : reader.result as string)
      reader.onerror = reject
      if (isImage) reader.readAsDataURL(picked)
      else reader.readAsText(picked)
    })
    setFile({ name: picked.name, content, mime: picked.type })
    e.target.value = ''
  }

  return (
    <div style={{ padding: '8px 12px 12px', flexShrink: 0 }}>
      {file && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          border: `1px solid ${theme.border}`, borderRadius: 12,
          padding: '4px 10px', marginBottom: 6, maxWidth: '85%',
        }}>
          <span style={{ fontSize: 13, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.mime.startsWith('image/') ? '🖼️' : '📄'} {file.name}
          </span>
          <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textDim, fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          style={{ background: 'none', border: 'none', cursor: isStreaming ? 'default' : 'pointer', fontSize: 22, color: file ? accent : theme.textDim, padding: '0 2px', lineHeight: 1, flexShrink: 0, opacity: isStreaming ? 0.4 : 1 }}
        >⊕</button>
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={file ? 'Add a message...' : 'Say something...'} rows={1}
          style={{ flex: 1, background: theme.inputBg, border: 'none', borderRadius: 20, padding: '12px 16px', fontSize: 16, color: theme.text, outline: 'none', resize: 'none', maxHeight: 120, overflowY: 'auto' }}
        />
        {isStreaming ? (
          <button onClick={onAbort} style={{ width: 44, height: 44, borderRadius: 22, background: theme.surfaceAlt, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 14, height: 14, borderRadius: 2, background: theme.textDim }} />
          </button>
        ) : (
          <button onClick={send} disabled={!can} style={{ width: 44, height: 44, borderRadius: 22, background: accent, border: 'none', cursor: can ? 'pointer' : 'default', opacity: can ? 1 : 0.4, color: '#fff', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            ↑
          </button>
        )}
      </div>
    </div>
  )
}
