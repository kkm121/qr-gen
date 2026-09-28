# Security Policy

## Supported versions

This is a recruitment submission. The latest commit on the default branch is the
supported version.

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Instead, contact
the repository owner privately with:

- A description of the issue
- Steps to reproduce
- The commit hash you tested

Expect an acknowledgement within 7 days.

## Scope notes

- This app is fully client-side: no server, no accounts, no tracking.
- Uploaded logos are processed in-browser via `FileReader` and never leave the device.
- QR payloads and preferences persist only in the visitor's own `localStorage`.
- There is no secret handling; do not commit tokens or private URLs.
