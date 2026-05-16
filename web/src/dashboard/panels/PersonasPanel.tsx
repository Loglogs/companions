import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api';

const MODES = ['mentor', 'shapeshifter', 'keeper', 'tracker'] as const;
type PersonaMode = typeof MODES[number];

interface Persona {
  mode: string;
  name: string;
  emoji: string;
  body: string;
}

interface PersonaCardState {
  data: Persona | null;
  loading: boolean;
  error: string | null;
  expanded: boolean;
  editName: string;
  editEmoji: string;
  editBody: string;
  saving: boolean;
  saveMsg: string | null;
  saveError: string | null;
}

const EMOJIS = [
  '🐢','🦞','🐝','🐙','🦊','🐸','🦁','🐯','🐻','🦝','🦔','🐺','🦇','🦉','🐦','🦅','🐧','🦜',
  '🐬','🦈','🐠','🦋','🐌','🐜','🦎','🐍','🐉','🦄','🐴','🦓','🦒','🐘','🦏','🐪','🦘','🐑',
  '🐐','🦌','🐕','🐈','🐇','🐁','🐿️','🦦','🦥','🐓','🦢','🕊️','🌿','🌱','🌲','🌳','🌵','🌾',
  '🍄','🌺','🌸','🌼','⭐','🌙','☀️','⚡','🔥','💧','🌊','🤖','👾','🎭','🎨','🎯','🚀','💡',
  '🔮','⚙️','🗝️','📚','🌀','♾️','🧠','👁️','🦾','🎪','🏔️','🌋','🪐','🌈',
];

function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setTriggerHovered(true)}
        onMouseLeave={() => setTriggerHovered(false)}
        style={{
          fontSize: '1.75rem',
          background: 'transparent',
          border: 'none',
          outline: triggerHovered ? `1px solid ${BORDER}` : 'none',
          width: '3rem',
          cursor: 'pointer',
          borderRadius: '4px',
          padding: '2px',
          lineHeight: 1,
        }}
      >
        {value || '❓'}
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          zIndex: 100,
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: '8px',
          padding: '8px',
          width: '268px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '2px',
            maxHeight: '200px',
            overflowY: 'auto',
          }}>
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => { onChange(emoji); setOpen(false); }}
                onMouseEnter={() => setHovered(emoji)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: '36px',
                  height: '36px',
                  fontSize: '1.3rem',
                  background: hovered === emoji ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const BG = '#0D0B08';
const SURFACE = '#1A1714';
const BORDER = '#2A2520';
const TEXT = '#F0EDE8';
const TEXT_DIM = '#8A8480';
const ACCENT = '#4CAF50';
const ERROR = '#FF6135';

export default function PersonasPanel() {
  const [cards, setCards] = useState<Record<PersonaMode, PersonaCardState>>(() => {
    const init = {} as Record<PersonaMode, PersonaCardState>;
    for (const m of MODES) {
      init[m] = {
        data: null, loading: true, error: null, expanded: false,
        editName: '', editEmoji: '', editBody: '',
        saving: false, saveMsg: null, saveError: null,
      };
    }
    return init;
  });

  useEffect(() => {
    for (const mode of MODES) {
      apiFetch(`/admin/persona/${mode}`)
        .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => { throw new Error(e.error); }))
        .then((p: Persona) => {
          setCards(prev => ({
            ...prev,
            [mode]: {
              ...prev[mode],
              data: p,
              loading: false,
              editName: p.name,
              editEmoji: p.emoji,
              editBody: p.body,
            },
          }));
        })
        .catch((err: Error) => {
          setCards(prev => ({
            ...prev,
            [mode]: { ...prev[mode], loading: false, error: err.message },
          }));
        });
    }
  }, []);

  function toggleExpand(mode: PersonaMode) {
    setCards(prev => ({ ...prev, [mode]: { ...prev[mode], expanded: !prev[mode].expanded } }));
  }

  function setField(mode: PersonaMode, field: 'editName' | 'editEmoji' | 'editBody', val: string) {
    setCards(prev => ({ ...prev, [mode]: { ...prev[mode], [field]: val } }));
  }

  async function save(mode: PersonaMode) {
    const card = cards[mode];
    setCards(prev => ({ ...prev, [mode]: { ...prev[mode], saving: true, saveMsg: null, saveError: null } }));
    try {
      const r = await apiFetch(`/admin/persona/${mode}`, {
        method: 'PUT',
        body: JSON.stringify({ name: card.editName, emoji: card.editEmoji, body: card.editBody }),
      });
      if (!r.ok) {
        const e = await r.json() as { error: string };
        throw new Error(e.error);
      }
      setCards(prev => ({
        ...prev,
        [mode]: { ...prev[mode], saving: false, saveMsg: 'Saved', data: { ...prev[mode].data!, name: card.editName, emoji: card.editEmoji, body: card.editBody } },
      }));
      setTimeout(() => setCards(prev => ({ ...prev, [mode]: { ...prev[mode], saveMsg: null } })), 2000);
    } catch (err) {
      setCards(prev => ({
        ...prev,
        [mode]: { ...prev[mode], saving: false, saveError: err instanceof Error ? err.message : String(err) },
      }));
    }
  }

  return (
    <div>
      <h2 style={{ color: TEXT, fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Personas</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '1rem',
      }}>
        {MODES.map(mode => {
          const card = cards[mode];
          return (
            <div key={mode} style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: '8px',
              padding: '1.25rem',
            }}>
              {card.loading && (
                <p style={{ color: TEXT_DIM, fontSize: '0.875rem' }}>Loading…</p>
              )}
              {card.error && (
                <p style={{ color: ERROR, fontSize: '0.875rem' }}>{card.error}</p>
              )}
              {!card.loading && !card.error && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <EmojiPicker
                      value={card.editEmoji}
                      onChange={emoji => setField(mode, 'editEmoji', emoji)}
                    />
                    <div style={{ flex: 1 }}>
                      <input
                        value={card.editName}
                        onChange={e => setField(mode, 'editName', e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderBottom: `1px solid ${BORDER}`,
                          color: TEXT,
                          fontSize: '1rem',
                          fontWeight: 600,
                          width: '100%',
                          outline: 'none',
                          paddingBottom: '2px',
                        }}
                      />
                      <p style={{ color: TEXT_DIM, fontSize: '0.75rem', marginTop: '2px' }}>
                        <span style={{
                          background: BG,
                          border: `1px solid ${BORDER}`,
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '0.7rem',
                          letterSpacing: '0.05em',
                        }}>{mode}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleExpand(mode)}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${BORDER}`,
                      color: TEXT_DIM,
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      marginBottom: card.expanded ? '0.75rem' : 0,
                    }}
                  >
                    {card.expanded ? 'Hide prompt' : 'Edit prompt'}
                  </button>

                  {card.expanded && (
                    <textarea
                      value={card.editBody}
                      onChange={e => setField(mode, 'editBody', e.target.value)}
                      rows={12}
                      style={{
                        width: '100%',
                        background: BG,
                        border: `1px solid ${BORDER}`,
                        borderRadius: '4px',
                        color: TEXT,
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        padding: '0.75rem',
                        resize: 'vertical',
                        outline: 'none',
                        marginBottom: '0.75rem',
                        minHeight: '300px',
                      }}
                    />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <button
                      onClick={() => save(mode)}
                      disabled={card.saving}
                      style={{
                        background: ACCENT,
                        border: 'none',
                        color: '#000',
                        borderRadius: '4px',
                        padding: '6px 14px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: card.saving ? 'not-allowed' : 'pointer',
                        opacity: card.saving ? 0.7 : 1,
                      }}
                    >
                      {card.saving ? 'Saving…' : 'Save'}
                    </button>
                    {card.saveMsg && <span style={{ color: ACCENT, fontSize: '0.8rem' }}>{card.saveMsg}</span>}
                    {card.saveError && <span style={{ color: ERROR, fontSize: '0.8rem' }}>{card.saveError}</span>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
