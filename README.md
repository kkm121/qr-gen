# QR Code Generator & Designer — GDG on Campus SRM (Frontend Task 1)

A browser-only web app to generate and customize QR codes in real time. Built for **GDG on Campus SRM Recruitments 2026-27, Technical Domain**.

No backend. Everything runs client-side with React + TypeScript + `qr-code-styling`.

## Demo

- Run locally (see Setup) or deploy to Vercel/Netlify.
- Add your deployed URL here: `https://<your-app>.vercel.app`

## Screenshots

Add screenshots to `screenshots/` (required by the task doc):

- `screenshots/desktop.png` — desktop layout
- `screenshots/mobile.png` — mobile layout (375px)
- `screenshots/qr-types.png` — the 5 type tabs
- `screenshots/customization.png` — presets + preview
- `screenshots/download.png` — a downloaded PNG sample

> The `screenshots/` folder currently has placeholders. Replace them with real captures before submitting.

## Features (mapped to task doc)

1. **QR Code Generation** — type URL/text, real-time preview.
2. **5 QR Types** with type-specific inputs:
   | Type | Encoded as | Example |
   |---|---|---|
   | URL | normalized URL (`https://` auto-added) | `https://gdgsrm.com` |
   | Text | raw string | `Hello GDG SRM!` |
   | Email | `mailto:` + query | `mailto:a@b.com?subject=Hi&body=...` |
   | Phone | `tel:` | `tel:+919876543210` |
   | Wi-Fi | `WIFI:T:...;S:...;P:...;H:...;;` | camera-app join |
3. **Customization** — size (128–1024), foreground/background, error correction (L/M/Q/H), margin/quiet-zone, dot style, corner styles, gradient, logo overlay. Preview updates immediately.
4. **Presets** — Classic, GDG Blue, Sunset Gradient, Midnight, Mint. Any preset remains fully editable after selection.
5. **Download** — PNG at exactly the preview size + SVG. What you see is what you download.
6. **Validation** — per-type errors (bad URL/email/phone, WPA length, empty SSID, hex colors). Download/copy blocked until valid.
7. **Scan Reliability** — contrast ratio readout + warnings for low contrast, inverted colors, tiny margin, logo-with-low-EC, long payloads, small export size.
8. **Recent QR Codes** — last 12 valid codes in `localStorage` (`gdg-qr-recents-v1`), click Reuse, survives refresh. Editor state also persists (`gdg-qr-state-v1`).
9. **Responsive** — 2-column on desktop, 1-column under 960px, touch-friendly inputs.
10. **Testing** — in-app collapsible checklist covering all of the above.

Optional enhancements included: SVG download, logo upload (auto-bumps EC to H), gradient dots, copy text/image to clipboard, dark/light theme. Skipped: fully custom vector patterns (kept to the 6 `qr-code-styling` dot types for scan safety).

## Tech

- React 19 + Vite + TypeScript
- `qr-code-styling` for rendering/export
- `three` (lazy-loaded chunk) for the ambient particle backdrop — original code
- `framer-motion` for the preloader, stage tilt physics and micro-motion
- Hand-written CSS with CSS variables + dark mode + reduced-motion support
- `localStorage` for recents/state/theme

## Experience notes (X-factor, all original code)

- **Boot preloader** — eased 0→100 counter with cycling verbs and a curved
  curtain exit; force-dismissed on a 5s timer and skipped for reduced motion.
- **Particle backdrop** — breathing GDG-coloured three.js grid with pointer
  parallax, DPR-capped, paused when the tab hides.
- **Specimen stage** — the QR floats on a spring-physics 3D-tilt mat with glare,
  orbit readouts (EC / size / contrast) and a metadata strip. The QR canvas
  itself is mounted untouched, so the downloaded PNG is identical to the preview.
- All 10 required task behaviours are unchanged and covered by the same
  validation, warnings, recents and test checklist.

## Setup

```bash
cd frontend-qr-generator
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
npm run preview  # serve the production build locally
```

Node 18+ recommended (tested on Node 24).

## Usage

1. Pick a type (URL/Text/Email/Phone/Wi-Fi).
2. Fill the fields — errors appear inline.
3. Pick a preset, then tweak size/colors/EC/margin/logo.
4. Watch the live preview + contrast + warnings.
5. Download PNG/SVG or copy. Scan the result with your phone camera to verify.

## Project structure

```
frontend-qr-generator/
  src/
    App.tsx        # all UI + qr-code-styling wiring
    lib/qr.ts      # payload builders, validation, presets, contrast, recents
    index.css      # theme + responsive styles
    main.tsx
  screenshots/     # required submission screenshots
  README.md, LICENSE, CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md
  .github/         # PR + issue templates
```

## Design decisions / assumptions

- URL without scheme gets `https://` (common camera-app expectation); validation still requires a dotted hostname.
- Margin slider 0–10 maps to `margin * 4` px in `qr-code-styling`; warnings fire at ≤1 to preserve the quiet zone.
- Logo forces an H recommendation because it covers data modules; logo files stay client-side (never uploaded).
- Recents store options + payload (not the logo data URL) to avoid blowing the 5MB `localStorage` quota.
- Contrast uses WCAG relative luminance; QR-specific bar is 4.5:1 excellent / 3–4.5 okay / <2.5 likely-unscannable.
- Inverted (light-on-dark) codes get a warning, not a block — most modern scanners handle them, some budget ones don't.

## Deployment (Vercel)

1. Push this folder as its own public GitHub repo.
2. Vercel → New Project → import repo → framework preset **Vite** → deploy (defaults work: `npm run build`, `dist/`).
3. Netlify alternative: build command `npm run build`, publish `dist`.

## Manual test script

- [ ] Each of the 5 types generates and scans via phone camera.
- [ ] Each customization control updates the preview without reload.
- [ ] Downloaded PNG pixel-matches the on-screen size; SVG opens standalone.
- [ ] Bad inputs (e.g. `not a url`, `a@`, `123`, empty SSID, WPA pass of 3 chars) show errors and disable export.
- [ ] Low contrast (e.g. `#eeeeee` on `#ffffff`) and logo+EC=L raise warnings.
- [ ] Reload keeps recents and editor values; Reuse restores a recent; Delete/Clear work.
- [ ] 375px and 1440px layouts have no overflow; theme toggle persists.

## License

MIT — see `LICENSE`.
