# Pull Request Template

## What changed

<!-- Describe the change and why it is needed -->

## Task checklist mapping

- [ ] QR generation / types / validation
- [ ] Customization / presets
- [ ] Download (PNG matches preview)
- [ ] Scan reliability warnings
- [ ] Recents persist after refresh
- [ ] Responsive (desktop + mobile)
- [ ] README / screenshots updated

## How to test

1. `npm install && npm run dev`
2. Test each affected QR type and customization control.
3. Scan the output with a phone camera.
4. `npm run build` passes.

## Screenshots

<!-- Paste before/after screenshots here -->

## Checklist

- [ ] Original work only (no plagiarism)
- [ ] No secrets committed
- [ ] `npm run build` passes
