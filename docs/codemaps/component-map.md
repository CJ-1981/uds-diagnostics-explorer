# UDS Diagnostics Command Explorer — Code Map

## Entry Points

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout — fonts, ThemeProvider, Toaster, metadata |
| `src/app/page.tsx` | Main page — 3-tab layout (Explorer, AI Search, Visualizer) |
| `src/app/api/route.ts` | Health check endpoint |
| `src/app/api/uds-search/route.ts` | LLM proxy API (OpenAI-compatible) |

## Component Tree

```
RootLayout (layout.tsx)
└── Home (page.tsx)
    ├── Tabs
    │   ├── [explorer] CommandExplorer
    │   │   ├── Toolbar (Add, Import, Export, Clear)
    │   │   ├── SearchInput
    │   │   ├── CategoryFilters
    │   │   ├── CommandGroupCard (×N)
    │   │   │   └── CommandDetailDialog
    │   │   ├── CommandFormDialog (Add/Edit)
    │   │   └── ImportDialog
    │   │
    │   ├── [ai-search] AISearch
    │   │   ├── SettingsDialog (LLM config)
    │   │   │   └── ProviderBrowser
    │   │   ├── ChatHistory (Message list)
    │   │   └── InputArea
    │   │
    │   └── [visualizer] ProtocolVisualizer
    │       ├── ControlBar (preset/SID select, animate/reset)
    │       ├── SequenceDiagram (Tester ↔ CAN Bus ↔ ECU)
    │       ├── StepDetailCard
    │       └── TimingParams (P2, P2*, S3 values)
    │
    └── Footer
```

## Data Flow

### Command Explorer
```
uds-data.ts (static DB) ─┐
                          ├──→ CommandExplorer → CommandGroupCard → CommandDetailDialog
uds-custom-store.ts ─────┘
  └─ localStorage (persist)
  └─ getMergedGroups() → merges default + custom
```

### AI Search
```
User Input
  ├── Local LLM → fetch(localhost:port/v1/chat/completions) [browser direct]
  └── Cloud LLM → POST /api/uds-search → fetch(provider/v1/chat/completions) [server proxy]
                    └─ generateDatabaseContext() → system prompt (full UDS reference)
                    └─ uds-custom-store → custom commands appended to context
```

### Protocol Visualizer
```
uds-sequences.ts ──→ ProtocolVisualizer
  ├── SEQUENCE_PRESETS[6 presets]
  │     └── successSteps / negativeSteps
  └── Single Service mode → buildSingleSteps(uds-data.ts)
                          └── Color-coded byte rendering (hex-byte-display types)
```

## State Locations

| State | Location | Persistence |
|-------|----------|-------------|
| Custom UDS commands | Zustand store (`uds-custom-store.ts`) | localStorage |
| LLM config | React state + effect | localStorage |
| Chat messages | React state + effect | localStorage |
| Explorer filters | React state (search, category, expanded) | Session only |
| Visualizer state | React state (preset, step visibility) | Session only |