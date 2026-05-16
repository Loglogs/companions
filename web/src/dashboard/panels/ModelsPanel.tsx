import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import OAuthProviders from '../../OAuthProviders';

const MODES = ['mentor', 'shapeshifter', 'keeper', 'tracker'] as const;
type AgentMode = typeof MODES[number];

interface ModelEntry {
  provider: string;
  modelId: string;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  api?: string;
}

interface ProviderInfo {
  authStatus: {
    authenticated: boolean;
    type?: string;
  };
  models: ModelInfo[];
}

type ProvidersMap = Record<string, ProviderInfo>;

const SURFACE = '#1A1714';
const BORDER = '#2A2520';
const TEXT = '#F0EDE8';
const TEXT_DIM = '#8A8480';
const ACCENT = '#4CAF50';
const ERROR = '#FF6135';
const BG = '#0D0B08';

const PERSONA_MODES = ['mentor', 'shapeshifter', 'keeper', 'tracker'] as const;

export default function ModelsPanel() {
  const [providers, setProviders] = useState<ProvidersMap>({});
  const [modeModels, setModeModels] = useState<Record<AgentMode, ModelEntry | null>>({} as Record<AgentMode, ModelEntry | null>);
  const [personaNames, setPersonaNames] = useState<Record<string, string>>({});
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingModes, setLoadingModes] = useState(true);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [modeChanging, setModeChanging] = useState<Record<string, boolean>>({});
  const [modeMsg, setModeMsg] = useState<Record<string, string | null>>({});
  const [modeErr, setModeErr] = useState<Record<string, string | null>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [keyMsg, setKeyMsg] = useState<Record<string, string | null>>({});
  const [keyErr, setKeyErr] = useState<Record<string, string | null>>({});
  const [keySaving, setKeySaving] = useState<Record<string, boolean>>({});
  const [defaultModelStr, setDefaultModelStr] = useState('');
  const [dmCategory, setDmCategory] = useState<'local' | 'cloud'>('local');
  const [dmProvider, setDmProvider] = useState('omlx');
  const [dmModelId, setDmModelId] = useState('llama3.2');
  const [dmBaseUrl, setDmBaseUrl] = useState('http://localhost:8000/v1');
  const [dmSaving, setDmSaving] = useState(false);
  const [dmMsg, setDmMsg] = useState<string | null>(null);
  const [dmErr, setDmErr] = useState<string | null>(null);

  useEffect(() => {
    // Load persona names dynamically
    Promise.all(
      PERSONA_MODES.map(m =>
        apiFetch(`/admin/persona/${m}`)
          .then(r => r.ok ? r.json() : null)
          .then((d: { name: string; emoji: string } | null) => [m, d ? `${d.emoji} ${d.name}`.trim() : m] as const)
          .catch(() => [m, m] as const)
      )
    ).then(results => {
      const map: Record<string, string> = {};
      for (const [m, label] of results) map[m] = label;
      setPersonaNames(map);
    });

    apiFetch('/admin/default-model')
      .then(r => r.ok ? r.json() : null)
      .then((d: { raw: string; category: string; provider: string; modelId: string; baseUrl: string } | null) => {
        if (!d) return;
        setDefaultModelStr(d.raw);
        setDmCategory(d.category as 'local' | 'cloud');
        setDmProvider(d.provider);
        setDmModelId(d.modelId);
        setDmBaseUrl(d.baseUrl);
      })
      .catch(() => {});

    apiFetch('/providers')
      .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => { throw new Error(e.error); }))
      .then((d: { providers: ProvidersMap }) => {
        setProviders(d.providers);
        setLoadingProviders(false);
      })
      .catch((err: Error) => {
        setProviderError(err.message);
        setLoadingProviders(false);
      });

    Promise.all(
      MODES.map(mode =>
        apiFetch(`/modes/${mode}/model`)
          .then(r => r.ok ? r.json() : null)
          .then((d: { model: ModelEntry | null } | null) => [mode, d?.model ?? null] as const)
          .catch(() => [mode, null] as const)
      )
    ).then(results => {
      const map = {} as Record<AgentMode, ModelEntry | null>;
      for (const [mode, model] of results) map[mode as AgentMode] = model;
      setModeModels(map);
      setLoadingModes(false);
    });
  }, []);

  const allModels: ModelInfo[] = Object.values(providers).flatMap(p => p.models);

  async function changeModel(mode: AgentMode, value: string) {
    setModeChanging(prev => ({ ...prev, [mode]: true }));
    setModeMsg(prev => ({ ...prev, [mode]: null }));
    setModeErr(prev => ({ ...prev, [mode]: null }));
    try {
      let body: ModelEntry | null = null;
      if (value) {
        const [provider, ...rest] = value.split('::');
        body = { provider, modelId: rest.join('::') };
      }
      const r = await apiFetch(`/modes/${mode}/model`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json() as { error: string };
        throw new Error(e.error);
      }
      const d = await r.json() as { model: ModelEntry | null };
      setModeModels(prev => ({ ...prev, [mode]: d.model }));
      setModeMsg(prev => ({ ...prev, [mode]: 'Updated' }));
      setTimeout(() => setModeMsg(prev => ({ ...prev, [mode]: null })), 2000);
    } catch (err) {
      setModeErr(prev => ({ ...prev, [mode]: err instanceof Error ? err.message : String(err) }));
    } finally {
      setModeChanging(prev => ({ ...prev, [mode]: false }));
    }
  }

  async function saveApiKey(provider: string) {
    const key = apiKeys[provider] ?? '';
    if (!key.trim()) return;
    setKeySaving(prev => ({ ...prev, [provider]: true }));
    setKeyMsg(prev => ({ ...prev, [provider]: null }));
    setKeyErr(prev => ({ ...prev, [provider]: null }));
    try {
      const r = await apiFetch(`/providers/${provider}/apikey`, {
        method: 'POST',
        body: JSON.stringify({ key: key.trim() }),
      });
      if (!r.ok) {
        const e = await r.json() as { error: string };
        throw new Error(e.error);
      }
      setKeyMsg(prev => ({ ...prev, [provider]: 'Saved' }));
      setApiKeys(prev => ({ ...prev, [provider]: '' }));
      setTimeout(() => setKeyMsg(prev => ({ ...prev, [provider]: null })), 2000);
    } catch (err) {
      setKeyErr(prev => ({ ...prev, [provider]: err instanceof Error ? err.message : String(err) }));
    } finally {
      setKeySaving(prev => ({ ...prev, [provider]: false }));
    }
  }

  async function saveDefaultModel() {
    setDmSaving(true);
    setDmMsg(null);
    setDmErr(null);
    try {
      const r = await apiFetch('/admin/default-model', {
        method: 'PUT',
        body: JSON.stringify({ category: dmCategory, provider: dmProvider, modelId: dmModelId, baseUrl: dmBaseUrl }),
      });
      if (!r.ok) { const e = await r.json() as { error: string }; throw new Error(e.error); }
      setDmMsg('Saved — server restarting…');
      setTimeout(() => setDmMsg(null), 4000);
    } catch (err) {
      setDmErr(err instanceof Error ? err.message : String(err));
    } finally {
      setDmSaving(false);
    }
  }

  const LOCAL_PROVIDERS = [
    { id: 'omlx',     label: 'oMLX',      preferred: true,  baseUrl: 'http://localhost:8000/v1',  modelId: 'llama3.2' },
    { id: 'ollama',   label: 'Ollama',     preferred: false, baseUrl: 'http://localhost:11434/v1', modelId: 'llama3.2' },
    { id: 'lmstudio', label: 'LM Studio',  preferred: false, baseUrl: 'http://localhost:1234/v1',  modelId: 'llama-3.2-3b' },
    { id: 'custom',   label: 'Custom',     preferred: false, baseUrl: '',                           modelId: '' },
  ];

  const CLOUD_PROVIDERS = [
    { id: 'anthropic', label: 'Anthropic', modelId: 'claude-sonnet-4-6' },
    { id: 'openai',    label: 'OpenAI',    modelId: 'gpt-4o' },
  ];
  // Auth status for cloud providers (from /providers data)
  const cloudAuthStatus = (id: string) => providers[id]?.authStatus?.authenticated ?? false;

  const providerNames = Object.keys(providers);
  const apiKeyProviders = providerNames.filter(p => {
    const status = providers[p].authStatus as { type?: string; authenticated?: boolean };
    return status.type === 'api_key' || !status.type;
  });

  function refreshProviders() {
    apiFetch('/providers')
      .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => { throw new Error(e.error); }))
      .then((d: { providers: ProvidersMap }) => {
        setProviders(d.providers);
      })
      .catch(() => {});
  }

  return (
    <div>
      <h2 style={{ color: TEXT, fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Models</h2>

      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: TEXT_DIM, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
          Connected Accounts
        </h3>
        <OAuthProviders fetchFn={apiFetch} onStatusChange={refreshProviders} />
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: TEXT_DIM, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
          Default Model
        </h3>
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '1.25rem' }}>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {(['local', 'cloud'] as const).map(cat => (
              <button key={cat} onClick={() => setDmCategory(cat)} style={{
                padding: '6px 16px', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500, border: 'none',
                background: dmCategory === cat ? ACCENT : 'transparent',
                color: dmCategory === cat ? '#000' : TEXT_DIM,
                outline: dmCategory !== cat ? `1px solid ${BORDER}` : 'none',
              }}>
                {cat === 'local' ? 'Local' : 'Cloud'}
              </button>
            ))}
          </div>

          {/* Local provider buttons */}
          {dmCategory === 'local' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                {LOCAL_PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => {
                    setDmProvider(p.id);
                    if (p.id !== 'custom') { setDmBaseUrl(p.baseUrl); setDmModelId(p.modelId); }
                  }} style={{
                    padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'left',
                    background: 'transparent', fontWeight: dmProvider === p.id ? 600 : 400,
                    border: `1px solid ${dmProvider === p.id ? ACCENT : BORDER}`,
                    color: dmProvider === p.id ? TEXT : TEXT_DIM,
                  }}>
                    {p.label}{p.preferred && <span style={{ color: ACCENT, fontSize: '0.72rem', marginLeft: '6px' }}>preferred</span>}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input placeholder="Base URL" value={dmBaseUrl} onChange={e => setDmBaseUrl(e.target.value)}
                  style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: '4px', color: TEXT, fontSize: '0.85rem', padding: '6px 10px', outline: 'none' }} />
                <input placeholder="Model ID" value={dmModelId} onChange={e => setDmModelId(e.target.value)}
                  style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: '4px', color: TEXT, fontSize: '0.85rem', padding: '6px 10px', outline: 'none' }} />
              </div>
            </>
          )}

          {/* Cloud provider buttons */}
          {dmCategory === 'cloud' && (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {CLOUD_PROVIDERS.map(p => {
                  const connected = cloudAuthStatus(p.id);
                  return (
                    <button key={p.id} onClick={() => { setDmProvider(p.id); setDmModelId(p.modelId); }} style={{
                      padding: '8px 14px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer',
                      background: 'transparent', fontWeight: dmProvider === p.id ? 600 : 400,
                      border: `1px solid ${dmProvider === p.id ? ACCENT : BORDER}`,
                      color: dmProvider === p.id ? TEXT : TEXT_DIM,
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                    }}>
                      {p.label}
                      {connected && (
                        <span style={{ fontSize: '0.7rem', color: ACCENT }}>●</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <input placeholder="Model ID" value={dmModelId} onChange={e => setDmModelId(e.target.value)}
                  style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: '4px', color: TEXT, fontSize: '0.85rem', padding: '6px 10px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
              </div>
              <p style={{ color: TEXT_DIM, fontSize: '0.78rem' }}>
                Authentication managed in <strong style={{ color: TEXT_DIM }}>Connected Accounts</strong> above.
              </p>
            </>
          )}

          {/* Save button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
            <button onClick={saveDefaultModel} disabled={dmSaving} style={{
              background: ACCENT, border: 'none', color: '#000', borderRadius: '4px',
              padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600,
              cursor: dmSaving ? 'not-allowed' : 'pointer', opacity: dmSaving ? 0.7 : 1,
            }}>
              {dmSaving ? 'Saving…' : 'Save & Restart'}
            </button>
            {dmMsg && <span style={{ color: ACCENT, fontSize: '0.8rem' }}>{dmMsg}</span>}
            {dmErr && <span style={{ color: ERROR, fontSize: '0.8rem' }}>{dmErr}</span>}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: TEXT_DIM, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
          Mode Assignments
        </h3>
        {(loadingProviders || loadingModes) && (
          <p style={{ color: TEXT_DIM, fontSize: '0.875rem' }}>Loading…</p>
        )}
        {providerError && (
          <p style={{ color: ERROR, fontSize: '0.875rem' }}>{providerError}</p>
        )}
        {!loadingProviders && !loadingModes && !providerError && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {MODES.map(mode => {
              const current = modeModels[mode];
              const currentVal = current ? `${current.provider}::${current.modelId}` : '';
              return (
                <div key={mode} style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: '6px',
                  padding: '0.875rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}>
                  <span style={{ color: TEXT, fontSize: '0.9rem', minWidth: '180px', fontWeight: 500 }}>
                    {personaNames[mode] ?? mode}
                  </span>
                  <select
                    value={currentVal}
                    onChange={e => changeModel(mode, e.target.value)}
                    disabled={modeChanging[mode]}
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      background: BG,
                      border: `1px solid ${BORDER}`,
                      color: currentVal ? TEXT : TEXT_DIM,
                      borderRadius: '4px',
                      padding: '5px 8px',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">— default —</option>
                    {Object.entries(providers).map(([provName, prov]) =>
                      prov.models.map(m => (
                        <option key={`${provName}::${m.id}`} value={`${provName}::${m.id}`}>
                          [{provName}] {m.name}
                        </option>
                      ))
                    )}
                  </select>
                  {modeChanging[mode] && <span style={{ color: TEXT_DIM, fontSize: '0.8rem' }}>Updating…</span>}
                  {modeMsg[mode] && <span style={{ color: ACCENT, fontSize: '0.8rem' }}>{modeMsg[mode]}</span>}
                  {modeErr[mode] && <span style={{ color: ERROR, fontSize: '0.8rem' }}>{modeErr[mode]}</span>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 style={{ color: TEXT_DIM, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
          Provider API Keys
        </h3>
        {loadingProviders && <p style={{ color: TEXT_DIM, fontSize: '0.875rem' }}>Loading…</p>}
        {!loadingProviders && apiKeyProviders.length === 0 && (
          <p style={{ color: TEXT_DIM, fontSize: '0.875rem' }}>No providers found.</p>
        )}
        {!loadingProviders && apiKeyProviders.map(provider => {
          const status = providers[provider].authStatus as { authenticated?: boolean };
          return (
            <div key={provider} style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: '6px',
              padding: '0.875rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginBottom: '0.5rem',
            }}>
              <span style={{ color: TEXT, fontSize: '0.9rem', minWidth: '120px', fontWeight: 500 }}>
                {provider}
              </span>
              <span style={{
                fontSize: '0.72rem',
                padding: '2px 7px',
                borderRadius: '10px',
                background: status.authenticated ? 'rgba(76,175,80,0.15)' : 'rgba(138,132,128,0.15)',
                color: status.authenticated ? ACCENT : TEXT_DIM,
                border: `1px solid ${status.authenticated ? 'rgba(76,175,80,0.3)' : BORDER}`,
              }}>
                {status.authenticated ? 'Connected' : 'No key'}
              </span>
              <input
                type="password"
                placeholder="sk-…"
                value={apiKeys[provider] ?? ''}
                onChange={e => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                style={{
                  flex: 1,
                  minWidth: '180px',
                  background: BG,
                  border: `1px solid ${BORDER}`,
                  color: TEXT,
                  borderRadius: '4px',
                  padding: '5px 8px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  fontFamily: 'monospace',
                }}
              />
              <button
                onClick={() => saveApiKey(provider)}
                disabled={keySaving[provider] || !(apiKeys[provider] ?? '').trim()}
                style={{
                  background: ACCENT,
                  border: 'none',
                  color: '#000',
                  borderRadius: '4px',
                  padding: '5px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: keySaving[provider] ? 'not-allowed' : 'pointer',
                  opacity: keySaving[provider] || !(apiKeys[provider] ?? '').trim() ? 0.6 : 1,
                }}
              >
                {keySaving[provider] ? 'Saving…' : 'Save'}
              </button>
              {keyMsg[provider] && <span style={{ color: ACCENT, fontSize: '0.8rem' }}>{keyMsg[provider]}</span>}
              {keyErr[provider] && <span style={{ color: ERROR, fontSize: '0.8rem' }}>{keyErr[provider]}</span>}
            </div>
          );
        })}
      </section>
    </div>
  );
}
