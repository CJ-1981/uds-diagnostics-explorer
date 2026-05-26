# Project Structure

```
uds-diagnostics-explorer/
├── .env                          # Environment variables (DATABASE_URL)
├── Caddyfile                     # Caddy web server config (production)
├── CLAUDE.md                     # MoAI orchestration directives
├── components.json               # shadcn/ui configuration
├── eslint.config.mjs             # ESLint 9 flat config
├── next.config.ts                # Next.js 16 config (standalone output)
├── package.json                  # Dependencies & scripts
├── postcss.config.mjs            # PostCSS with Tailwind CSS v4
├── tailwind.config.ts            # Tailwind CSS v4 configuration
├── tsconfig.json                 # TypeScript config (bundler module resolution)
│
├── docs/                         # Project documentation
│   ├── product.md
│   ├── structure.md
│   └── tech.md
│
├── .moai/                        # MoAI configuration
│   └── config/sections/          # User, language, and project settings
│       ├── user.yaml
│       └── language.yaml
│
├── .claude/                      # Claude Code AI configuration
│   └── rules/moai/               # Orchestration, design, dev, and workflow rules
│       ├── core/
│       ├── design/
│       ├── development/
│       ├── languages/
│       └── workflow/
│
├── .zscripts/                    # Shell scripts for dev/build/start lifecycle
│   ├── dev.sh
│   ├── build.sh
│   ├── start.sh
│   ├── mini-services-install.sh
│   ├── mini-services-build.sh
│   └── mini-services-start.sh
│
├── prisma/                       # Database schema
│   └── schema.prisma             # SQLite schema (User, Post models)
│
├── public/                       # Static assets
│   ├── logo.svg
│   └── robots.txt
│
└── src/
    ├── app/                      # Next.js App Router pages
    │   ├── globals.css           # Global styles + Tailwind CSS v4
    │   ├── layout.tsx            # Root layout (Geist font, ThemeProvider)
    │   ├── page.tsx              # Home page (3-tab layout)
    │   └── api/
    │       ├── route.ts          # Root API (health check)
    │       └── uds-search/route.ts  # LLM proxy API (calls OpenAI-compatible)
    │
    ├── components/
    │   ├── ui/                   # shadcn/ui primitives (60+ components)
    │   └── uds/                  # Domain-specific components
    │       ├── ai-search.tsx              # AI chat assistant
    │       ├── command-detail-dialog.tsx  # Command detail modal
    │       ├── command-explorer.tsx       # Main explorer with toolbar
    │       ├── command-form-dialog.tsx    # Add/edit command form
    │       ├── command-group-card.tsx     # Group card with command list
    │       ├── hex-byte-display.tsx       # Color-coded hex byte viewer
    │       ├── import-dialog.tsx          # JSON import dialog
    │       └── protocol-visualizer.tsx    # Sequence diagram visualizer
    │
    ├── hooks/                    # Custom React hooks
    │   ├── use-mobile.ts         # Mobile detection hook
    │   └── use-toast.ts          # Toast notification hook
    │
    └── lib/                      # Utility libraries and data
        ├── db.ts                 # Prisma client singleton
        ├── uds-custom-store.ts   # Zustand store for custom commands
        ├── uds-data.ts           # Complete UDS command database (~1064 lines)
        ├── uds-sequences.ts      # Sequence presets for protocol visualizer
        └── utils.ts              # cn() utility (clsx + tailwind-merge)
```

## Key Architecture Decisions

- **Standalone Next.js build**: Outputs self-contained deployment with all assets
- **Client-side LLM calls**: Local LLMs called directly from browser; cloud LLMs proxied via server API
- **localStorage persistence**: Custom commands and LLM config stored in browser storage (no backend required)
- **shadcn/ui + Tailwind CSS v4**: Component-first styling with consistent design tokens