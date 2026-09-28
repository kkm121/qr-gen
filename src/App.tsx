import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { AnimatePresence, motion } from 'framer-motion';
import Preloader from './components/Preloader';
import QrStage from './components/QrStage';
import CursorGlow from './components/CursorGlow';
import { sounds } from './lib/sound';

const LiquidBackdrop = lazy(() => import('./components/LiquidBackdrop'));

import {
  DEFAULT_FIELDS,
  DEFAULT_OPTIONS,
  PRESETS,
  TYPE_LABELS,
  buildPayload,
  contrastRatio,
  isValidHex,
  timeAgo,
  validateInputs,
  validateOptions,
  type ECLevel,
  type QRType,
  type QROptions,
  type RecentItem,
  type TypeFields,
} from './lib/qr';
import {
  dbGetRecents,
  dbSaveRecent,
  dbDeleteRecent,
  dbClearRecents,
  dbExportJSON,
} from './lib/db';
import {
  IconUrl,
  IconText,
  IconEmail,
  IconPhone,
  IconWifi,
  IconDownload,
  IconVector,
  IconCopy,
  IconImage,
  IconTrash,
  IconDatabase,
  IconSun,
  IconMoon,
  IconLock,
  IconSubject,
  IconInfo,
  IconExport,
} from './components/Icons';

const TYPE_ORDER: QRType[] = ['url', 'text', 'email', 'phone', 'wifi'];
const STATE_KEY = 'qr-studio-state-v5';
const THEME_KEY = 'qr-studio-theme-v5';

interface ExampleItem {
  label: string;
  type: QRType;
  fields: Partial<TypeFields>;
}

const EXAMPLES: ExampleItem[] = [
  {
    label: 'Website',
    type: 'url',
    fields: { url: { url: 'https://apple.com' } },
  },
  {
    label: 'Wi-Fi Network',
    type: 'wifi',
    fields: {
      wifi: {
        ssid: 'Office_Guest_5G',
        password: 'secure-passphrase-2026',
        encryption: 'WPA',
        hidden: false,
      },
    },
  },
  {
    label: 'Contact Email',
    type: 'email',
    fields: {
      email: {
        to: 'contact@example.com',
        subject: 'Project Inquiry',
        body: 'Hello, I would like more information on your services.',
      },
    },
  },
  {
    label: 'Phone Contact',
    type: 'phone',
    fields: { phone: { phone: '+1 555 019 2834' } },
  },
  {
    label: 'Plain Text',
    type: 'text',
    fields: { text: { text: 'QR Studio. Precision Vector QR Code Studio.' } },
  },
];

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
  const restored = useMemo(() => loadState(), []);
  const [qrType, setQrType] = useState<QRType>(restored?.type ?? 'url');
  const [fields, setFields] = useState<TypeFields>(restored?.fields ?? DEFAULT_FIELDS);
  const [options, setOptions] = useState<QROptions>(restored?.options ?? DEFAULT_OPTIONS);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(() => sounds.isEnabled());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const t = localStorage.getItem(THEME_KEY);
      if (t === 'dark' || t === 'light') return t;
    } catch {
      /* ignore */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [notice, setNotice] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string>('');
  const [booted, setBooted] = useState(false);
  const [introPhase, setIntroPhase] = useState<'loading' | 'title' | 'studio'>('loading');

  const dismissBoot = useCallback(() => {
    setBooted(true);
    setIntroPhase('title');
    sounds.playJump();

    // 1.45s GTA V style 3D flip, mid-air pause, and seamless anime transition
    setTimeout(() => {
      setIntroPhase('studio');
      // Synchronized acoustic landing thuds when Card 1 and Card 2 slam into place
      setTimeout(() => sounds.playLand(), 810);
      setTimeout(() => sounds.playLand(), 1600);
    }, 1450);
  }, []);

  const [trickKey, setTrickKey] = useState(0);
  const [celebrateKey, setCelebrateKey] = useState(0);

  const previewRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  const payload = useMemo(() => buildPayload(qrType, fields), [qrType, fields]);
  const inputErrors = useMemo(() => validateInputs(qrType, fields), [qrType, fields]);
  const optionErrors = useMemo(() => validateOptions(options), [options]);
  const allErrors = useMemo(() => [...inputErrors, ...optionErrors], [inputErrors, optionErrors]);
  const isValid = allErrors.length === 0 && payload.length > 0;
  const ratio = useMemo(() => contrastRatio(options.fg, options.bg), [options.fg, options.bg]);

  // Sync theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // Persist form state
  useEffect(() => {
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({ type: qrType, fields, options: { ...options, logoDataUrl: null } })
      );
    } catch {
      /* ignore */
    }
  }, [qrType, fields, options]);

  // Load recent generations from IndexedDB on mount
  useEffect(() => {
    let active = true;
    dbGetRecents().then((list) => {
      if (active) setRecents(list);
    });
    return () => {
      active = false;
    };
  }, []);

  // Update QR dynamically & ensure instance is attached
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    if (!qrRef.current) {
      el.innerHTML = '';
      const qr = new QRCodeStyling({
        width: options.size,
        height: options.size,
        data: payload || 'https://apple.com',
        margin: options.margin * 4,
        qrOptions: { errorCorrectionLevel: options.ec },
        backgroundOptions: { color: isValidHex(options.bg) ? options.bg : '#ffffff' },
        dotsOptions: { type: options.dotType, color: isValidHex(options.fg) ? options.fg : '#111111' },
      });
      qr.append(el);
      qrRef.current = qr;
    }

    const qr = qrRef.current;
    const data = payload || 'https://apple.com';
    qr.update({
      data,
      width: options.size,
      height: options.size,
      margin: options.margin * 4,
      qrOptions: { errorCorrectionLevel: options.ec },
      backgroundOptions: { color: isValidHex(options.bg) ? options.bg : '#ffffff' },
      image: options.logoDataUrl || undefined,
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: options.logoSize,
        margin: 4,
        crossOrigin: 'anonymous',
      },
      dotsOptions: options.useGradient
        ? {
            type: options.dotType,
            gradient: {
              type: 'linear',
              rotation: 45,
              colorStops: [
                { offset: 0, color: isValidHex(options.fg) ? options.fg : '#111111' },
                {
                  offset: 1,
                  color: isValidHex(options.gradientTo) ? options.gradientTo : '#0b57d0',
                },
              ],
            },
          }
        : { type: options.dotType, color: isValidHex(options.fg) ? options.fg : '#111111' },
      cornersSquareOptions: {
        type: options.cornerSquare,
        color: isValidHex(options.fg) ? options.fg : '#111111',
      },
      cornersDotOptions: {
        type: options.cornerDot,
        color: isValidHex(options.fg) ? options.fg : '#111111',
      },
    });

    if (el.childElementCount === 0 && isValid) {
      qr.append(el);
    }
  }, [payload, options, isValid]);

  // Debounced auto-save to IndexedDB database
  useEffect(() => {
    if (!isValid || !payload) return;
    const t = setTimeout(() => {
      dbSaveRecent({ type: qrType, payload, options: { ...options } }).then((updated) => {
        setRecents(updated);
      });
    }, 1400);
    return () => clearTimeout(t);
  }, [payload, qrType, isValid, options]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  function setPatch(p: Partial<QROptions>) {
    setOptions((o) => ({ ...o, ...p }));
  }

  function triggerJump() {
    setTrickKey((k) => k + 1);
  }

  function applyPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    sounds.playTap();
    setOptions((o) => ({ ...o, ...p.patch }));
    setActivePreset(id);
    triggerJump();
    flash(`Preset "${p.name}" applied.`);
  }

  function loadExample(ex: ExampleItem) {
    sounds.playTap();
    setQrType(ex.type);
    setFields((f) => ({ ...f, ...ex.fields }));
    triggerJump();
    flash(`Loaded ${ex.label} example.`);
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
      setPatch({ logoDataUrl: String(r.result), ec: 'H' });
      setLogoName(f.name);
      triggerJump();
      flash('Logo applied. Error correction set to Level H.');
    };
    r.readAsDataURL(f);
  }

  async function download(ext: 'png' | 'svg') {
    if (!isValid || !payload) {
      flash('Please enter valid content before downloading.');
      return;
    }

    const filename = `qr-${qrType}-${options.size}px.${ext}`;

    // Tier 1: Direct QRCodeStyling built-in download
    try {
      if (qrRef.current) {
        await qrRef.current.download({ name: `qr-${qrType}-${options.size}px`, extension: ext });
        sounds.playDownloadChime();
        flash(`Exported ${ext.toUpperCase()} (${options.size}×${options.size}px).`);
        setCelebrateKey((k) => k + 1);
        return;
      }
    } catch (err) {
      console.warn('Direct download attempt failed, falling back to DOM extraction:', err);
    }

    // Tier 2: Direct DOM Canvas / SVG extraction fallback
    try {
      const container = previewRef.current;
      if (!container) throw new Error('Preview container not mounted');

      if (ext === 'png') {
        const canvas = container.querySelector('canvas');
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          sounds.playDownloadChime();
          flash(`Exported PNG (${options.size}×${options.size}px).`);
          setCelebrateKey((k) => k + 1);
          return;
        }
      }

      if (ext === 'svg') {
        const svg = container.querySelector('svg');
        if (svg) {
          const serializer = new XMLSerializer();
          const svgStr = serializer.serializeToString(svg);
          const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          sounds.playDownloadChime();
          flash(`Exported SVG Vector.`);
          setCelebrateKey((k) => k + 1);
          return;
        }
      }

      // Tier 3: Off-screen QRCodeStyling instance fallback
      const tempQr = new QRCodeStyling({
        width: options.size,
        height: options.size,
        data: payload,
        margin: options.margin * 4,
        qrOptions: { errorCorrectionLevel: options.ec },
        backgroundOptions: { color: isValidHex(options.bg) ? options.bg : '#ffffff' },
        dotsOptions: { type: options.dotType, color: isValidHex(options.fg) ? options.fg : '#111111' },
      });
      await tempQr.download({ name: `qr-${qrType}-${options.size}px`, extension: ext });
      sounds.playDownloadChime();
      flash(`Exported ${ext.toUpperCase()}.`);
      setCelebrateKey((k) => k + 1);
    } catch (e) {
      console.error('Download failed entirely:', e);
      flash('Download could not be initiated in this browser.');
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(payload);
      sounds.playTap();
      flash('Payload copied to clipboard.');
    } catch {
      flash('Clipboard access restricted.');
    }
  }

  async function copyImage() {
    try {
      const canvas = previewRef.current?.querySelector('canvas');
      if (!canvas) throw new Error('no canvas');
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('encode failed');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      sounds.playTap();
      flash('QR Image copied to clipboard.');
    } catch {
      flash('Image copy unsupported in this browser.');
    }
  }

  function loadRecent(r: RecentItem) {
    sounds.playTap();
    setQrType(r.type);
    setOptions({ ...r.options, logoDataUrl: null });
    setActivePreset(null);
    try {
      if (r.type === 'url' || r.type === 'text') {
        setFields((f) => ({ ...f, url: { url: r.payload }, text: { text: r.payload } }));
      }
    } catch {
      /* ignore */
    }
    triggerJump();
    flash(`Restored recent ${TYPE_LABELS[r.type]} configuration.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDeleteRecent(id: string) {
    sounds.playTap();
    const updated = await dbDeleteRecent(id);
    setRecents(updated);
    flash('Record removed.');
  }

  async function handleClearRecents() {
    sounds.playTap();
    await dbClearRecents();
    setRecents([]);
    flash('Recent generations cleared.');
  }

  async function handleExportDB() {
    sounds.playTap();
    const jsonStr = await dbExportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-studio-database-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash('Exported database archive.');
  }

  function updateField<K extends QRType>(t: K, patch: Partial<TypeFields[K]>) {
    setFields((f) => ({ ...f, [t]: { ...f[t], ...patch } }));
  }

  return (
    <div className="page">
      {/* Clean Luxury Studio Preloader */}
      <AnimatePresence>{!booted && <Preloader onDone={dismissBoot} />}</AnimatePresence>

      {/* Vibrant Luminous Blue Liquid Glass Aurora Backdrop */}
      <Suspense fallback={null}>
        <LiquidBackdrop />
      </Suspense>

      <CursorGlow />

      {/* GTA V Keynote Title Slide Entrance */}
      <AnimatePresence>
        {introPhase === 'title' && (
          <motion.div
            className="gta-presentation-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 1.04,
              transition: { duration: 0.16, ease: 'easeOut' },
            }}
          >
            <motion.div
              className="gta-title-card"
              initial={{
                opacity: 0,
                scale: 0.25,
                rotateX: 70,
                rotateY: -35,
                z: -400,
              }}
              animate={{
                opacity: [0, 1, 1],
                scale: [0.25, 1.15, 1.0],
                rotateX: [70, -8, 0],
                rotateY: [-35, 10, 0],
                z: [-400, 20, 0],
              }}
              transition={{
                duration: 1.25,
                times: [0, 0.55, 1],
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="gta-presenter-banner">
                <span>STUDIO RELEASE</span>
              </div>
              <h1 className="gta-headline">
                QR Studio<span className="gta-accent">.</span>
              </h1>
              <p className="gta-subline">Precision Vector Engine</p>
              <div className="gta-meta-strip">
                <span className="gta-tag">Client Database</span>
                <span className="gta-dot">•</span>
                <span className="gta-tag">Vector SVG & PNG</span>
                <span className="gta-dot">•</span>
                <span className="gta-tag">Offline Ready</span>
              </div>
              <div className="gta-specular-flash" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Island Floating Header */}
      <motion.header
        className="dynamic-island-header"
        initial={{ y: -60, rotateX: -30, opacity: 0 }}
        animate={
          introPhase === 'studio'
            ? { y: 0, rotateX: 0, opacity: 1 }
            : { y: -60, rotateX: -30, opacity: 0 }
        }
        transition={{ type: 'spring', stiffness: 340, damping: 24, delay: 0.02 }}
      >
        <div className="dynamic-island-inner">
          <div className="island-brand">
            <span className="island-gdg-dots" aria-hidden="true">
              <i className="dot blue" />
              <i className="dot red" />
              <i className="dot yellow" />
              <i className="dot green" />
            </span>
            <div className="island-title-block">
              <span className="island-kicker">QR Studio</span>
              <span className="island-title">Studio Edition</span>
            </div>
          </div>

          <div className="island-status-pill" aria-label="System status">
            <span className="pulse-indicator" />
            <span>Client Engine</span>
          </div>

          <div className="island-controls">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`island-btn ${soundEnabled ? 'active' : ''}`}
              onClick={() => {
                const nowOn = sounds.toggle();
                setSoundEnabled(nowOn);
                flash(nowOn ? 'Audio: Active' : 'Audio: Muted');
              }}
              title="Toggle Audio Feedback"
            >
              <span className="sound-waves">
                <i />
                <i />
                <i />
              </span>
              <span>{soundEnabled ? 'Sound ON' : 'Muted'}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="island-btn theme-toggle"
              onClick={() => {
                sounds.playTap();
                setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
              }}
              title="Toggle Theme"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {theme === 'dark' ? <IconSun /> : <IconMoon />}
                <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Main Studio Title (Settled) */}
      <motion.section
        className="hero-presentation"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={
          introPhase === 'studio'
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: -20, scale: 0.95 }
        }
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
      >
        <h1 className="hero-headline">
          QR Studio<span className="headline-gradient">. Precision Vector Engine.</span>
        </h1>
      </motion.section>

      {notice && (
        <motion.div
          className="apple-notification-pill"
          initial={{ opacity: 0, y: 20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          role="status"
        >
          <span className="notification-icon">
            <IconInfo />
          </span>
          <span>{notice}</span>
        </motion.div>
      )}

      {/* Perfectly Balanced & Centered Main Grid */}
      <motion.main
        className="layout"
        initial={{ opacity: 0 }}
        animate={introPhase === 'studio' ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.25, delay: 0.08 }}
      >
        {/* Left Column: Input & Styling Controls (One Piece Wanted Poster Entrance: Card 1) */}
        <motion.section
          className="card controls-card"
          aria-label="QR Controls"
          initial={{
            opacity: 0,
            scale: 0.18,
            rotateY: 270,
            rotateZ: -12,
            y: -120,
          }}
          animate={
            introPhase === 'studio'
              ? {
                  opacity: [0, 1, 1, 1],
                  scale: [0.18, 1.05, 1.05, 1.0],
                  rotateY: [270, 0, 0, 0],
                  rotateZ: [-12, 0, 0, 0],
                  y: [-120, -18, -18, 0],
                }
              : {
                  opacity: 0,
                  scale: 0.18,
                  rotateY: 270,
                  rotateZ: -12,
                  y: -120,
                }
          }
          transition={{
            duration: 0.76,
            times: [0, 0.46, 0.72, 1.0],
            ease: [0.16, 1, 0.3, 1],
            delay: 0.05,
          }}
        >
          <div className="section-head">
            <span className="section-pill">01</span>
            <div>
              <h2>Content & Payload</h2>
              <span className="section-subtitle">Select type and input data</span>
            </div>
          </div>

          {/* iOS Segmented Pill Tabs */}
          <div className="ios-segmented-control" role="tablist" aria-label="QR Types">
            {TYPE_ORDER.map((t) => (
              <motion.button
                key={t}
                role="tab"
                aria-selected={qrType === t}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`segment-btn ${qrType === t ? 'selected' : ''}`}
                onClick={() => {
                  if (t !== qrType) {
                    sounds.playTap();
                    setQrType(t);
                    triggerJump();
                  }
                }}
              >
                {qrType === t && (
                  <motion.div
                    layoutId="segment-active-pill"
                    className="segment-active-indicator"
                    transition={{ type: 'spring', stiffness: 450, damping: 36 }}
                  />
                )}
                <span className="segment-text" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {t === 'url' && <><IconUrl /><span>URL</span></>}
                  {t === 'text' && <><IconText /><span>Text</span></>}
                  {t === 'email' && <><IconEmail /><span>Email</span></>}
                  {t === 'phone' && <><IconPhone /><span>Phone</span></>}
                  {t === 'wifi' && <><IconWifi /><span>Wi-Fi</span></>}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Quick Examples Shelf */}
          <div className="examples-shelf">
            <span className="examples-label">Examples:</span>
            <div className="examples-pills">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  className="example-pill-btn"
                  onClick={() => loadExample(ex)}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Form Inputs */}
          <AnimatePresence mode="wait">
            <motion.div
              key={qrType}
              className="apple-form-group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {qrType === 'url' && (
                <div className="apple-input-card">
                  <div className="input-card-header">
                    <span className="input-card-label">Website URL</span>
                    <span className="input-card-tag">AUTO-PROTOCOL</span>
                  </div>
                  <div className="glass-input-wrapper">
                    <span className="glass-input-icon">
                      <IconUrl />
                    </span>
                    <input
                      value={fields.url.url}
                      onChange={(e) => updateField('url', { url: e.target.value })}
                      placeholder="https://example.com"
                      inputMode="url"
                    />
                  </div>
                  <span className="input-card-hint">
                    Protocol is auto-normalized (e.g. <code>example.com</code> → <code>https://example.com</code>).
                  </span>
                </div>
              )}

              {qrType === 'text' && (
                <div className="apple-input-card">
                  <div className="input-card-header">
                    <span className="input-card-label">Plain Text Content</span>
                    <span className="input-card-tag">{fields.text.text.length} / 2000</span>
                  </div>
                  <div className="glass-input-wrapper textarea-wrap">
                    <textarea
                      value={fields.text.text}
                      onChange={(e) => updateField('text', { text: e.target.value })}
                      rows={4}
                      placeholder="Type any text or markdown…"
                    />
                  </div>
                </div>
              )}

              {qrType === 'email' && (
                <div className="apple-input-card group-stacked">
                  <div className="input-card-header">
                    <span className="input-card-label">Email Dispatch</span>
                    <span className="input-card-tag">MAILTO: SCHEME</span>
                  </div>
                  <div className="glass-input-wrapper">
                    <span className="glass-input-icon">
                      <IconEmail />
                    </span>
                    <input
                      value={fields.email.to}
                      onChange={(e) => updateField('email', { to: e.target.value })}
                      placeholder="contact@example.com"
                      inputMode="email"
                    />
                  </div>
                  <div className="glass-input-wrapper">
                    <span className="glass-input-icon">
                      <IconSubject />
                    </span>
                    <input
                      value={fields.email.subject}
                      onChange={(e) => updateField('email', { subject: e.target.value })}
                      placeholder="Subject (Optional)"
                    />
                  </div>
                  <div className="glass-input-wrapper textarea-wrap">
                    <textarea
                      value={fields.email.body}
                      onChange={(e) => updateField('email', { body: e.target.value })}
                      rows={3}
                      placeholder="Body message (Optional)…"
                    />
                  </div>
                </div>
              )}

              {qrType === 'phone' && (
                <div className="apple-input-card">
                  <div className="input-card-header">
                    <span className="input-card-label">Phone Direct-Dial</span>
                    <span className="input-card-tag">TEL: SCHEME</span>
                  </div>
                  <div className="glass-input-wrapper">
                    <span className="glass-input-icon">
                      <IconPhone />
                    </span>
                    <input
                      value={fields.phone.phone}
                      onChange={(e) => updateField('phone', { phone: e.target.value })}
                      placeholder="+1 555 019 2834"
                      inputMode="tel"
                    />
                  </div>
                  <span className="input-card-hint">
                    Formatted as direct dial link for camera scanning.
                  </span>
                </div>
              )}

              {qrType === 'wifi' && (
                <div className="apple-input-card group-stacked">
                  <div className="input-card-header">
                    <span className="input-card-label">Wi-Fi Credentials</span>
                    <span className="input-card-tag">AUTO-JOIN</span>
                  </div>
                  <div className="glass-input-wrapper">
                    <span className="glass-input-icon">
                      <IconWifi />
                    </span>
                    <input
                      value={fields.wifi.ssid}
                      onChange={(e) => updateField('wifi', { ssid: e.target.value })}
                      placeholder="Network Name (SSID)"
                    />
                  </div>
                  <div className="grid-2col">
                    <div className="custom-select-box">
                      <select
                        value={fields.wifi.encryption}
                        onChange={(e) =>
                          updateField('wifi', {
                            encryption: e.target.value as 'WPA' | 'WEP' | 'nopass',
                          })
                        }
                      >
                        <option value="WPA">WPA / WPA2 / WPA3</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">Open Network (No Password)</option>
                      </select>
                    </div>
                    <label className="liquid-checkbox-card">
                      <input
                        type="checkbox"
                        checked={fields.wifi.hidden}
                        onChange={(e) => updateField('wifi', { hidden: e.target.checked })}
                      />
                      <span>Hidden Network</span>
                    </label>
                  </div>

                  {fields.wifi.encryption !== 'nopass' && (
                    <div className="glass-input-wrapper">
                      <span className="glass-input-icon">
                        <IconLock />
                      </span>
                      <input
                        value={fields.wifi.password}
                        onChange={(e) => updateField('wifi', { password: e.target.value })}
                        placeholder="Network Password"
                        autoComplete="off"
                      />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {inputErrors.length > 0 && (
            <motion.div
              className="apple-alert-box error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
            >
              <strong>Validation Notice:</strong>
              <ul>
                {inputErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Section 02: Visual Presets & Styling */}
          <div className="section-head" style={{ marginTop: '28px' }}>
            <span className="section-pill">02</span>
            <div>
              <h2>Visual Presets & Styling</h2>
              <span className="section-subtitle">Fine-tune geometry and pigments</span>
            </div>
          </div>

          {/* Presets Shelf */}
          <div className="presets-liquid-grid">
            {PRESETS.map((p) => (
              <motion.button
                key={p.id}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`preset-tile ${activePreset === p.id ? 'active' : ''}`}
                onClick={() => applyPreset(p.id)}
              >
                <div className="preset-swatch-circle">
                  <i style={{ background: p.patch.fg }} />
                  <i style={{ background: p.patch.bg }} />
                </div>
                <div className="preset-info">
                  <span className="preset-title">{p.name}</span>
                  <span className="preset-sub">{p.description}</span>
                </div>
                {activePreset === p.id && <span className="preset-check">✓</span>}
              </motion.button>
            ))}
          </div>

          {/* Sliders: Size & Margin */}
          <div className="grid-2col" style={{ marginTop: '16px' }}>
            <div className="slider-liquid-card">
              <div className="slider-header">
                <span className="slider-title">Dimension</span>
                <span className="slider-badge">{options.size} PX</span>
              </div>
              <input
                type="range"
                min={128}
                max={1024}
                step={8}
                value={options.size}
                onChange={(e) => {
                  setPatch({ size: Number(e.target.value) });
                  setActivePreset(null);
                }}
              />
            </div>

            <div className="slider-liquid-card">
              <div className="slider-header">
                <span className="slider-title">Quiet Zone</span>
                <span className="slider-badge">{options.margin} MOD</span>
              </div>
              <input
                type="range"
                min={0}
                max={8}
                step={1}
                value={options.margin}
                onChange={(e) => {
                  setPatch({ margin: Number(e.target.value) });
                  setActivePreset(null);
                }}
              />
            </div>
          </div>

          {/* Colors: Foreground & Background */}
          <div className="grid-2col" style={{ marginTop: '14px' }}>
            <div className="color-liquid-card">
              <span className="color-card-title">Foreground Color</span>
              <div className="color-control-row">
                <input
                  type="color"
                  value={isValidHex(options.fg) ? options.fg : '#111111'}
                  onChange={(e) => {
                    setPatch({ fg: e.target.value });
                    setActivePreset(null);
                  }}
                />
                <input
                  className="color-hex-field"
                  value={options.fg}
                  onChange={(e) => {
                    setPatch({ fg: e.target.value });
                    setActivePreset(null);
                  }}
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="color-liquid-card">
              <span className="color-card-title">Background Color</span>
              <div className="color-control-row">
                <input
                  type="color"
                  value={isValidHex(options.bg) ? options.bg : '#ffffff'}
                  onChange={(e) => {
                    setPatch({ bg: e.target.value });
                    setActivePreset(null);
                  }}
                />
                <input
                  className="color-hex-field"
                  value={options.bg}
                  onChange={(e) => {
                    setPatch({ bg: e.target.value });
                    setActivePreset(null);
                  }}
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          {/* Error Correction & Dot Geometry */}
          <div className="grid-2col" style={{ marginTop: '14px' }}>
            <div className="dropdown-liquid-card">
              <span className="dropdown-label">Error Recovery (EC)</span>
              <select
                value={options.ec}
                onChange={(e) => {
                  setPatch({ ec: e.target.value as ECLevel });
                  setActivePreset(null);
                  triggerJump();
                }}
              >
                <option value="L">Level L (7% Recovery)</option>
                <option value="M">Level M (15% Recovery)</option>
                <option value="Q">Level Q (25% Recovery)</option>
                <option value="H">Level H (30% Recovery)</option>
              </select>
            </div>

            <div className="dropdown-liquid-card">
              <span className="dropdown-label">Dot Geometry</span>
              <select
                value={options.dotType}
                onChange={(e) => {
                  setPatch({ dotType: e.target.value as QROptions['dotType'] });
                  setActivePreset(null);
                  triggerJump();
                }}
              >
                <option value="square">Square</option>
                <option value="rounded">Rounded</option>
                <option value="dots">Dots</option>
                <option value="classy">Classy</option>
                <option value="classy-rounded">Classy Rounded</option>
                <option value="extra-rounded">Extra Rounded</option>
              </select>
            </div>
          </div>

          {/* Corner Squares & Dots */}
          <div className="grid-2col" style={{ marginTop: '14px' }}>
            <div className="dropdown-liquid-card">
              <span className="dropdown-label">Eye Outer</span>
              <select
                value={options.cornerSquare}
                onChange={(e) => {
                  setPatch({ cornerSquare: e.target.value as QROptions['cornerSquare'] });
                  setActivePreset(null);
                }}
              >
                <option value="square">Square</option>
                <option value="extra-rounded">Extra Rounded</option>
                <option value="dot">Circular Dot</option>
              </select>
            </div>

            <div className="dropdown-liquid-card">
              <span className="dropdown-label">Eye Center</span>
              <select
                value={options.cornerDot}
                onChange={(e) => {
                  setPatch({ cornerDot: e.target.value as QROptions['cornerDot'] });
                  setActivePreset(null);
                }}
              >
                <option value="square">Square</option>
                <option value="dot">Circular Dot</option>
              </select>
            </div>
          </div>

          {/* Gradient Dots */}
          <div className="gradient-liquid-card" style={{ marginTop: '14px' }}>
            <label className="liquid-checkbox-card">
              <input
                type="checkbox"
                checked={options.useGradient}
                onChange={(e) => {
                  setPatch({ useGradient: e.target.checked });
                  setActivePreset(null);
                  triggerJump();
                }}
              />
              <span>Linear Gradient ({options.fg} → {options.gradientTo})</span>
            </label>

            {options.useGradient && (
              <div className="gradient-target-picker">
                <input
                  type="color"
                  value={isValidHex(options.gradientTo) ? options.gradientTo : '#0b57d0'}
                  onChange={(e) => setPatch({ gradientTo: e.target.value })}
                />
                <input
                  className="color-hex-field"
                  value={options.gradientTo}
                  onChange={(e) => setPatch({ gradientTo: e.target.value })}
                  spellCheck={false}
                />
              </div>
            )}
          </div>

          {/* Logo Upload */}
          <div className="logo-liquid-card" style={{ marginTop: '14px' }}>
            <div className="logo-card-head">
              <span className="logo-title">Emblem / Logo Overlay</span>
              <span className="logo-tag">LEVEL H LOCK</span>
            </div>

            <div className="logo-action-row">
              <label className="liquid-upload-btn">
                <span>Upload Logo File…</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                />
              </label>

              {options.logoDataUrl && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="btn ghost small"
                  onClick={() => {
                    sounds.playTap();
                    setPatch({ logoDataUrl: null });
                    setLogoName('');
                  }}
                >
                  Remove
                </motion.button>
              )}
            </div>

            {logoName && (
              <p className="logo-notice">
                Active: <strong>{logoName}</strong> · Error correction locked to Level H.
              </p>
            )}

            {options.logoDataUrl && (
              <div className="slider-liquid-card" style={{ marginTop: '10px' }}>
                <div className="slider-header">
                  <span className="slider-title">Scale</span>
                  <span className="slider-badge">{Math.round(options.logoSize * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={0.5}
                  step={0.01}
                  value={options.logoSize}
                  onChange={(e) => setPatch({ logoSize: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
        </motion.section>

        {/* Right Column: Specimen Stage & Telemetry (One Piece Wanted Poster Entrance: Card 2 - One at a Time) */}
        <motion.section
          className="card preview-card"
          aria-label="QR Specimen Observation Deck"
          initial={{
            opacity: 0,
            scale: 0.18,
            rotateY: -270,
            rotateZ: 12,
            y: -120,
          }}
          animate={
            introPhase === 'studio'
              ? {
                  opacity: [0, 1, 1, 1],
                  scale: [0.18, 1.05, 1.05, 1.0],
                  rotateY: [-270, 0, 0, 0],
                  rotateZ: [12, 0, 0, 0],
                  y: [-120, -18, -18, 0],
                }
              : {
                  opacity: 0,
                  scale: 0.18,
                  rotateY: -270,
                  rotateZ: 12,
                  y: -120,
                }
          }
          transition={{
            duration: 0.76,
            times: [0, 0.46, 0.72, 1.0],
            ease: [0.16, 1, 0.3, 1],
            delay: 0.84, // Starts strictly after Card 1 is seated
          }}
        >
          <div className="section-head">
            <span className="section-pill">03</span>
            <div>
              <h2>Live Preview</h2>
              <span className="section-subtitle">Interactive 3D Stage</span>
            </div>
          </div>

          {/* The Specimen Stage */}
          {!isValid ? (
            <div className="preview-empty-state">
              <div className="empty-ring" />
              <p className="empty-title">Awaiting Input</p>
              <p className="empty-sub">Enter valid content on the left to generate the QR code.</p>
              <ul>
                {allErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : (
            <QrStage
              hostRef={previewRef}
              size={options.size}
              ec={options.ec}
              ratio={ratio.toFixed(2)}
              payloadLen={payload.length}
              valid={isValid}
              trickKey={trickKey}
              celebrateKey={celebrateKey}
              payload={payload}
              qrType={qrType}
              onTriggerJump={triggerJump}
            />
          )}

          {/* Export Action Buttons */}
          <div className="export-actions-grid">
            <motion.button
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="apple-export-btn primary"
              disabled={!isValid}
              onClick={() => download('png')}
            >
              <IconDownload />
              <span>Download PNG ({options.size}px)</span>
              <span className="liquid-shine" />
            </motion.button>

            <motion.button
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="apple-export-btn secondary"
              disabled={!isValid}
              onClick={() => download('svg')}
            >
              <IconVector />
              <span>Download SVG Vector</span>
              <span className="liquid-shine" />
            </motion.button>

            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="apple-export-btn ghost"
              disabled={!isValid}
              onClick={copyText}
            >
              <IconCopy />
              <span>Copy Payload</span>
            </motion.button>

            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="apple-export-btn ghost"
              disabled={!isValid}
              onClick={copyImage}
            >
              <IconImage />
              <span>Copy Image</span>
            </motion.button>
          </div>

          {/* Section 04: Recent Generations */}
          <div className="section-head" style={{ marginTop: '28px' }}>
            <span className="section-pill">04</span>
            <div>
              <h2>Recent Generations</h2>
              <span className="section-subtitle">Client Database Storage</span>
            </div>
            <span className="db-pill" style={{ marginLeft: 'auto' }}>
              <IconDatabase /> IndexedDB
            </span>
          </div>

          {recents.length === 0 ? (
            <div className="recents-empty">
              <span>No archived codes yet. Generated QR codes persist automatically in IndexedDB.</span>
            </div>
          ) : (
            <div className="recents-container">
              <ul className="recents-deck">
                {recents.map((r) => (
                  <motion.li
                    key={r.id}
                    whileHover={{ scale: 1.01 }}
                    className="recent-card"
                  >
                    <div className="recent-info">
                      <div className="recent-top-line">
                        <span className="recent-type-tag">{TYPE_LABELS[r.type]}</span>
                        <span className="recent-time">{timeAgo(r.createdAt)}</span>
                      </div>
                      <div className="recent-payload-snippet">{r.payload}</div>
                    </div>
                    <div className="recent-actions">
                      <motion.button
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        className="recent-action-btn load"
                        onClick={() => loadRecent(r)}
                      >
                        Reuse
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        className="recent-action-btn delete"
                        onClick={() => handleDeleteRecent(r.id)}
                      >
                        ✕
                      </motion.button>
                    </div>
                  </motion.li>
                ))}
              </ul>
              <div className="recents-actions-bar">
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  className="apple-clear-history-btn"
                  onClick={handleClearRecents}
                >
                  <IconTrash />
                  <span className="clear-btn-text">Clear History</span>
                  <span className="clear-btn-pill">CLEAR</span>
                  <span className="liquid-shine" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  className="apple-export-db-btn"
                  onClick={handleExportDB}
                  title="Export database history as JSON document"
                >
                  <IconExport />
                  <span>Export JSON</span>
                </motion.button>
              </div>
            </div>
          )}
        </motion.section>
      </motion.main>

      {/* Clean Professional Footer */}
      <footer className="apple-footer">
        <p>QR Studio · Professional Vector QR Code Engine</p>
      </footer>
    </div>
  );
}
