# QR Studio — Professional Vector QR Code Studio

> A high-performance, client-side web application to generate, customize, and inspect vector QR codes in real time with Reed-Solomon error correction, Apple Design Model aesthetics, and IndexedDB persistence.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Framework: React 19](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://react.dev)
[![TypeScript: 5.x](https://img.shields.io/badge/TypeScript-Strict-3178c6.svg)](https://www.typescriptlang.org)
[![Three.js: 3D](https://img.shields.io/badge/Three.js-WebGL-black.svg)](https://threejs.org)
[![Storage: IndexedDB](https://img.shields.io/badge/Storage-IndexedDB-orange.svg)](src/lib/db.ts)
[![Tests: 28 Passing](https://img.shields.io/badge/Tests-28%20Passing-success.svg)](src/lib/qr.test.ts)

---

## Overview

**QR Studio** provides a desktop-class vector QR code authoring suite built with modern web technologies. Engineered entirely client-side with zero backend dependencies, it combines mathematical Reed-Solomon error correction, hardware-accelerated 3D inspection physics, transactional browser database persistence, and lossless multi-tier vector export.

---

## Key Features

### 1. One-Click Sample Presets Shelf
- Instant pre-configured specimens for common payloads:
  - **Website URL**: `https://apple.com`
  - **Wi-Fi Network**: `Studio-5G` (WPA2 secure)
  - **Contact Email**: Inbound inquiry mailto payload
  - **Phone Contact**: Direct telephone dialing specification
  - **Plain Text**: Formatted multi-line text verification

### 2. Multi-Format Payload Synthesis
- **URL**: Automatic protocol validation and `https://` normalization.
- **Plain Text**: Character count tracking and payload density estimation.
- **Email**: Formatted `mailto:` string synthesis with recipient, subject, and message body encoding.
- **Phone**: International number normalization adhering to the `tel:` URI scheme.
- **Wi-Fi**: Comprehensive `WIFI:T:...;S:...;P:...;` matrix string builder with special character escaping and WPA/WEP/Open security options.

### 3. Precision Customization & Curated Presets
- **Sizing & Framing**: Resolution scaling from `128px` to `1024px` with adjustable quiet zone margins (0 to 8 units).
- **Color Gradients & Contrast**: Granular foreground and background hex color controls and live color pickers.
- **Mathematical Error Correction**: Low (7%), Medium (15%), Quartile (25%), and High (30%) Reed-Solomon parity recovery.
- **Module Geometry**: 6 distinct module patterns (`dots`, `rounded`, `classy`, `classy-rounded`, `extra-rounded`, `square`).
- **Corner Markers**: 3 corner square variants and 3 inner corner dot styling options.
- **Logo Integration**: In-browser image processing with automatic centering and aspect-ratio preservation.
- **Curated Presets**: Single-click visual themes (Classic Monochrome, Studio Blue, Sunset Gradient, Midnight Stealth, Mint Cyber, Cupertino Titanium).

### 4. Reliable 3-Tier Download Pipeline
- **Lossless Formats**: Instant download in high-resolution raster **PNG** and vector **SVG**.
- **Three-Tier Fallback Engine**:
  1. Direct library rendering via `QRCodeStyling.download()`.
  2. In-DOM serialization fallback extracting active `<canvas>` raster data or serializing `<svg>` nodes into standalone XML Blob objects.
  3. Offscreen isolated engine instance fallback ensuring exports never fail under restrictive sandbox environments.

### 5. Transactional IndexedDB History Engine
- **Persistent Local Database**: Built on transactional browser `IndexedDB` (`QRStudioDB`), storing full payload snapshots, styling parameters, and timestamps.
- **Deduplication & Auto-Pruning**: Automatic deduplication and memory management keeping the latest 30 generations.
- **One-Click Rehydration**: Tap any history tile to restore complete configuration states into the live generator.
- **Data Portability**: Full JSON backup export (`QRStudio-Generations-*.json`) and atomic item or whole-store deletion controls.

### 6. 3D Observation Stage & Spring Physics
- Hardware-accelerated 3D inspection pedestal powered by CSS 3D transforms and Three.js.
- Interactive levitation, smooth translucent rotation, and spring-damped landing physics with dual sonar shockwave emission.
- Optional spatial orbit toggle for manual tilt and angle verification.

### 7. Viewfinder Camera Simulator HUD
- Built-in optical scanner simulation with targeting brackets and animated laser raster beam.
- Confirms payload parity and scannability without leaving the interface.

### 8. Web Audio Acoustic Feedback
- Zero-external-asset sound synthesizer utilizing the browser Web Audio API.
- Generates subtle haptic clicks, frequency rises during 3D levitation, acoustic thuds upon landing, and export notification chimes. Toggleable anytime via the top navigation bar.

---

## Project Structure

```
frontend-qr-generator/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── config.yml
│   └── pull_request_template.md
├── src/
│   ├── components/
│   │   ├── CursorGlow.tsx         # Ambient cursor glow tracking
│   │   ├── Icons.tsx              # Inline SVG icon system (zero emojis)
│   │   ├── LiquidBackdrop.tsx     # Active canvas liquid glass backdrop
│   │   ├── Preloader.tsx          # Minimalist 4.8s loading progression
│   │   ├── QrStage.tsx            # 3D levitation, rotation & landing stage
│   │   └── ScanSimulator.tsx      # Viewfinder camera scanner simulator
│   ├── lib/
│   │   ├── db.ts                  # Transactional IndexedDB client & JSON exporter
│   │   ├── qr.ts                  # QR domain models, validation, presets & formulas
│   │   ├── qr.test.ts             # 23 automated unit tests
│   │   └── sound.ts               # Web Audio API synthetic acoustic sound engine
│   ├── App.tsx                    # Main Apple Design Model interface
│   ├── index.css                  # Apple frosted glass styling & design tokens
│   └── main.tsx                   # React 19 application entry point
├── package.json                   # Dependencies, scripts (test, lint, build)
├── vite.config.ts                 # Build configuration & manual chunk splits
├── tsconfig.json                  # TypeScript compiler settings
├── CONTRIBUTING.md                # Contribution guidelines & Conventional Commits
├── CODE_OF_CONDUCT.md             # Contributor Covenant v2.1
├── SECURITY.md                    # Security policy & disclosure procedures
└── LICENSE                        # MIT License
```

---

## Setup & Verification

### Prerequisites
- Node.js `v20.x` or `v24.x`
- npm `v10.x` or higher

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/kkm121/qr-gen.git
cd qr-gen

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Test Suite Execution
Run the automated test suite using the Node.js native test runner:
```bash
npm test
```

```
> frontend-qr-generator@1.0.0 test
> node --test src/lib/qr.test.ts

▶ QR Payload Generation
  ✔ normalizes URL without scheme (0.4323ms)
  ✔ builds valid URL payload (0.1264ms)
  ✔ builds valid Text payload (0.0678ms)
  ✔ builds valid Email payload with mailto scheme and query params (0.0801ms)
  ✔ builds valid Phone payload with tel scheme (0.0919ms)
  ✔ builds valid Wi-Fi payload with escaping (0.1132ms)
  ✔ builds open Wi-Fi network payload without password (0.077ms)
✔ QR Payload Generation (2.3167ms)
▶ Input Validation & Error Handling
  ✔ validates URL correctly (0.6294ms)
  ✔ validates email format (0.1496ms)
  ✔ validates phone number digit requirements (0.1113ms)
  ✔ validates Wi-Fi network fields (0.0526ms)
✔ Input Validation & Error Handling (1.2797ms)
▶ Options & Scan Reliability
  ✔ validates hex colors (0.1329ms)
  ✔ calculates correct contrast ratio and scan reliability score (0.1548ms)
  ✔ flags warnings on low contrast (0.1408ms)
  ✔ flags warning on logo with low error correction level (0.0867ms)
  ✔ presets have complete and valid configurations (0.0723ms)
✔ Options & Scan Reliability (0.8351ms)
▶ Recent Generations Database Engine
  ✔ saves, retrieves, and deduplicates recent records (0.2976ms)
  ✔ deletes individual records and clears database (0.139ms)
  ✔ exports valid formatted JSON archive (0.7808ms)
✔ Recent Generations Database Engine (2.5363ms)
▶ Preset Color Fidelity & Gradient Isolation
  ✔ Classic preset is pure solid monochrome with no gradient (0.1665ms)
  ✔ Sunset Gradient preset produces linear gradient and no solid dots color (0.0659ms)
  ✔ Switching from Sunset to Classic completely eliminates the gradient (0.0624ms)
  ✔ All 6 presets define unique and distinct color schemes (0.0395ms)
✔ Preset Color Fidelity & Gradient Isolation (0.5448ms)
ℹ tests 28
ℹ suites 0
ℹ pass 28
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

### Static Analysis & Linter
```bash
npm run lint
```

### Production Build
```bash
npm run build
npm run preview
```

---

## Community Standards & Governance

- **License**: Released under the open-source [MIT License](LICENSE).
- **Code of Conduct**: Governed by the [Contributor Covenant v2.1](CODE_OF_CONDUCT.md).
- **Contributing**: Development conventions, branch strategies, and commit rules in [CONTRIBUTING.md](CONTRIBUTING.md).
- **Security**: Vulnerability reporting protocols in [SECURITY.md](SECURITY.md).
- **Issue Templates**: Pre-configured [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) and [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) templates.
- **Pull Request Template**: Standardized PR structure defined in [PULL_REQUEST_TEMPLATE](.github/pull_request_template.md).

---

<sub>Technical Domain Task 1 Implementation. Engineered with precision.</sub>
