import React, { useEffect, useRef, useState } from 'react';
import { apiFetch, getToken } from '../api';
import QRCodeImg from '../../QRCodeImg';

interface SetupInfo {
  wsUrl: string;
  httpUrl: string;
  secret: string;
}

interface VersionInfo {
  commit: string;
  branch: string;
  ahead: number;
  behind: number;
  remoteChecked: boolean;
}

const SURFACE = '#1A1714';
const BORDER = '#2A2520';
const TEXT = '#F0EDE8';
const TEXT_DIM = '#8A8480';
const ACCENT = '#4CAF50';
const ERROR = '#FF6135';
const BG = '#0D0B08';

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ color: TEXT_DIM, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>
        {label}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <code style={{
          flex: 1,
          background: BG,
          border: `1px solid ${BORDER}`,
          borderRadius: '4px',
          padding: '7px 10px',
          color: TEXT,
          fontSize: '0.85rem',
          fontFamily: 'monospace',
          wordBreak: 'break-all',
        }}>
          {value}
        </code>
        <button
          onClick={copy}
          style={{
            background: 'transparent',
            border: `1px solid ${BORDER}`,
            color: copied ? ACCENT : TEXT_DIM,
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'color 0.2s',
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export default function SetupPanel() {
  const [info, setInfo] = useState<SetupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [deepLinkCopied, setDeepLinkCopied] = useState(false);

  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [versionLoading, setVersionLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState<string[]>([]);
  const [updateDone, setUpdateDone] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const logBoxRef = useRef<HTMLDivElement>(null);

  function fetchVersion() {
    setVersionLoading(true);
    apiFetch('/admin/version')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('version fetch failed')))
      .then((d: VersionInfo) => {
        setVersion(d);
        setVersionLoading(false);
      })
      .catch(() => setVersionLoading(false));
  }

  async function startUpdate() {
    setUpdating(true);
    setUpdateLog([]);
    setUpdateDone(false);
    setUpdateError(false);

    const token = getToken();
    let response: Response;
    try {
      response = await fetch('/admin/update', {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
    } catch {
      setUpdateLog(['Network error — could not reach server.']);
      setUpdateError(true);
      setUpdating(false);
      setUpdateDone(true);
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    const processChunk = (chunk: string) => {
      buf += chunk;
      const parts = buf.split('\n\n');
      buf = parts.pop() ?? '';
      for (const part of parts) {
        for (const line of part.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6)) as { msg: string; error?: boolean };
            if (payload.msg === '__done__') {
              setUpdating(false);
              setUpdateDone(true);
              if (payload.error) setUpdateError(true);
              if (!payload.error) {
                setUpdateLog(prev => [...prev, 'Server restarted. Refresh this page.']);
              }
            } else {
              setUpdateLog(prev => [...prev, payload.msg]);
            }
          } catch { /* malformed SSE line */ }
        }
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (!updateDone) {
            setUpdating(false);
            setUpdateDone(true);
          }
          break;
        }
        processChunk(decoder.decode(value, { stream: true }));
      }
    } catch {
      setUpdateLog(prev => [...prev, 'Connection lost — server may have restarted.']);
      setUpdating(false);
      setUpdateDone(true);
    }
  }

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [updateLog]);

  useEffect(() => { fetchVersion(); }, []);

  useEffect(() => {
    apiFetch('/admin/setup-info')
      .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => { throw new Error(e.error); }))
      .then((d: SetupInfo) => {
        setInfo(d);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const deepLink = info
    ? `companion://connect?url=${encodeURIComponent(info.wsUrl)}&secret=${encodeURIComponent(info.secret)}`
    : '';

  function copyDeepLink() {
    if (!deepLink) return;
    navigator.clipboard.writeText(deepLink).then(() => {
      setDeepLinkCopied(true);
      setTimeout(() => setDeepLinkCopied(false), 2000);
    });
  }

  return (
    <div>
      <h2 style={{ color: TEXT, fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Setup</h2>

      {/* Version / Update card */}
      <div style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: '8px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ color: TEXT_DIM, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
          Server Version
        </h3>

        {versionLoading && !version && (
          <p style={{ color: TEXT_DIM, fontSize: '0.85rem', marginBottom: '1rem' }}>Checking…</p>
        )}

        {version && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <span style={{ color: TEXT_DIM, fontSize: '0.85rem' }}>
                Branch: <code style={{ color: TEXT, fontFamily: 'monospace' }}>{version.branch}</code>
              </span>
              <span style={{ color: TEXT_DIM, fontSize: '0.85rem' }}>
                Commit: <code style={{ color: TEXT, fontFamily: 'monospace' }}>{version.commit}</code>
              </span>
            </div>
            {version.remoteChecked ? (
              version.behind > 0 ? (
                <p style={{ color: ERROR, fontSize: '0.85rem' }}>
                  {version.behind} commit{version.behind !== 1 ? 's' : ''} behind origin
                </p>
              ) : (
                <p style={{ color: ACCENT, fontSize: '0.85rem' }}>Up to date</p>
              )
            ) : (
              <p style={{ color: TEXT_DIM, fontSize: '0.82rem' }}>Remote check unavailable (offline or no tracking branch)</p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={fetchVersion}
            disabled={versionLoading || updating}
            style={{
              background: 'transparent',
              border: `1px solid ${BORDER}`,
              color: versionLoading ? TEXT_DIM : TEXT,
              borderRadius: '4px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              cursor: versionLoading || updating ? 'not-allowed' : 'pointer',
              opacity: versionLoading || updating ? 0.6 : 1,
            }}
          >
            {versionLoading ? 'Checking…' : 'Check for updates'}
          </button>
          <button
            onClick={() => { void startUpdate(); }}
            disabled={updating}
            style={{
              background: updating ? SURFACE : ACCENT,
              border: `1px solid ${updating ? BORDER : ACCENT}`,
              color: updating ? TEXT_DIM : BG,
              borderRadius: '4px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: updating ? 'not-allowed' : 'pointer',
              opacity: updating ? 0.7 : 1,
            }}
          >
            {updating ? 'Updating…' : 'Update & Restart'}
          </button>
        </div>

        {updateLog.length > 0 && (
          <div
            ref={logBoxRef}
            style={{
              marginTop: '1rem',
              background: BG,
              border: `1px solid ${BORDER}`,
              borderRadius: '4px',
              padding: '0.75rem 1rem',
              maxHeight: '300px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              lineHeight: 1.6,
            }}
          >
            {updateLog.map((line, i) => (
              <div key={i} style={{ color: updateError && i === updateLog.length - 1 ? ERROR : TEXT_DIM }}>
                {'> '}{line}
              </div>
            ))}
            {updateDone && !updateError && (
              <div style={{ color: ACCENT, marginTop: '0.25rem' }}>Done.</div>
            )}
          </div>
        )}
      </div>

      {loading && <p style={{ color: TEXT_DIM, fontSize: '0.875rem' }}>Loading…</p>}
      {error && <p style={{ color: ERROR, fontSize: '0.875rem' }}>{error}</p>}

      {info && (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}>
              <h3 style={{ color: TEXT_DIM, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                Server Info
              </h3>
              <CopyField label="WebSocket URL" value={info.wsUrl} />
              <CopyField label="HTTP URL" value={info.httpUrl} />

              <div style={{ marginBottom: '0.5rem' }}>
                <p style={{ color: TEXT_DIM, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>
                  Secret
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <code style={{
                    flex: 1,
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: '4px',
                    padding: '7px 10px',
                    color: TEXT,
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    letterSpacing: showSecret ? 'normal' : '0.2em',
                  }}>
                    {showSecret ? info.secret : '•'.repeat(Math.min(info.secret.length, 24))}
                  </code>
                  <button
                    onClick={() => setShowSecret(s => !s)}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${BORDER}`,
                      color: TEXT_DIM,
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {showSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: '8px',
              padding: '1.25rem',
            }}>
              <h3 style={{ color: TEXT_DIM, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                Deep Link
              </h3>
              <div style={{
                background: BG,
                border: `1px solid ${BORDER}`,
                borderRadius: '4px',
                padding: '8px 10px',
                marginBottom: '0.75rem',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start',
              }}>
                <code style={{ flex: 1, fontSize: '0.75rem', fontFamily: 'monospace', color: TEXT_DIM, wordBreak: 'break-all', lineHeight: 1.5 }}>
                  {deepLink}
                </code>
                <button
                  onClick={copyDeepLink}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${BORDER}`,
                    color: deepLinkCopied ? ACCENT : TEXT_DIM,
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'color 0.2s',
                  }}
                >
                  {deepLinkCopied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div style={{
                background: SURFACE,
                borderRadius: '8px',
                padding: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '0.5rem',
              }}>
                <p style={{ color: TEXT_DIM, fontSize: '0.75rem', fontWeight: 500 }}>Manual Entry</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ color: TEXT_DIM, fontSize: '0.78rem', minWidth: '50px' }}>URL</span>
                    <code style={{ color: TEXT, fontSize: '0.8rem', fontFamily: 'monospace' }}>{info.wsUrl}</code>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ color: TEXT_DIM, fontSize: '0.78rem', minWidth: '50px' }}>Secret</span>
                    <code style={{ color: showSecret ? TEXT : TEXT_DIM, fontSize: '0.8rem', fontFamily: 'monospace', letterSpacing: showSecret ? 'normal' : '0.15em' }}>
                      {showSecret ? info.secret : '••••••••'}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: '8px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            minWidth: '300px',
          }}>
            <h3 style={{ color: TEXT, fontSize: '1rem', fontWeight: 600, alignSelf: 'flex-start' }}>
              Scan to Connect
            </h3>
            {deepLink && (
              <QRCodeImg value={deepLink} size={280} dark="#F0EDE8" light="#0D0B08" />
            )}
            <ol style={{ color: TEXT_DIM, fontSize: '0.82rem', paddingLeft: '1.25rem', lineHeight: 1.8, alignSelf: 'flex-start' }}>
              <li>Install the Companion app</li>
              <li>Open your phone camera</li>
              <li>Scan the QR code</li>
              <li>App opens and connects automatically</li>
            </ol>
          </div>

          <div style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: '8px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            minWidth: '300px',
          }}>
            <h3 style={{ color: TEXT, fontSize: '1rem', fontWeight: 600, alignSelf: 'flex-start' }}>
              Download Android App
            </h3>
            <QRCodeImg value={`${info.httpUrl}/download/apk`} size={200} dark="#F0EDE8" light="#0D0B08" />
            <p style={{ color: TEXT_DIM, fontSize: '0.82rem', lineHeight: 1.6, alignSelf: 'flex-start' }}>
              Scan with your phone camera — downloads the APK directly to your phone.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
