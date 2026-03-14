# ChargeNode DevOps

Mobile-friendly PWA for interacting with Azure DevOps on the go.

**Live:** https://nord-.github.io/ChargeNodeDevOps/

## Features

- **Auth** — Connect with a Personal Access Token (PAT)
- **Pipelines** — List, trigger on any branch, view build runs with status and commit messages
- **Releases** — List definitions, view releases with build info, deploy/redeploy stages, approve/reject pending approvals
- **Favorites** — Star pipelines and release definitions for quick access
- **PWA** — Installable on Android/iOS with offline shell caching

## Tech stack

- React + TypeScript + Vite
- Material Design Icons (@mdi/js)
- PWA with service worker
- GitHub Actions for deploy to GitHub Pages

## Getting started

```bash
npm install
npm run dev
```

## Build & deploy

```bash
npm run build
```

Pushes to `master` automatically deploy to GitHub Pages via the workflow in `.github/workflows/deploy.yml`.
