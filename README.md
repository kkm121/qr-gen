# QR Studio — Client-Side Vector QR Code Studio

<p align="left">
  <a href="https://github.com/kkm121/qr-gen"><img src="https://img.shields.io/badge/GitHub-kkm121%2Fqr--gen-black.svg?logo=github" alt="GitHub Repository"></a>
  <img src="https://img.shields.io/badge/React-19.2-61dafb.svg?logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-6.0%20Strict-3178c6.svg?logo=typescript&logoColor=white" alt="TypeScript 6 Strict">
  <img src="https://img.shields.io/badge/Vite-8-646CFF.svg?logo=vite&logoColor=white" alt="Vite 8">
  <img src="https://img.shields.io/badge/Storage-IndexedDB-orange.svg" alt="IndexedDB storage">
  <img src="https://img.shields.io/badge/Tests-node%3Atest-16A34A.svg" alt="node:test suite">
  <img src="https://img.shields.io/badge/License-MIT-1D4ED8.svg" alt="License MIT">
</p>

> **Repository**: [https://github.com/kkm121/qr-gen](https://github.com/kkm121/qr-gen)
>
> **Live demo**: [https://qr-gen-rho-two.vercel.app/](https://qr-gen-rho-two.vercel.app/)

**QR Studio** is a browser-only web application that generates, customizes, and exports QR codes in real time. It was built as **Frontend Task 1 (QR Code Generator and Designer)** for the GDG on Campus SRM Technical Domain recruitments 2026-27. There is no backend: encoding, rendering, validation, storage, and export all run client-side with React 19, TypeScript, and `qr-code-styling`.

---

## Table of Contents

- [1. Repository Structure](#1-repository-structure)
- [2. Interface Showcase](#2-interface-showcase)
- [3. How Encoding and Validation Work](#3-how-encoding-and-validation-work)
- [4. Customization and Export](#4-customization-and-export)
- [5. Data and Persistence](#5-data-and-persistence)
- [6. Experience Details](#6-experience-details)
- [7. Local Development and Verification](#7-local-development-and-verification)
- [8. Design Decisions](#8-design-decisions)

---

## 1. Repository Structure

```
qr-gen/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── pull_request_template.md
├── screenshots/
│   └── README.md                 # Capture spec for the required screenshots
├── src/
│   ├── components/
│   │   ├── CursorGlow.tsx        # Ambient pointer-tracking glow (desktop only)
│   │   ├── Icons.tsx             # Inline SVG icon set
│   │   ├── LiquidBackdrop.tsx    # 2D canvas aurora background (lazy chunk)
│   │   ├── Preloader.tsx         # 4.6s staged boot sequence with Skip
│   │   ├── QrStage.tsx           # 3D tilt stage, jump trick, shockwave
│   │   └── ScanSimulator.tsx     # Simulated scanner HUD (theater, not a decoder)
│   ├── lib/
│   │   ├── db.ts                 # IndexedDB client (QRStudioDB) + JSON export
│   │   ├── qr.ts                 # Payload builders, validation, presets, scoring
│   │   ├── qr.test.ts            # node:test unit suite
│   │   └── sound.ts              # Web Audio synth (no audio assets)
│   ├── App.tsx                   # Studio shell, state, export pipeline
│   ├── index.css                 # Theme tokens, layout, responsive rules
│   └── main.tsx                  # React entry point
├── index.html                    # Shell, meta, font CDN links
├── package.json                  # Scripts: dev, test, lint, build, preview
├── vite.config.ts                # Manual chunks (framer, qr, backdrop)
├── tsconfig.app.json             # Strict TS incl. erasableSyntaxOnly
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE                       # MIT
```

---

## 2. Interface Showcase

Screenshots are required by the task brief. Capture them locally and save into `screenshots/` with these exact filenames, then reference them here.

| **Desktop studio** | **Mobile layout (375px)** |
|:---:|:---:|
| `screenshots/desktop.png` | `screenshots/mobile.png` |
| *Full two-column studio: controls left, 3D stage right.* | *Single-column stack, touch-sized inputs, no overflow.* |

| **QR types and examples** | **Customization and presets** |
|:---:|:---:|
| `screenshots/qr-types.png` | `screenshots/customization.png` |
| *All five tabs (URL, Text, Email, Phone, Wi-Fi) with one example each.* | *Six presets, sliders, color controls, error-correction select.* |

| **Scan simulator** | **History and database** |
|:---:|:---:|
| `screenshots/simulator.png` | `screenshots/recents.png` |
| *Simulated viewfinder HUD. Labeled as simulation; real check is a phone scan.* | *Recent generations restored from IndexedDB with reuse and delete.* |

Capture spec (`screenshots/README.md` has the same list): `npm run dev`, generate one QR per type, scan each with a phone camera first, then screenshot at 1440px and 375px widths.

---

## 3. How Encoding and Validation Work

Each type builds a standard payload string (`src/lib/qr.ts:buildPayload`):

| Type | Encoded as | Example |
| :--- | :--- | :--- |
| URL | Normalized URL (`https://` added when missing) | `https://example.com` |
| Plain Text | Raw string, up to 2000 chars | `Hello` |
| Email | `mailto:` with subject/body query | `mailto:a@b.com?subject=Hi&body=...` |
| Phone | `tel:` URI, 7-15 digits | `tel:+919876543210` |
| Wi-Fi | `WIFI:T:...;S:...;P:...;;` with `;,:,"` escaping | Joins from phone camera apps |

Validation (`validateInputs`) blocks export on: empty content, malformed URL/email/phone, missing SSID, password on open networks, WPA passwords outside 8-63 chars. Styling options are validated separately (hex colors, size 128-1024).

Scan reliability (`getScanWarnings`, `calculateScanScore`): live contrast ratio with WCAG luminance math, plus warnings for low contrast, inverted colors, quiet zones under 2 modules, logos paired with low error correction, gradients on weak EC, payloads over 800 chars, and exports under 180px.

---

## 4. Customization and Export

- **Size**: 128-1024px export resolution. **Quiet zone**: 0-8 margin slider.
- **Colors**: foreground/background hex with pickers; optional linear gradient dots.
- **Error correction**: L (7%), M (15%), Q (25%), H (30%) Reed-Solomon recovery.
- **Geometry**: 6 dot styles (`square`, `rounded`, `dots`, `classy`, `classy-rounded`, `extra-rounded`), 3 corner-square styles, 2 corner-dot styles.
- **Logo**: local image upload (stays on device), auto-suggests EC level H.
- **Presets** (6, all editable after selection): Classic, Studio Blue, Sunset Gradient, Midnight, Mint, Cupertino Titanium.

Export is a 3-tier pipeline (`App.tsx:download`): (1) `qr-code-styling` direct download, (2) DOM extraction fallback (canvas `toDataURL` for PNG, serialized `<svg>` Blob for SVG), (3) offscreen isolated instance. PNG files are named `qr-<type>-<size>px.png`, SVG likewise, at exactly the preview resolution. History can be backed up as `qr-studio-database-export-<timestamp>.json`.

---

## 5. Data and Persistence

- **Recents**: IndexedDB database `QRStudioDB`, store `recent_generations`, capped at the latest **20** entries with consecutive-duplicate suppression and oldest-first pruning.
- **Fallback**: if IndexedDB is unavailable, the same records fall back to localStorage key `qr_studio_recents_v1` (logos excluded from the fallback path to respect quota).
- **Preferences**: editor state (`qr-studio-state-v5`), theme (`qr-studio-theme-v5`), sound toggle (`gdg-sound-enabled`). Logos are never persisted, only held in memory.
- **Privacy**: everything stays in the visitor's browser. The only network requests are font stylesheets (Google Fonts, Fontshare) with system-font fallback offline.

---

## 6. Experience Details

- **Boot sequence** (~4.6s plus exit): staged counter with status lines, READY hold, dual-panel curved curtain exit, and a Skip button. Skipped instantly under `prefers-reduced-motion`; a 9.5s parent timer force-dismisses it so it can never trap the UI.
- **Stage**: spring-physics 3D tilt with cursor glare, orbit readouts, and a jump-spin-land trick on boot, type switch, preset, and logo apply. The QR canvas mounts untouched, so the download matches the preview.
- **Sound**: synthesized Web Audio taps, jumps, landings, and chimes; toggle in the header. Browsers gate audio on first interaction, so boot sounds stay silent until then.
- **Scan simulator**: an animated viewfinder HUD. It is explicitly a simulation and proves nothing; scannability is confirmed by scanning exports with a phone camera (see the testing checklist in-app).

---

## 7. Local Development and Verification

### Prerequisites

- Node.js 18+ (developed and tested on Node 24) and npm 10+.

### Setup

```bash
git clone https://github.com/kkm121/qr-gen.git
cd qr-gen
npm install
npm run dev      # http://localhost:5173
```

### Tests

```bash
npm test         # node --test src/lib/qr.test.ts
```

Verified output on Node 24: 28 tests, 28 pass, 0 fail — covering payload building for all five types, input validation, hex/contrast/score math, warning rules, preset integrity (including gradient isolation between Sunset and Classic), and the IndexedDB engine (save, dedupe, delete, clear, JSON export).

### Lint and build

```bash
npm run lint     # oxlint, 0 errors
npm run build    # tsc -b + vite build -> dist/
npm run preview  # serve the production build locally
```

### Deploy (Vercel)

1. Push this folder as the repo root of a public GitHub repository.
2. Vercel dashboard: Add New Project -> import the repo -> Framework Preset **Vite** (build `npm run build`, output `dist/`). No environment variables needed.
3. Add screenshots to `screenshots/`, reference them in section 2, and push again.

---

## 8. Design Decisions

- **Client-only**: the brief forbids requiring a backend, so there is none — no accounts, no uploads, no tracking.
- **IndexedDB for history, localStorage for prefs**: recents hold full styled snapshots (including large logo data URLs in the live path), which exceeds comfortable localStorage quotas; small prefs stay in localStorage.
- **Three-tier export**: direct library download first, DOM extraction second, isolated instance third — exports survive ad-blockers and sandboxed iframes that break any single path.
- **Simulation labeled as simulation**: the scanner HUD is UX theater; claiming it verifies decodability would be false, so the UI and this README say so and point at phone-camera testing.
- **CDN fonts with fallback**: display fonts load from Google Fonts/Fontshare; offline or blocked, the UI falls back to system fonts with no breakage.

---

<p align="center">
  <b>QR Studio</b> — GDG on Campus SRM Technical Domain, Frontend Task 1<br>
  <a href="https://github.com/kkm121/qr-gen">github.com/kkm121/qr-gen</a> · <a href="https://qr-gen-rho-two.vercel.app/">Live demo</a>
</p>
