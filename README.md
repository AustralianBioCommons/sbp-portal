![Lint](https://github.com/AustralianBioCommons/sbp-portal/actions/workflows/lint.yml/badge.svg)
![Coverage](https://github.com/AustralianBioCommons/sbp-portal/actions/workflows/test-coverage.yml/badge.svg)
![Playwright E2E](https://github.com/AustralianBioCommons/sbp-portal/actions/workflows/e2e.yml/badge.svg)
![Codecov](https://img.shields.io/codecov/c/github/AustralianBioCommons/sbp-portal/main.svg)

# Structural Biology Platform (SBP) Portal

This repository contains the code for the Structural Biology Platform (SBP) web portal, which provides a user interface for accessing and managing structural biology resources.

## Development

This repository now contains a minimal Angular (Angular 21 + Tailwind) application scaffold at the repository root.

To run it locally:

1. Install Node.js (recommended: use nvm) so `node`, `npm`, and `npx` are available.
2. Install dependencies:

```bash
npm install
```

3. Start the dev server:

```bash
npm start
```

4. To run tests:

```bash
npm test
```

Notes:

- Runtime config is loaded from `src/assets/config/app-config.json` and merged with defaults from `src/environments/environment.ts`, matching the AAI portal pattern. Update `app-config.json` for local runtime config changes.
- Tailwind and PostCSS are configured via `tailwind.config.cjs` and `postcss.config.cjs`.
- If you scaffolded with a different version of Angular CLI locally, some generated files may differ; these files are a minimal starting point created without running the Angular CLI in this environment.

### Lint

To run and fix lint locally:

```bash
npm run format
```
