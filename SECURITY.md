# Security Policy

## Supported Versions

The latest commit on the primary repository branch (`main`) is the actively maintained and supported version.

| Version | Supported | Notes |
| :--- | :--- | :--- |
| `1.0.x` (latest) | Yes | Actively maintained client-side release |
| `< 1.0.0` | No | Legacy prototype releases |

## Reporting a Vulnerability

If you discover a security vulnerability or sensitive bug within this repository, please **do not** open a public issue. Instead, report it privately to the repository maintainer through private GitHub vulnerability reporting or direct contact.

Please include:
- A clear description of the potential vulnerability
- Step-by-step instructions or proof of concept to reproduce the issue
- Affected browser versions or operating systems
- Commit hash or tag tested

Expect an initial acknowledgement within 48 to 72 hours.

## Security Architecture & Scope

- **100% Client-Side Execution**: All QR matrix synthesis, Reed-Solomon calculations, and image rasterization occur entirely in the visitor's local browser runtime. No data is transmitted to external servers.
- **Local Asset Handling**: Custom logo uploads are parsed in-memory using the standard browser `FileReader` API as data URIs and never leave the device.
- **Client Storage**: Recent generations are persisted strictly within the user's browser `IndexedDB` storage with client-side export and atomic deletion controls.
- **Dependency Integrity**: Regular dependency vulnerability audits are conducted with zero tolerated CVEs.
