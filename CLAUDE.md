# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UDS Diagnostics Command Explorer — a single-page interactive web app for exploring, searching, and visualizing UDS (Unified Diagnostic Services, ISO 14229) automotive diagnostic commands. Serves as a reference tool for automotive engineers and diagnostics developers.

**Stack:** Next.js 16 (App Router, standalone output), TypeScript, Tailwind CSS v4, shadcn/ui (new-york style), Zustand v5, Framer Motion v12

## Commands

```bash
npm run dev          # Dev server on port 3000
npm run build       # Production build (standalone output)
npm run start       # Start production server
npm run lint        # ESLint (note: all rules currently disabled)
npm run db:push     # Push Prisma schema to SQLite (scaffold only)
npm run db:generate # Generate Prisma client
```

Production deployment uses Caddy as reverse proxy (port 81 → localhost:3000), configured in `Caddyfile`.

## Architecture

Single-page app with three tabs rendered in `src/app/page.tsx`:

1. **Command Explorer** — Search/filter 35+ built-in UDS commands across 5 groups, plus custom commands. Import/export custom command JSON.
2. **AI Search** — Chat interface to OpenAI-compatible APIs. Local LLMs called directly from browser; cloud LLMs proxied through `/api/uds-search` to protect API keys.
3. **Protocol Visualizer** — Animated sequence diagrams (Tester ↔ CAN Bus ↔ ECU) with step-by-step playback and color-coded hex bytes.

### Key Files

| File | Role |
|------|------|
| `src/lib/uds-data.ts` | Core UDS database: all commands, types, helper functions (~1064 lines). `generateDatabaseContext()` produces compact text for AI prompts. |
| `src/lib/uds-custom-store.ts` | Zustand store for custom commands with localStorage persistence (key: `uds-custom-sets`). CRUD + import/export. |
| `src/lib/uds-sequences.ts` | Pre-defined protocol sequence diagrams for the visualizer. |
| `src/components/uds/` | All application-specific components (explorer, dialogs, AI search, visualizer). |
| `src/components/ui/` | ~45 shadcn/ui generated components — do not manually edit, use `npx shadcn@latest add`. |
| `src/app/api/uds-search/route.ts` | POST proxy to OpenAI-compatible API for cloud LLM calls. |

### Data Flow

- UDS command data is embedded directly in `uds-data.ts` (no external database for commands)
- `getMergedGroups()` from the custom store appends user-created commands as a "Custom Commands" group
- AI search builds its system prompt from `generateDatabaseContext()` + custom commands context
- All client state persisted via Zustand + localStorage

### Color Coding Convention

Groups and hex byte types share a consistent color scheme:
- Session & Communication: emerald | SID bytes: emerald
- Data Access: amber | Sub-function bytes: amber
- Input/Output Control: violet | Parameter bytes: violet
- Memory & Programming: rose | Data bytes: rose
- Security: slate | Custom: cyan

## Configuration Notes

- `next.config.ts`: `ignoreBuildErrors: true`, `reactStrictMode: false`, standalone output
- `tsconfig.json`: `noImplicitAny: false`, strict mode otherwise
- `eslint.config.mjs`: All lint rules explicitly disabled
- `tailwind.config.ts`: CSS variable-based colors, class-based dark mode
- Prisma + SQLite is scaffolded but not connected to app functionality
- No test framework is configured
