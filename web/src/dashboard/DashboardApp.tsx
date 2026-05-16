import React, { useState } from 'react';
import { getToken, setToken, login } from './api';
import PersonasPanel from './panels/PersonasPanel';
import ModelsPanel from './panels/ModelsPanel';
import VaultPanel from './panels/VaultPanel';
import LogsPanel from './panels/LogsPanel';
import SetupPanel from './panels/SetupPanel';

const BG = '#0D0B08';
const SURFACE = '#1A1714';
const BORDER = '#2A2520';
const TEXT = '#F0EDE8';
const TEXT_DIM = '#8A8480';
const ACCENT = '#4CAF50';
const ERROR = '#FF6135';

type NavTab = 'personas' | 'models' | 'vault' | 'logs' | 'setup';

const NAV_ITEMS: { id: NavTab; label: string }[] = [
  { id: 'personas', label: 'Personas' },
  { id: 'models', label: 'Models' },
  { id: 'vault', label: 'Vault' },
  { id: 'logs', label: 'Logs' },
  { id: 'setup', label: 'Setup' },
];

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await login(secret.trim());
      setToken(token);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: '12px',
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: '360px',
      }}>
        <h1 style={{ color: TEXT, fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>
          Companion Dashboard
        </h1>
        <p style={{ color: TEXT_DIM, fontSize: '0.875rem', textAlign: 'center', marginBottom: '2rem' }}>
          Enter your server secret to continue
        </p>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', color: TEXT_DIM, fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Secret
          </label>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="Enter AUTH_SECRET…"
            autoFocus
            style={{
              width: '100%',
              background: BG,
              border: `1px solid ${BORDER}`,
              borderRadius: '6px',
              color: TEXT,
              fontSize: '0.95rem',
              padding: '10px 12px',
              outline: 'none',
              fontFamily: 'monospace',
              marginBottom: '1.25rem',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ color: ERROR, fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !secret.trim()}
            style={{
              width: '100%',
              background: ACCENT,
              border: 'none',
              color: '#000',
              borderRadius: '6px',
              padding: '10px',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: loading || !secret.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !secret.trim() ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Connecting…' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DashboardApp() {
  const [authed, setAuthed] = useState(() => !!getToken());
  const [activeTab, setActiveTab] = useState<NavTab>('personas');

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: BG,
      display: 'flex',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: TEXT,
    }}>
      <aside style={{
        width: '220px',
        flexShrink: 0,
        background: SURFACE,
        borderRight: `1px solid ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        overflowY: 'auto',
      }}>
        <div style={{
          padding: '1.25rem 1.25rem 1rem',
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <h1 style={{ color: TEXT, fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.01em' }}>
            Companion
          </h1>
          <p style={{ color: TEXT_DIM, fontSize: '0.75rem', marginTop: '2px' }}>Dashboard</p>
        </div>
        <nav style={{ padding: '0.75rem 0', flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderLeft: `3px solid ${isActive ? ACCENT : 'transparent'}`,
                  color: isActive ? TEXT : TEXT_DIM,
                  textAlign: 'left',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: '1rem 1.25rem', borderTop: `1px solid ${BORDER}` }}>
          <button
            onClick={() => {
              sessionStorage.removeItem('dashboard_token');
              setAuthed(false);
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${BORDER}`,
              color: TEXT_DIM,
              borderRadius: '4px',
              padding: '5px 12px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              width: '100%',
              fontFamily: 'inherit',
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main style={{
        marginLeft: '220px',
        flex: 1,
        padding: '2rem',
        minHeight: '100vh',
        overflowY: 'auto',
        boxSizing: 'border-box',
        maxWidth: 'calc(100vw - 220px)',
      }}>
        {activeTab === 'personas' && <PersonasPanel />}
        {activeTab === 'models' && <ModelsPanel />}
        {activeTab === 'vault' && <VaultPanel />}
        {activeTab === 'logs' && <LogsPanel />}
        {activeTab === 'setup' && <SetupPanel />}
      </main>
    </div>
  );
}
