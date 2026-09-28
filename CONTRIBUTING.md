# Contributing Guidelines

Thank you for contributing to QR Studio. We welcome community contributions, bug reports, and feature proposals.

## Development Workflow

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/kkm121/qr-gen.git
   cd qr-gen
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Start Development Server**:
   ```bash
   npm run dev
   ```
4. **Create a Feature Branch**:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bugfix-name
   ```

## Commit Standards

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat:` A new feature or capability
- `fix:` A bug fix
- `docs:` Documentation modifications
- `test:` Adding or updating automated tests
- `refactor:` Code refactoring without behavior change
- `perf:` Performance improvements
- `chore:` Build scripts, dependencies, or configuration changes

## Verification Checklist

Before submitting a pull request, verify the following locally:

1. **Unit Tests**:
   ```bash
   npm test
   ```
   All tests must pass cleanly.
2. **Linter & Code Standards**:
   ```bash
   npm run lint
   ```
   Zero errors and zero warnings required.
3. **Production Typecheck & Build**:
   ```bash
   npm run build
   ```
   TypeScript static checks and Vite production bundling must succeed with exit code 0.
4. **Scannability Assurance**: Any new visual styles or color presets must be verified scannable against real-world smartphone camera lenses.

## Submitting Pull Requests

1. Push your branch to your remote fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request targeting the `main` branch.
3. Complete the [Pull Request Template](.github/pull_request_template.md) with details of changes, testing steps, and relevant screenshots.
