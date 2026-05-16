import { useCallback } from 'react'
import { useAppState, useAppDispatch, ACCENTS, EMOJIS, NAMES } from '../store'
import { wsService } from '../ws'
import { dark, light } from '../theme'
import MessageList from './MessageList'
import InputBar, { AttachedFile } from './InputBar'

interface Props { persona: 'mentor' | 'shapeshifter'; onSettings(): void; onSwitch(): void }

export default function ChatTab({ persona, onSettings, onSwitch }: Props) {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const theme = state.isDark ? dark : light
  const accent = ACCENTS[persona]
  const isStreaming = state.agentState === 'thinking' || state.agentState === 'talking'
  const other = persona === 'mentor' ? 'shapeshifter' : 'mentor'

  const serverPersona = persona === 'mentor' ? 'mentor' : 'shapeshifter'

  const handleSend = useCallback((text: string, file?: AttachedFile) => {
    const isImage = file?.mime.startsWith('image/')
    const fileIcon = isImage ? '🖼️' : '📄'
    const displayText = file ? `${text ? text + '\n' : ''}${fileIcon} ${file.name}`.trim() : text
    dispatch({ type: 'ADD_USER_MESSAGE', text: displayText })
    wsService.send({ type: 'message', text, persona: serverPersona, fileName: file?.name, fileContent: file?.content, fileMime: file?.mime })
  }, [dispatch, serverPersona])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, flexShrink: 0,
      }}>
        <button onClick={onSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '6px 10px', color: theme.text }}>≡</button>
        <span style={{ color: accent, fontWeight: 700, fontSize: 18 }}>{EMOJIS[persona]} {NAMES[persona]}</span>
        <button onClick={() => dispatch({ type: 'TOGGLE_THEME' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: '6px 10px', color: theme.text }}>
          {state.isDark ? '🌙' : '☀️'}
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MessageList messages={state.messages} streamingText={state.streamingText}
          agentState={state.agentState} accent={accent} isDark={state.isDark} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: 12, paddingTop: 4 }}>
        <button onClick={onSwitch} style={{
          background: 'none', border: `1px solid ${theme.border}`, borderRadius: 16,
          padding: '4px 12px', cursor: 'pointer', fontSize: 13, color: theme.textDim,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          Switch to {EMOJIS[other]} {NAMES[other]}
        </button>
      </div>
      <InputBar accent={accent} isStreaming={isStreaming} onSend={handleSend}
        onAbort={() => wsService.send({ type: 'abort' })} isDark={state.isDark} />
    </div>
  )
}
