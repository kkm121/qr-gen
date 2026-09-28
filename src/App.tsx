import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { AnimatePresence } from 'framer-motion';
import Preloader from './components/Preloader';
import QrStage from './components/QrStage';

// three.js is heavy — split it into its own chunk so first paint stays fast.
const ParticleField = lazy(() => import('./components/ParticleField'));
import {
  DEFAULT_FIELDS,
  DEFAULT_OPTIONS,
  PRESETS,
  TYPE_LABELS,
  buildPayload,
  clearRecents,
  contrastRatio,
  deleteRecent,
  getScanWarnings,
  isValidHex,
  loadRecents,
  pushRecent,
  timeAgo,
  validateInputs,
  validateOptions,
  type ECLevel,
  type QRType,
  type QROptions,
  type RecentItem,
  type TypeFields,
} from './lib/qr';

const TYPE_ORDER: QRType[] = ['url', 'text', 'email', 'phone', 'wifi'];
const STATE_KEY = 'gdg-qr-state-v1';
const THEME_KEY = 'gdg-qr-theme';

function loadState(): { type: QRType; fields: TypeFields; options: QROptions } | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    return {
      type: TYPE_ORDER.includes(p.type) ? p.type : 'url',
      fields: { ...DEFAULT_FIELDS, ...(p.fields ?? {}) },
      options: { ...DEFAULT_OPTIONS, ...(p.options ?? {}), logoDataUrl: null },
    };
  } catch {
    return null;
  }
}

export default function App() {
  const restored = useMemo(loadState, []);
  const [qrType, setQrType] = useState<QRType>(restored?.type ?? 'url');
  const [fields, setFields] = useState<TypeFields>(restored?.fields ?? DEFAULT_FIELDS);
  const [options, setOptions] = useState<QROptions>(restored?.options ?? DEFAULT_OPTIONS);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentItem[]>(() => loadRecents());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const t = localStorage.getItem(THEME_KEY);
      if (t === 'dark' || t === 'light') return t;
    } catch { /* ignore */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string>('');
  const [booted, setBooted] = useState(false);
  const dismissBoot = useCallback(() => setBooted(true), []);

  // Hard fallback so the loader can never trap the UI.
  useEffect(() => {
    const t = window.setTimeout(() => setBooted(true), 5000);
    return () => window.clearTimeout(t);
  }, []);

  const previewRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  const payload = useMemo(() => buildPayload(qrType, fields), [qrType, fields]);
  const inputErrors = useMemo(() => validateInputs(qrType, fields), [qrType, fields]);
  const optionErrors = useMemo(() => validateOptions(options), [options]);
  const allErrors = useMemo(() => [...inputErrors, ...optionErrors], [inputErrors, optionErrors]);
  const isValid = allErrors.length > 0 ? false : payload.length > 0;
  const warnings = useMemo(
    () => (payload ? getScanWarnings(payload, options) : []),
    [payload, options],
  );
  const ratio = useMemo(() => contrastRatio(options.fg, options.bg), [options.fg, options.bg]);

  // theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch { /* ignore */ }
  }, [theme]);

  // persist editor state
  useEffect(() => {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({ type: qrType, fields, options: { ...options, logoDataUrl: null } }));
    } catch { /* ignore */ }
  }, [qrType, fields, options]);

  // create QR instance once
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    el.innerHTML = '';
    const qr = new QRCodeStyling({
      width: options.size,
      height: options.size,
      data: payload || 'https://gdgsrm.com',
      margin: options.margin * 4,
      qrOptions: { errorCorrectionLevel: options.ec },
      backgroundOptions: { color: options.bg },
      imageOptions: { hideBackgroundDots: true, imageSize: options.logoSize, margin: 4, crossOrigin: 'anonymous' },
      dotsOptions: { type: options.dotType, color: options.fg },
      cornersSquareOptions: { type: options.cornerSquare, color: options.fg },
      cornersDotOptions: { type: options.cornerDot, color: options.fg },
    });
    qr.append(el);
    qrRef.current = qr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // live update (and re-mount into the stage when it remounts)
  useEffect(() => {
    const qr = qrRef.current;
    const el = previewRef.current;
    if (!qr || !el) return;
    const data = payload || 'placeholder';
    qr.update({
      data,
      width: options.size,
      height: options.size,
      margin: options.margin * 4,
      qrOptions: { errorCorrectionLevel: options.ec },
      backgroundOptions: { color: isValidHex(options.bg) ? options.bg : '#ffffff' },
      image: options.logoDataUrl || undefined,
      imageOptions: { hideBackgroundDots: true, imageSize: options.logoSize, margin: 4, crossOrigin: 'anonymous' },
      dotsOptions: options.useGradient
        ? {
            type: options.dotType,
            gradient: {
              type: 'linear',
              rotation: 45,
              colorStops: [
                { offset: 0, color: isValidHex(options.fg) ? options.fg : '#111111' },
                { offset: 1, color: isValidHex(options.gradientTo) ? options.gradientTo : '#0b57d0' },
              ],
            },
          }
        : { type: options.dotType, color: isValidHex(options.fg) ? options.fg : '#111111' },
      cornersSquareOptions: { type: options.cornerSquare, color: isValidHex(options.fg) ? options.fg : '#111111' },
      cornersDotOptions: { type: options.cornerDot, color: isValidHex(options.fg) ? options.fg : '#111111' },
    });
    if (el.childElementCount === 0 && isValid) qr.append(el);
  }, [payload, options, isValid]);

  // auto-save recents (debounced)
  useEffect(() => {
    if (!isValid) return;
    const t = setTimeout(() => {
      setRecents(pushRecent({ type: qrType, payload, options: { ...options } }));
    }, 1200);
    return () => clearTimeout(t);
  }, [payload, qrType, isValid, options]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2600);
  }

  function setPatch(p: Partial<QROptions>) {
    setOptions((o) => ({ ...o, ...p }));
  }

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setOptions((o) => ({ ...o, ...p.patch }));
    setActivePreset(id);
    flash(`Preset "${p.name}" applied — tweak freely.`);
  }

  function onLogoFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      flash('Logo must be an image file.');
      return;
    }
    if (f.size > 1024 * 1024) {
      flash('Logo should be under 1 MB for reliable scanning.');
    }
    const r = new FileReader();
    r.onload = () => {
      setPatch({ logoDataUrl: String(r.result) });
      setLogoName(f.name);
      if (options.ec !== 'H') setPatch({ ec: 'H' as ECLevel, logoDataUrl: String(r.result) });
      flash('Logo added. Error correction bumped to H.');
    };
    r.readAsDataURL(f);
  }

  function download(ext: 'png' | 'svg') {
    if (!isValid) {
      flash('Fix validation errors before downloading.');
      return;
    }
    qrRef.current?.download({ name: `gdg-qr-${qrType}-${options.size}px`, extension: ext }).catch(() => {
      // fallback: canvas toDataURL
      const canvas = previewRef.current?.querySelector('canvas');
      if (canvas && ext === 'png') {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `gdg-qr-${qrType}.png`;
        a.click();
      } else flash('Download failed in this browser. Try Chrome/Edge.');
    });
    flash(`Downloaded ${ext.toUpperCase()} at ${options.size}px.`);
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(payload);
      flash('QR content copied to clipboard.');
    } catch {
      flash('Clipboard blocked. Select the payload text manually.');
    }
  }

  async function copyImage() {
    try {
      const canvas = previewRef.current?.querySelector('canvas');
      if (!canvas) throw new Error('no canvas');
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('encode failed');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      flash('QR image copied to clipboard.');
    } catch {
      flash('Image copy not supported here. Use Download PNG.');
    }
  }

  function loadRecent(r: RecentItem) {
    setQrType(r.type);
    setOptions({ ...r.options, logoDataUrl: null });
    setActivePreset(null);
    // try to reverse-fill simple fields for convenience
    try {
      if (r.type === 'url' || r.type === 'text') {
        setFields((f) => ({ ...f, url: { url: r.payload }, text: { text: r.payload } }));
      }
    } catch { /* ignore */ }
    flash(`Loaded recent ${TYPE_LABELS[r.type]} code.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateField<K extends QRType>(t: K, patch: Partial<TypeFields[K]>) {
    setFields((f) => ({ ...f, [t]: { ...f[t], ...patch } }));
  }

  return (
    <div className="page">
      <AnimatePresence>{!booted && <Preloader onDone={dismissBoot} />}</AnimatePresence>
      <Suspense fallback={null}>
        <ParticleField />
      </Suspense>
      <header className="topbar">
        <div className="brand">
          <span className="gdg-dots" aria-hidden="true">
            <i className="dot blue" /><i className="dot red" /><i className="dot yellow" /><i className="dot green" />
          </span>
          <div>
            <p className="kicker">Realtime QR Atelier · Encode — Design — Export</p>
            <h1>
              QR <em>Atelier</em> — turn anything
              <br />
              into a scannable object.
            </h1>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn ghost" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-label="Toggle theme">
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </header>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k}>
              REALTIME ENCODE · FIVE QR TYPES · ERROR CORRECTION · PRESETS · PNG + SVG EXPORT · SCAN-SAFE BY DESIGN · NO BACKEND ·&nbsp;
            </span>
          ))}
        </div>
      </div>

      {notice && <div className="toast" role="status">{notice}</div>}

      <main className="layout">
        {/* Controls */}
        <section className="card controls" aria-label="QR controls">
          <h2>1 · Content type</h2>
          <div className="tabs" role="tablist" aria-label="QR types">
            {TYPE_ORDER.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={qrType === t}
                className={`tab ${qrType === t ? 'active' : ''}`}
                onClick={() => setQrType(t)}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="form">
            {qrType === 'url' && (
              <label className="field">
                <span>Website URL</span>
                <input
                  value={fields.url.url}
                  onChange={(e) => updateField('url', { url: e.target.value })}
                  placeholder="https://example.com"
                  inputMode="url"
                />
                <small>Scheme is auto-added. Example: gdgsrm.com → https://gdgsrm.com</small>
              </label>
            )}
            {qrType === 'text' && (
              <label className="field">
                <span>Plain text (max 2000)</span>
                <textarea
                  value={fields.text.text}
                  onChange={(e) => updateField('text', { text: e.target.value })}
                  rows={4}
                  placeholder="Type anything…"
                />
                <small>{fields.text.text.length}/2000</small>
              </label>
            )}
            {qrType === 'email' && (
              <>
                <label className="field">
                  <span>To</span>
                  <input value={fields.email.to} onChange={(e) => updateField('email', { to: e.target.value })} placeholder="you@example.com" inputMode="email" />
                </label>
                <label className="field">
                  <span>Subject (optional)</span>
                  <input value={fields.email.subject} onChange={(e) => updateField('email', { subject: e.target.value })} placeholder="Hello" />
                </label>
                <label className="field">
                  <span>Body (optional)</span>
                  <textarea value={fields.email.body} onChange={(e) => updateField('email', { body: e.target.value })} rows={3} />
                </label>
              </>
            )}
            {qrType === 'phone' && (
              <label className="field">
                <span>Phone number</span>
                <input value={fields.phone.phone} onChange={(e) => updateField('phone', { phone: e.target.value })} placeholder="+919876543210" inputMode="tel" />
                <small>Encoded as <code>tel:</code>. 7–15 digits.</small>
              </label>
            )}
            {qrType === 'wifi' && (
              <>
                <label className="field">
                  <span>Network name (SSID)</span>
                  <input value={fields.wifi.ssid} onChange={(e) => updateField('wifi', { ssid: e.target.value })} placeholder="GDG-SRM" />
                </label>
                <div className="row2">
                  <label className="field">
                    <span>Security</span>
                    <select value={fields.wifi.encryption} onChange={(e) => updateField('wifi', { encryption: e.target.value as 'WPA' | 'WEP' | 'nopass' })}>
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">Open (no password)</option>
                    </select>
                  </label>
                  <label className="field check">
                    <span>Hidden network</span>
                    <input type="checkbox" checked={fields.wifi.hidden} onChange={(e) => updateField('wifi', { hidden: e.target.checked })} />
                  </label>
                </div>
                {fields.wifi.encryption !== 'nopass' && (
                  <label className="field">
                    <span>Password</span>
                    <input value={fields.wifi.password} onChange={(e) => updateField('wifi', { password: e.target.value })} placeholder="••••••••" autoComplete="off" />
                  </label>
                )}
                <small>Encoded as <code>WIFI:T:...;S:...;P:...;;</code> for camera apps.</small>
              </>
            )}
          </div>

          {inputErrors.length > 0 && (
            <div className="errors" role="alert">
              <strong>Fix these:</strong>
              <ul>{inputErrors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}

          <h2>2 · Design</h2>
          <div className="presets">
            {PRESETS.map((p) => (
              <button key={p.id} className={`preset ${activePreset === p.id ? 'active' : ''}`} onClick={() => applyPreset(p.id)} title={p.description}>
                <span className="swatches">
                  <i style={{ background: p.patch.fg }} /><i style={{ background: p.patch.bg, border: '1px solid #ccc' }} />
                </span>
                {p.name}
              </button>
            ))}
          </div>

          <div className="grid2">
            <label className="field">
              <span>Size: {options.size}px</span>
              <input type="range" min={128} max={1024} step={8} value={options.size} onChange={(e) => { setPatch({ size: Number(e.target.value) }); setActivePreset(null); }} />
            </label>
            <label className="field">
              <span>Margin: {options.margin}</span>
              <input type="range" min={0} max={10} step={1} value={options.margin} onChange={(e) => { setPatch({ margin: Number(e.target.value) }); setActivePreset(null); }} />
            </label>
          </div>

          <div className="grid2">
            <label className="field">
              <span>Foreground</span>
              <div className="colorrow">
                <input type="color" value={isValidHex(options.fg) ? options.fg : '#111111'} onChange={(e) => { setPatch({ fg: e.target.value }); setActivePreset(null); }} />
                <input value={options.fg} onChange={(e) => { setPatch({ fg: e.target.value }); setActivePreset(null); }} spellCheck={false} />
              </div>
            </label>
            <label className="field">
              <span>Background</span>
              <div className="colorrow">
                <input type="color" value={isValidHex(options.bg) ? options.bg : '#ffffff'} onChange={(e) => { setPatch({ bg: e.target.value }); setActivePreset(null); }} />
                <input value={options.bg} onChange={(e) => { setPatch({ bg: e.target.value }); setActivePreset(null); }} spellCheck={false} />
              </div>
            </label>
          </div>

          <div className="grid2">
            <label className="field">
              <span>Error correction</span>
              <select value={options.ec} onChange={(e) => { setPatch({ ec: e.target.value as ECLevel }); setActivePreset(null); }}>
                <option value="L">L — smallest, fragile</option>
                <option value="M">M — balanced</option>
                <option value="Q">Q — sturdy</option>
                <option value="H">H — best with logo</option>
              </select>
            </label>
            <label className="field">
              <span>Dot style</span>
              <select value={options.dotType} onChange={(e) => { setPatch({ dotType: e.target.value as QROptions['dotType'] }); setActivePreset(null); }}>
                <option value="square">Square</option>
                <option value="rounded">Rounded</option>
                <option value="dots">Dots</option>
                <option value="classy">Classy</option>
                <option value="classy-rounded">Classy rounded</option>
                <option value="extra-rounded">Extra rounded</option>
              </select>
            </label>
          </div>

          <div className="grid2">
            <label className="field">
              <span>Corner squares</span>
              <select value={options.cornerSquare} onChange={(e) => { setPatch({ cornerSquare: e.target.value as QROptions['cornerSquare'] }); setActivePreset(null); }}>
                <option value="square">Square</option>
                <option value="extra-rounded">Rounded</option>
                <option value="dot">Dot</option>
              </select>
            </label>
            <label className="field">
              <span>Corner dots</span>
              <select value={options.cornerDot} onChange={(e) => { setPatch({ cornerDot: e.target.value as QROptions['cornerDot'] }); setActivePreset(null); }}>
                <option value="square">Square</option>
                <option value="dot">Dot</option>
              </select>
            </label>
          </div>

          <label className="field checkrow">
            <input type="checkbox" checked={options.useGradient} onChange={(e) => { setPatch({ useGradient: e.target.checked }); setActivePreset(null); }} />
            <span>Gradient dots ({options.fg} → {options.gradientTo})</span>
            {options.useGradient && (
              <span className="colorrow inline">
                <input type="color" value={isValidHex(options.gradientTo) ? options.gradientTo : '#0b57d0'} onChange={(e) => setPatch({ gradientTo: e.target.value })} />
                <input value={options.gradientTo} onChange={(e) => setPatch({ gradientTo: e.target.value })} spellCheck={false} />
              </span>
            )}
          </label>

          <div className="field">
            <span>Logo overlay (optional)</span>
            <div className="colorrow">
              <input type="file" accept="image/*" onChange={(e) => onLogoFile(e.target.files?.[0])} />
              {options.logoDataUrl && <button className="btn ghost small" onClick={() => { setPatch({ logoDataUrl: null }); setLogoName(''); }}>Remove</button>}
            </div>
            {logoName && <small>{logoName} · keep EC at Q/H</small>}
            {options.logoDataUrl && (
              <label className="field">
                <span>Logo size: {Math.round(options.logoSize * 100)}%</span>
                <input type="range" min={0.2} max={0.5} step={0.01} value={options.logoSize} onChange={(e) => setPatch({ logoSize: Number(e.target.value) })} />
              </label>
            )}
          </div>

          {optionErrors.length > 0 && (
            <div className="errors" role="alert">
              <ul>{optionErrors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}

          <div className="contrast">
            Contrast <strong>{ratio.toFixed(2)}:1</strong>
            <span className={`pill ${ratio >= 4.5 ? 'ok' : ratio >= 3 ? 'mid' : 'bad'}`}>
              {ratio >= 4.5 ? 'excellent' : ratio >= 3 ? 'okay' : 'poor'}
            </span>
          </div>
        </section>

        {/* Preview */}
        <section className="card preview" aria-label="QR preview">
          <h2>3 · Live preview</h2>
          {!isValid ? (
            <div className="preview-empty">
              <p>Enter valid content to generate the QR.</p>
              <ul>{allErrors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          ) : (
            <QrStage
              hostRef={previewRef}
              size={options.size}
              ec={options.ec}
              ratio={ratio.toFixed(2)}
              payloadLen={payload.length}
              valid={isValid}
            />
          )}

          <div className="payload">
            <span>Encoded payload ({payload.length} chars)</span>
            <code>{payload || '—'}</code>
          </div>

          {warnings.length > 0 && (
            <div className="warnings" role="status">
              <strong>Scan reliability</strong>
              <ul>
                {warnings.map((w, i) => (
                  <li key={i} className={w.level}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="actions">
            <button className="btn primary" disabled={!isValid} onClick={() => download('png')}>Download PNG</button>
            <button className="btn" disabled={!isValid} onClick={() => download('svg')}>Download SVG</button>
            <button className="btn ghost" disabled={!isValid} onClick={copyText}>Copy text</button>
            <button className="btn ghost" disabled={!isValid} onClick={copyImage}>Copy image</button>
          </div>
          <small className="hint">PNG exports at exactly {options.size}×{options.size}px — what you see is what you download. Verify by scanning with your phone camera.</small>

          <h2>4 · Recent codes (saved locally)</h2>
          {recents.length === 0 ? (
            <p className="muted">No recents yet. Valid codes auto-save here and survive refresh.</p>
          ) : (
            <>
              <ul className="recents">
                {recents.map((r) => (
                  <li key={r.id}>
                    <div>
                      <strong>{TYPE_LABELS[r.type]}</strong>
                      <span className="muted"> · {timeAgo(r.createdAt)}</span>
                      <div className="snippet">{r.payload.slice(0, 80)}{r.payload.length > 80 ? '…' : ''}</div>
                    </div>
                    <div className="recent-btns">
                      <button className="btn ghost small" onClick={() => loadRecent(r)}>Reuse</button>
                      <button className="btn ghost small danger" onClick={() => setRecents(deleteRecent(r.id))}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="btn ghost small" onClick={() => setRecents(clearRecents())}>Clear all recents</button>
            </>
          )}

          <details className="testing">
            <summary>Self-test checklist (from task doc)</summary>
            <ul>
              <li>All 5 types generate + scan with phone camera</li>
              <li>Size / colors / EC / margin update preview instantly</li>
              <li>PNG matches preview; SVG opens in browser</li>
              <li>Invalid URL, email, phone, empty SSID show errors and block download</li>
              <li>Refresh keeps recents + last editor state</li>
              <li>375px mobile + 1440px desktop, no overflow</li>
              <li>Low-contrast + logo-on-L-EC raise warnings</li>
            </ul>
          </details>
        </section>
      </main>

      <footer className="footer">
        <span>Built for GDG on Campus SRM 2026-27 · React + TypeScript · 100% client-side, no backend</span>
      </footer>
    </div>
  );
}
