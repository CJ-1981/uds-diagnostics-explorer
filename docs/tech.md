# Technology Decisions

## Framework: Next.js 16 (App Router)

- **Why**: Server components by default for performance, file-based routing, built-in API routes for the LLM proxy
- **Trade-off**: Standalone output adds build complexity but enables single-binary deployment
- **React 19**: Leverages Server Components, Actions pattern (though not used here), and concurrent rendering

## UI Layer: Tailwind CSS 4 + shadcn/ui

- **Why**: Tailwind CSS 4 provides the fastest CSS-in-JS workflow; shadcn/ui offers 60+ accessible Radix-based components
- **shadcn/ui components are local**: Copied into `src/components/ui/` — fully customizable, no npm dependency
- **Framer Motion**: Used for page transitions, sequence animation in the protocol visualizer, and dialog animations

## State Management: Zustand 5

- **Why**: Minimal boilerplate, no context providers, built-in localStorage persistence pattern
- **Used for**: Custom UDS command store (CRUD operations, JSON import/export)
- **Not used**: TanStack Query available in dependencies but not utilized yet (router-based data fetching suffices)

## Database: Prisma + SQLite

- **Light usage**: Schema defines User and Post models but no complex queries are used in the current version
- **Connection**: Singleton PrismaClient pattern (`src/lib/db.ts`) to avoid hot-reload connection leaks
- **Environment**: `DATABASE_URL=file:/home/z/my-project/db/custom.db` (SQLite file path)

## AI Integration: OpenAI-Compatible API Proxy

- **Architecture**: Dual-path — cloud LLMs route through Next.js API route (`/api/uds-search`), local LLMs call directly from browser
- **Security**: API tokens proxied through server (not exposed to client) for cloud providers
- **System Prompt**: Full UDS database context (1064-line reference) injected as system message
- **Supported providers**: OpenAI, DeepSeek, Mistral, Groq, Together AI, Fireworks, Perplexity, Cerebras, SambaNova, AI21, OpenRouter, Ollama, LM Studio, vLLM

## Development Tools

- **TypeScript 5**: Bundler module resolution, strict mode (with noImplicitAny disabled)
- **ESLint 9**: Flat config with `eslint-config-next`
- **Scripts**: Shell-based lifecycle in `.zscripts/` (dev.sh, build.sh, start.sh)
- **Deployment**: Caddyfile provided for production reverse proxy

## Data Architecture

- **UDS Command Database**: Static TypeScript data in `src/lib/uds-data.ts` (~1064 lines)
  - 35+ commands across 5 groups (Session, Data, I/O, Memory, Security)
  - Each command: SID, name, description, request/response format, sub-functions, negative responses, related services
- **Sequence Presets**: 6 diagnostic workflows defined in `src/lib/uds-sequences.ts` (Security Access, Data Transfer, ECU Reset, Session Management, DTC Operations, Routine Control)
- **Custom Commands**: localStorage-based, import/export via JSON, merged with static database at runtime

## Known Limitations

- TypeScript `ignoreBuildErrors: true` in next.config.ts — build succeeds even with type errors
- React strict mode disabled (`reactStrictMode: false`)
- No automated test suite configured
- Prisma schema has User/Post models not connected to any UI feature (scaffolded)
- AI Search uses `suppressHydrationWarning` on `<html>` element due to next-themes SSR mismatch