# CLAUDE.md

## Project overview

ChargeNode DevOps — a mobile-friendly PWA for Azure DevOps, built with React + TypeScript + Vite. Targets Android primarily, iOS secondary. Hosted on GitHub Pages at https://nord-.github.io/ChargeNodeDevOps/.

## Features

### Auth
- PAT token authentication against Azure DevOps
- Validates token before saving, persisted in localStorage

### Pipelines
- List pipelines with favorites (persisted per project in localStorage)
- Non-favorites collapsed by default
- Expandable runs panel: `#buildNumber • ci.message` on line 1, `branch · status · datetime` on line 2
- Run pipeline with branch dropdown (fetched from Git Refs API via build definition)
- Clickable branch names for quick-run with confirmation dialog
- Create release from succeeded builds (auto-matches release definitions by pipeline)

### Releases
- List release definitions with favorites
- Releases show build artifact info (build number + branch)
- Expandable stage cards (flexbox grid) with:
  - Deploy / Redeploy buttons for each stage
  - Approve / Reject buttons when pending approvals exist
- Environment status badges with color coding

### UI
- ChargeNode brand color `#1EBE69`
- MDI icons (`@mdi/js` + `@mdi/react`) — tree-shaken, named import `{ Icon }`
- Project selector in header bar (persisted in localStorage)
- Tab selection persisted in localStorage
- Smart date formatting: Today/Yesterday/dd Mon/full date, always HH:mm
- Filled button style for action buttons

### Boards
- Placeholder — not yet implemented

## Architecture

- `src/api/devops.ts` — API client with dual-host support (dev.azure.com + vsrm.dev.azure.com), methods: get, post, vsrmGet, vsrmPost, vsrmPatch
- `src/api/pipelines.ts` — Pipeline, build, branch API (uses Build API for richer data)
- `src/api/releases.ts` — Release definitions (with artifacts expand), releases, approvals, deploy
- `src/api/projects.ts` — Project listing
- `src/auth/` — PAT auth context + connect page
- `src/pipelines/` — PipelineList, RunPipelineDialog, CreateReleaseDialog
- `src/releases/` — ReleaseList with inline stage management
- `src/formatDate.ts` — Shared date formatting utility

## Commands

- `npm run dev` — start dev server
- `npm run build` — TypeScript check + production build
- `npm run lint` — ESLint
- `npm run preview` — preview production build locally

## Conventions

- Language: TypeScript (strict, `verbatimModuleSyntax` — use `import type` for type-only imports)
- Styling: plain CSS (no framework)
- Icons: `@mdi/js` + `@mdi/react` (named import `{ Icon }`, not default)
- Base path: `/ChargeNodeDevOps/` (GitHub Pages)
- Git commits: no AI attribution lines
- Deploy: GitHub Actions workflow on push to master
