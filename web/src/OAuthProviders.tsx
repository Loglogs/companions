import React, { useEffect, useRef, useState } from 'react';

const BG = '#0D0B08';
const SURFACE = '#1A1714';
const BORDER = '#2A2520';
const TEXT = '#F0EDE8';
const TEXT_DIM = '#8A8480';
const ACCENT = '#4CAF50';
const ERROR = '#FF6135';

const OAUTH_PROVIDER_NAMES: Record<string, string> = {
  'anthropic': 'Anthropic',
  'openai-codex': 'OpenAI',
  'github-copilot': 'GitHub Copilot',
  'google-gemini-cli': 'Google (Gemini CLI)',
  'google-antigravity': 'Antigravity (Free)',
};

const DEVICE_CODE_PROVIDERS = new Set(['github-copilot']);

type FlowState =
  | { phase: 'idle' }
  | { phase: 'starting' }
  | { phase: 'waiting'; authUrl: string; userCode?: string }
  | { phase: 'done' }
  | { phase: 'error'; message: string };

interface ProviderAuthStatus {
  authenticated: boolean;
  type?: string;
}

interface OAuthProvidersProps {
  fetchFn?: (url: string, opts?: RequestInit) => Promise<Response>;
  onStatusChange?: () => void;
}

function defaultFetch(url: string, opts?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts?.headers) {
    Object.assign(headers, opts.headers);
  }
  return fetch(url, { ...opts, headers });
}

function SmallSpinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: '14px',
      height: '14px',
      borderRadius: '50%',
      border: `2px solid ${BORDER}`,
      borderTopColor: ACCENT,
      animation: 'spin 0.8s linear infinite',
      verticalAlign: 'middle',
      marginLeft: '6px',
    }} />
  );
}

interface ProviderCardProps {
  id: string;
  name: string;
  authenticated: boolean;
  flow: FlowState;
  onConnect: () => void;
  onDisconnect: () => void;
  onRetry: () => void;
}

function ProviderCard({ id, name, authenticated, flow, onConnect, onDisconnect, onRetry }: ProviderCardProps) {
  const isDeviceCode = DEVICE_CODE_PROVIDERS.has(id);

  return (
    <div style={{
      background: BG,
      border: `1px solid ${BORDER}`,
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '0.5rem',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: TEXT, fontSize: '0.9rem', fontWeight: 500 }}>{name}</span>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 7px',
            borderRadius: '10px',
            background: authenticated ? 'rgba(76,175,80,0.15)' : 'rgba(138,132,128,0.15)',
            color: authenticated ? ACCENT : TEXT_DIM,
            border: `1px solid ${authenticated ? 'rgba(76,175,80,0.3)' : BORDER}`,
          }}>
            {authenticated ? 'Connected' : 'Not connected'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {flow.phase === 'idle' && authenticated && (
            <button
              onClick={onDisconnect}
              style={{
                background: 'transparent',
                border: `1px solid ${BORDER}`,
                color: TEXT_DIM,
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Disconnect
            </button>
          )}
          {flow.phase === 'idle' && !authenticated && (
            <button
              onClick={onConnect}
              style={{
                background: ACCENT,
                border: 'none',
                color: '#000',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Connect
            </button>
          )}
          {flow.phase === 'starting' && (
            <span style={{ color: TEXT_DIM, fontSize: '0.8rem' }}>
              Starting…<SmallSpinner />
            </span>
          )}
          {flow.phase === 'done' && (
            <span style={{ color: ACCENT, fontSize: '0.8rem' }}>Connected!</span>
          )}
        </div>
      </div>

      {/* Waiting state */}
      {flow.phase === 'waiting' && (
        <div style={{ marginTop: '0.75rem' }}>
          {isDeviceCode && flow.userCode ? (
            <>
              <p style={{ color: TEXT_DIM, fontSize: '0.82rem', marginBottom: '0.5rem' }}>
                Enter this code at github.com/login/device:
              </p>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: TEXT,
                letterSpacing: '0.1em',
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                display: 'inline-block',
                marginBottom: '0.75rem',
              }}>
                {flow.userCode}
              </div>
              <div>
                <a
                  href={flow.authUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    background: ACCENT,
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '5px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Open GitHub →
                </a>
              </div>
              <p style={{ color: TEXT_DIM, fontSize: '0.78rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Waiting for authorization<SmallSpinner />
              </p>
            </>
          ) : (
            <p style={{ color: TEXT_DIM, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Complete authentication in the browser tab that just opened<SmallSpinner />
            </p>
          )}
        </div>
      )}

      {/* Error state */}
      {flow.phase === 'error' && (
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ color: ERROR, fontSize: '0.82rem' }}>{flow.message}</span>
          <button
            onClick={onRetry}
            style={{
              background: 'transparent',
              border: `1px solid ${BORDER}`,
              color: TEXT_DIM,
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default function OAuthProviders({ fetchFn, onStatusChange }: OAuthProvidersProps) {
  const doFetch = fetchFn ?? defaultFetch;

  const [oauthProviderIds, setOauthProviderIds] = useState<string[]>([]);
  const [authStatuses, setAuthStatuses] = useState<Record<string, ProviderAuthStatus>>({});
  const [flows, setFlows] = useState<Record<string, FlowState>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Track poll interval per provider
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Inject spin keyframe once
  useEffect(() => {
    const existing = document.getElementById('oauth-spin-keyframe');
    if (!existing) {
      const style = document.createElement('style');
      style.id = 'oauth-spin-keyframe';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
  }, []);

  // Cleanup all polls on unmount
  useEffect(() => {
    return () => {
      for (const id of Object.values(pollRefs.current)) {
        clearInterval(id);
      }
    };
  }, []);

  async function loadProviders() {
    setLoading(true);
    setLoadError(null);
    try {
      const [oauthRes, allRes] = await Promise.all([
        doFetch('/providers/oauth'),
        doFetch('/providers'),
      ]);
      if (!oauthRes.ok || !allRes.ok) {
        throw new Error('Failed to load providers');
      }
      const oauthData = await oauthRes.json() as { providers: Array<{ id: string }> };
      const allData = await allRes.json() as { providers: Record<string, { authStatus: ProviderAuthStatus }> };

      const ids = oauthData.providers.map(p => p.id);
      setOauthProviderIds(ids);

      const statuses: Record<string, ProviderAuthStatus> = {};
      for (const id of ids) {
        statuses[id] = allData.providers[id]?.authStatus ?? { authenticated: false };
      }
      setAuthStatuses(statuses);

      // Initialize flows for new providers
      setFlows(prev => {
        const next = { ...prev };
        for (const id of ids) {
          if (!next[id]) next[id] = { phase: 'idle' };
        }
        return next;
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProviders();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function stopPoll(id: string) {
    if (pollRefs.current[id]) {
      clearInterval(pollRefs.current[id]);
      delete pollRefs.current[id];
    }
  }

  function startPoll(id: string) {
    stopPoll(id);
    pollRefs.current[id] = setInterval(async () => {
      try {
        const r = await doFetch(`/providers/${id}/login/status`);
        const d = await r.json() as { ok: boolean; done: boolean; error?: string };
        if (d.error) {
          stopPoll(id);
          setFlows(prev => ({ ...prev, [id]: { phase: 'error', message: d.error! } }));
          return;
        }
        if (d.done) {
          stopPoll(id);
          setFlows(prev => ({ ...prev, [id]: { phase: 'done' } }));
          onStatusChange?.();
          // Refresh auth statuses after brief delay
          setTimeout(() => {
            loadProviders().then(() => {
              setFlows(prev => ({ ...prev, [id]: { phase: 'idle' } }));
            });
          }, 1500);
        }
      } catch {
        stopPoll(id);
        setFlows(prev => ({ ...prev, [id]: { phase: 'error', message: 'Poll failed' } }));
      }
    }, 2000);
  }

  async function handleConnect(id: string) {
    setFlows(prev => ({ ...prev, [id]: { phase: 'starting' } }));
    try {
      const r = await doFetch(`/providers/${id}/login`, { method: 'POST' });
      const d = await r.json() as { ok: boolean; authUrl?: string; instructions?: string; userCode?: string; error?: string };
      if (!r.ok || !d.ok) {
        throw new Error(d.error ?? 'Failed to start login');
      }
      const authUrl = d.authUrl ?? '';
      const isDevice = DEVICE_CODE_PROVIDERS.has(id);

      setFlows(prev => ({
        ...prev,
        [id]: { phase: 'waiting', authUrl, userCode: d.userCode },
      }));

      // For PKCE providers, auto-open in new tab
      if (!isDevice && authUrl) {
        window.open(authUrl, '_blank');
      }

      startPoll(id);
    } catch (err) {
      setFlows(prev => ({
        ...prev,
        [id]: { phase: 'error', message: err instanceof Error ? err.message : 'Failed to start login' },
      }));
    }
  }

  async function handleDisconnect(id: string) {
    try {
      await doFetch(`/providers/${id}/apikey`, { method: 'DELETE' });
      onStatusChange?.();
      await loadProviders();
    } catch {
      // Refresh anyway
      await loadProviders();
    }
  }

  function handleRetry(id: string) {
    stopPoll(id);
    setFlows(prev => ({ ...prev, [id]: { phase: 'idle' } }));
  }

  if (loading) {
    return <p style={{ color: TEXT_DIM, fontSize: '0.85rem' }}>Loading…</p>;
  }

  if (loadError) {
    return <p style={{ color: ERROR, fontSize: '0.85rem' }}>{loadError}</p>;
  }

  if (oauthProviderIds.length === 0) {
    return <p style={{ color: TEXT_DIM, fontSize: '0.85rem' }}>No OAuth providers available.</p>;
  }

  return (
    <div>
      {oauthProviderIds.map(id => (
        <ProviderCard
          key={id}
          id={id}
          name={OAUTH_PROVIDER_NAMES[id] ?? id}
          authenticated={authStatuses[id]?.authenticated ?? false}
          flow={flows[id] ?? { phase: 'idle' }}
          onConnect={() => handleConnect(id)}
          onDisconnect={() => handleDisconnect(id)}
          onRetry={() => handleRetry(id)}
        />
      ))}
    </div>
  );
}
