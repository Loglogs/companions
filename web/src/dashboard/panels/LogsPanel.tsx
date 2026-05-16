import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getToken } from '../api';

interface LogEntry {
  ts: string;
  level: 'log' | 'warn' | 'error';
  msg: string;
}

const TEXT = '#F0EDE8';
const TEXT_DIM = '#8A8480';
const ACCENT = '#4CAF50';
const ERROR = '#FF6135';
const WARN = '#FFB300';
const SURFACE = '#1A1714';
const BORDER = '#2A2520';
const BG = '#0D0B08';

const MAX_LINES = 500;

function levelColor(level: LogEntry['level']): string {
  if (level === 'error') return ERROR;
  if (level === 'warn') return WARN;
  return TEXT_DIM;
}

function formatTs(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour12: false });
  } catch {
    return ts;
  }
}

export default function LogsPanel() {
  const [lines, setLines] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setConnError(null);
    const token = getToken();
    const url = token
      ? `/admin/logs?token=${encodeURIComponent(token)}`
      : '/admin/logs';
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e: MessageEvent) => {
      try {
        const entry = JSON.parse(e.data as string) as LogEntry;
        setLines(prev => {
          const next = [...prev, entry];
          return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
        });
      } catch {
        // malformed JSON — skip
      }
    };

    es.onerror = () => {
      setConnected(false);
      setConnError('Connection lost — retrying…');
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ color: TEXT, fontSize: '1.25rem', fontWeight: 600 }}>Logs</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: connected ? ACCENT : connError ? ERROR : TEXT_DIM,
            display: 'inline-block',
          }} />
          <span style={{ color: TEXT_DIM, fontSize: '0.78rem' }}>
            {connected ? 'Live' : connError ? 'Disconnected' : 'Connecting…'}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setLines([])}
          style={{
            background: 'transparent',
            border: `1px solid ${BORDER}`,
            color: TEXT_DIM,
            borderRadius: '4px',
            padding: '4px 12px',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
        {connError && (
          <button
            onClick={connect}
            style={{
              background: 'transparent',
              border: `1px solid ${BORDER}`,
              color: ACCENT,
              borderRadius: '4px',
              padding: '4px 12px',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Reconnect
          </button>
        )}
      </div>

      {connError && (
        <p style={{ color: ERROR, fontSize: '0.8rem', marginBottom: '0.5rem' }}>{connError}</p>
      )}

      <div style={{
        background: BG,
        border: `1px solid ${BORDER}`,
        borderRadius: '6px',
        padding: '0.75rem',
        flex: 1,
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        minHeight: '400px',
        maxHeight: 'calc(100vh - 240px)',
      }}>
        {lines.length === 0 && (
          <p style={{ color: TEXT_DIM }}>Waiting for log output…</p>
        )}
        {lines.map((line, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2px', lineHeight: 1.5 }}>
            <span style={{ color: TEXT_DIM, opacity: 0.6, flexShrink: 0, userSelect: 'none' }}>
              {formatTs(line.ts)}
            </span>
            <span style={{
              color: levelColor(line.level),
              flexShrink: 0,
              userSelect: 'none',
              minWidth: '40px',
            }}>
              {line.level.toUpperCase()}
            </span>
            <span style={{ color: line.level === 'log' ? TEXT : levelColor(line.level), wordBreak: 'break-word' }}>
              {line.msg}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <p style={{ color: TEXT_DIM, fontSize: '0.75rem', marginTop: '0.5rem' }}>
        Showing last {MAX_LINES} lines. Server buffer: {MAX_LINES} entries.
      </p>
    </div>
  );
}
