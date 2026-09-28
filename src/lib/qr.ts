export type QRType = 'url' | 'text' | 'email' | 'phone' | 'wifi';

export type ECLevel = 'L' | 'M' | 'Q' | 'H';

export type DotType =
  | 'square'
  | 'rounded'
  | 'dots'
  | 'classy'
  | 'classy-rounded'
  | 'extra-rounded';

export interface UrlFields {
  url: string;
}
export interface TextFields {
  text: string;
}
export interface EmailFields {
  to: string;
  subject: string;
  body: string;
}
export interface PhoneFields {
  phone: string;
}
export interface WifiFields {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export type TypeFields = {
  url: UrlFields;
  text: TextFields;
  email: EmailFields;
  phone: PhoneFields;
  wifi: WifiFields;
};

export interface QROptions {
  size: number;
  fg: string;
  bg: string;
  ec: ECLevel;
  margin: number;
  dotType: DotType;
  cornerSquare: 'square' | 'extra-rounded' | 'dot';
  cornerDot: 'square' | 'dot';
  useGradient: boolean;
  gradientTo: string;
  logoDataUrl: string | null;
  logoSize: number; // 0.2 - 0.5 of QR size
}

export const DEFAULT_OPTIONS: QROptions = {
  size: 256,
  fg: '#111111',
  bg: '#ffffff',
  ec: 'M',
  margin: 2,
  dotType: 'square',
  cornerSquare: 'square',
  cornerDot: 'square',
  useGradient: false,
  gradientTo: '#0b57d0',
  logoDataUrl: null,
  logoSize: 0.35,
};

export const DEFAULT_FIELDS: TypeFields = {
  url: { url: 'https://apple.com' },
  text: { text: 'QR Studio Vector Engine' },
  email: { to: 'contact@example.com', subject: 'Project Inquiry', body: 'Hello, I would like to get in touch.' },
  phone: { phone: '+15550192834' },
  wifi: { ssid: 'Studio-Network', password: 'secure-wifi-pass', encryption: 'WPA', hidden: false },
};

export interface Preset {
  id: string;
  name: string;
  description: string;
  patch: Partial<QROptions>;
}

export const PRESETS: Preset[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Black on white, maximum readability',
    patch: {
      fg: '#111111',
      bg: '#ffffff',
      ec: 'M',
      margin: 2,
      dotType: 'square',
      cornerSquare: 'square',
      cornerDot: 'square',
      useGradient: false,
    },
  },
  {
    id: 'studio-blue',
    name: 'Studio Blue',
    description: 'Vibrant cobalt blue with high contrast',
    patch: {
      fg: '#0b57d0',
      bg: '#ffffff',
      ec: 'Q',
      margin: 2,
      dotType: 'rounded',
      cornerSquare: 'extra-rounded',
      cornerDot: 'dot',
      useGradient: false,
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Gradient',
    description: 'Gradient look, needs Q/H to scan well',
    patch: {
      fg: '#d93025',
      bg: '#ffffff',
      ec: 'Q',
      margin: 3,
      dotType: 'extra-rounded',
      cornerSquare: 'extra-rounded',
      cornerDot: 'dot',
      useGradient: true,
      gradientTo: '#f9ab00',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark card style, keep contrast high',
    patch: {
      fg: '#e8eaed',
      bg: '#131314',
      ec: 'H',
      margin: 3,
      dotType: 'classy-rounded',
      cornerSquare: 'extra-rounded',
      cornerDot: 'dot',
      useGradient: false,
    },
  },
  {
    id: 'mint',
    name: 'Mint',
    description: 'Soft green background, still scannable',
    patch: {
      fg: '#0d652d',
      bg: '#e6f4ea',
      ec: 'Q',
      margin: 2,
      dotType: 'dots',
      cornerSquare: 'dot',
      cornerDot: 'dot',
      useGradient: false,
    },
  },
  {
    id: 'cupertino',
    name: 'Cupertino Titanium',
    description: 'Royal violet & frosted titanium aesthetic',
    patch: {
      fg: '#6d28d9',
      bg: '#faf5ff',
      ec: 'H',
      margin: 2,
      dotType: 'extra-rounded',
      cornerSquare: 'extra-rounded',
      cornerDot: 'dot',
      useGradient: false,
    },
  },
];

export function escapeWifi(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/:/g, '\\:').replace(/"/g, '\\"');
}

export function normalizeUrl(input: string): string {
  const t = input.trim();
  if (!t) return t;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t)) return t;
  return `https://${t}`;
}

export function buildPayload(type: QRType, fields: TypeFields): string {
  switch (type) {
    case 'url':
      return normalizeUrl(fields.url.url.trim());
    case 'text':
      return fields.text.text;
    case 'email': {
      const to = fields.email.to.trim();
      const params = new URLSearchParams();
      if (fields.email.subject.trim()) params.set('subject', fields.email.subject.trim());
      if (fields.email.body) params.set('body', fields.email.body);
      const q = params.toString();
      return `mailto:${to}${q ? `?${q}` : ''}`;
    }
    case 'phone': {
      const p = fields.phone.phone.trim().replace(/[\s()-]/g, '');
      return `tel:${p}`;
    }
    case 'wifi': {
      const w = fields.wifi;
      const enc = w.encryption === 'nopass' ? 'nopass' : w.encryption;
      const pass = enc === 'nopass' ? '' : `P:${escapeWifi(w.password)};`;
      const hidden = w.hidden ? 'H:true;' : '';
      return `WIFI:T:${enc};S:${escapeWifi(w.ssid)};${pass}${hidden};`;
    }
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export function isValidHex(c: string): boolean {
  return HEX_RE.test(c.trim());
}

export function validateInputs(type: QRType, fields: TypeFields): string[] {
  const errors: string[] = [];
  if (type === 'url') {
    const raw = fields.url.url.trim();
    if (!raw) errors.push('URL is required.');
    else if (raw.length > 2048) errors.push('URL is too long (max 2048 characters).');
    else {
      try {
        const u = new URL(normalizeUrl(raw));
        if (!u.hostname.includes('.')) errors.push('URL hostname looks invalid (missing domain extension).');
        if (!['http:', 'https:'].includes(u.protocol)) errors.push('URL must use http or https.');
      } catch {
        errors.push('Enter a valid URL, e.g. https://example.com.');
      }
    }
  }
  if (type === 'text') {
    if (!fields.text.text) errors.push('Text is required.');
    else if (fields.text.text.length > 2000) errors.push('Text is too long (max 2000 characters).');
  }
  if (type === 'email') {
    if (!fields.email.to.trim()) errors.push('Recipient email is required.');
    else if (!EMAIL_RE.test(fields.email.to.trim())) errors.push('Enter a valid email address.');
    if (fields.email.subject.length > 200) errors.push('Subject is too long (max 200 characters).');
    if (fields.email.body.length > 1000) errors.push('Body is too long (max 1000 characters).');
  }
  if (type === 'phone') {
    const raw = fields.phone.phone.trim();
    if (!raw) errors.push('Phone number is required.');
    else {
      const digits = raw.replace(/\D/g, '');
      if (!/^\+?[0-9\s()-]{7,20}$/.test(raw)) errors.push('Enter a valid phone number (digits, +, spaces, dashes).');
      else if (digits.length < 7 || digits.length > 15) errors.push('Phone number must have 7-15 digits.');
    }
  }
  if (type === 'wifi') {
    const w = fields.wifi;
    if (!w.ssid.trim()) errors.push('Wi-Fi network name (SSID) is required.');
    else if (w.ssid.length > 32) errors.push('SSID must be 32 characters or less.');
    if (w.encryption === 'nopass' && w.password) errors.push('Password must be empty for open networks.');
    if (w.encryption !== 'nopass') {
      if (!w.password) errors.push('Password is required for WPA/WEP networks.');
      else if (w.encryption === 'WPA' && (w.password.length < 8 || w.password.length > 63))
        errors.push('WPA password must be 8-63 characters.');
      else if (w.encryption === 'WEP' && ![5, 10, 13, 26].includes(w.password.length))
        errors.push('WEP password is usually 5, 10, 13 or 26 characters.');
    }
  }
  return errors;
}

export function validateOptions(o: QROptions): string[] {
  const errors: string[] = [];
  if (!isValidHex(o.fg)) errors.push('Foreground color must be a valid hex, e.g. #111111.');
  if (!isValidHex(o.bg)) errors.push('Background color must be a valid hex, e.g. #ffffff.');
  if (o.useGradient && !isValidHex(o.gradientTo)) errors.push('Gradient color must be a valid hex.');
  if (o.size < 128 || o.size > 1024) errors.push('Size must be between 128 and 1024.');
  if (o.margin < 0 || o.margin > 10) errors.push('Margin must be between 0 and 10.');
  return errors;
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  try {
    const [r, g, b] = hexToRgb(hex).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  } catch {
    return 0.5;
  }
}

export function contrastRatio(fg: string, bg: string): number {
  if (!isValidHex(fg) || !isValidHex(bg)) return 21;
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export interface ScanWarning {
  level: 'error' | 'warn';
  message: string;
}

export function getScanWarnings(payload: string, o: QROptions): ScanWarning[] {
  const warnings: ScanWarning[] = [];
  const ratio = contrastRatio(o.fg, o.bg);
  if (ratio < 2.5) {
    warnings.push({
      level: 'error',
      message: `Very low contrast (${ratio.toFixed(2)}:1). Scanners will likely fail. Use a dark foreground on a light background.`,
    });
  } else if (ratio < 4.0) {
    warnings.push({
      level: 'warn',
      message: `Low contrast (${ratio.toFixed(2)}:1). Prefer 4.5:1 or higher for reliable scanning.`,
    });
  }
  try {
    if (isValidHex(o.fg) && isValidHex(o.bg) && luminance(o.fg) > luminance(o.bg)) {
      warnings.push({
        level: 'warn',
        message: 'Inverted colors (light dots on dark background). Most scanners work, but some need dark-on-light. Test before printing.',
      });
    }
  } catch {
    /* ignore */
  }
  if (o.margin <= 1) {
    warnings.push({
      level: 'warn',
      message: 'Margin is very small. Keep a quiet zone (margin >= 2) so cameras can find the code.',
    });
  }
  if (o.logoDataUrl && o.ec !== 'H' && o.ec !== 'Q') {
    warnings.push({
      level: 'error',
      message: 'Logo with low error correction (use Q or H). The logo covers data modules.',
    });
  }
  if (o.logoDataUrl && o.logoSize > 0.4 && o.ec !== 'H') {
    warnings.push({
      level: 'warn',
      message: 'Large logo needs error correction H for best reliability.',
    });
  }
  if (o.useGradient && (o.ec === 'L' || o.ec === 'M')) {
    warnings.push({
      level: 'warn',
      message: 'Gradient with low error correction can wash out modules in bright light. Use Q/H.',
    });
  }
  if (payload.length > 800) {
    warnings.push({
      level: 'warn',
      message: `Payload is long (${payload.length} chars). The QR becomes dense and harder to scan at small sizes. Increase size or EC.`,
    });
  }
  if (o.size < 180) {
    warnings.push({
      level: 'warn',
      message: 'Small export size. Print/screen versions under 180px can be hard to scan from a distance.',
    });
  }
  return warnings;
}

// ---------- Recent history (localStorage) ----------

export interface RecentItem {
  id: string;
  type: QRType;
  payload: string;
  options: QROptions;
  createdAt: number;
}

const RECENT_KEY = 'gdg-qr-recents-v1';
const MAX_RECENTS = 12;

export function loadRecents(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as RecentItem[];
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

export function pushRecent(item: Omit<RecentItem, 'id' | 'createdAt'>): RecentItem[] {
  const list = loadRecents();
  const last = list[0];
  if (last && last.payload === item.payload && last.type === item.type) return list;
  const next: RecentItem[] = [
    { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() },
    ...list,
  ].slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage full / private mode */
  }
  return next;
}

export function deleteRecent(id: string): RecentItem[] {
  const next = loadRecents().filter((r) => r.id !== id);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearRecents(): RecentItem[] {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
  return [];
}

export const TYPE_LABELS: Record<QRType, string> = {
  url: 'URL',
  text: 'Text',
  email: 'Email',
  phone: 'Phone',
  wifi: 'Wi-Fi',
};

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
}

export function calculateScanScore(
  ratio: number,
  ec: ECLevel,
  margin: number,
  hasLogo: boolean
): number {
  let score = 55;
  if (ratio >= 7) score += 25;
  else if (ratio >= 4.5) score += 18;
  else if (ratio >= 3) score += 8;
  else score -= 35;

  if (ec === 'H') score += 12;
  else if (ec === 'Q') score += 8;
  else if (ec === 'M') score += 4;

  if (margin >= 2) score += 8;
  else if (margin === 1) score += 2;
  else score -= 12;

  if (hasLogo && (ec === 'L' || ec === 'M')) score -= 25;

  return Math.max(15, Math.min(100, Math.round(score)));
}

export interface RawQRCodeStylingConfig {
  width: number;
  height: number;
  data: string;
  margin: number;
  qrOptions: { errorCorrectionLevel: ECLevel };
  backgroundOptions: { color: string };
  image?: string;
  imageOptions: {
    hideBackgroundDots: boolean;
    imageSize: number;
    margin: number;
    crossOrigin: string;
  };
  dotsOptions: {
    type: DotType;
    color?: string;
    gradient?: {
      type: 'linear';
      rotation: number;
      colorStops: Array<{ offset: number; color: string }>;
    };
  };
  cornersSquareOptions: {
    type: 'square' | 'extra-rounded' | 'dot';
    color: string;
  };
  cornersDotOptions: {
    type: 'square' | 'dot';
    color: string;
  };
}

export function createQrCodeOptions(dataStr: string, options: QROptions): RawQRCodeStylingConfig {
  const fgColor = isValidHex(options.fg) ? options.fg : '#111111';
  const bgColor = isValidHex(options.bg) ? options.bg : '#ffffff';
  const gradientToColor = isValidHex(options.gradientTo) ? options.gradientTo : '#0b57d0';

  const dotsOptions: RawQRCodeStylingConfig['dotsOptions'] = {
    type: options.dotType,
  };

  if (options.useGradient) {
    dotsOptions.gradient = {
      type: 'linear',
      rotation: 45,
      colorStops: [
        { offset: 0, color: fgColor },
        { offset: 1, color: gradientToColor },
      ],
    };
  } else {
    dotsOptions.color = fgColor;
  }

  const config: RawQRCodeStylingConfig = {
    width: options.size,
    height: options.size,
    data: dataStr || 'https://apple.com',
    margin: options.margin * 4,
    qrOptions: { errorCorrectionLevel: options.ec },
    backgroundOptions: { color: bgColor },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: options.logoSize,
      margin: 4,
      crossOrigin: 'anonymous',
    },
    dotsOptions,
    cornersSquareOptions: {
      type: options.cornerSquare,
      color: fgColor,
    },
    cornersDotOptions: {
      type: options.cornerDot,
      color: fgColor,
    },
  };

  if (options.logoDataUrl) {
    config.image = options.logoDataUrl;
  }

  return config;
}

