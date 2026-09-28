# Contributing

Thanks for your interest in this GDG SRM recruitment submission.

## How to contribute

1. Fork the repo and create a branch: `git checkout -b feat/my-change`.
2. Install and run locally:
   ```bash
   npm install
   npm run dev
   ```
3. Keep changes focused; match the existing code style (TypeScript, functional React).
4. Verify before pushing:
   ```bash
   npm run build
   ```
   Manually test the 5 QR types, customization, PNG/SVG download, invalid inputs, and page refresh persistence.
5. Open a pull request using the provided template, including screenshots for UI changes.

## Guidelines

- Do not commit `node_modules/` or `dist/`.
- Do not paste code you don't own — original work only (recruitment plagiarism rules apply).
- Keep QR outputs scannable: any new style/preset must pass a real phone-camera scan test.
- Update `README.md` and `screenshots/` when behavior or UI changes.
