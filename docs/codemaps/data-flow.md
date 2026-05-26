# Data Flow Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        UDS Data Layer                               │
├─────────────────────────────────────────────────────────────────────┤
│  src/lib/uds-data.ts                                                │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Interface: UdsCommand, UdsGroup, UdsSubFunction,               ││
│  │            UdsNegativeResponse                                  ││
│  │                                                                 ││
│  │ Data: 35+ commands in 5 groups:                                ││
│  │   session:    8 commands (0x10-0x85)                            ││
│  │   data:       8 commands (0x14-0x55)                            ││
│  │   io:         4 commands (0x2F-0x37)                            ││
│  │   memory:    10 commands (0x35-0x77)                            ││
│  │   security:   4 commands (0x23-0x71)                            ││
│  │                                                                 ││
│  │ Helpers: getAllCommands(), findCommandBySid(),                   ││
│  │          findGroupById(), getAllNegativeResponseCodes(),         ││
│  │          generateDatabaseContext()                               ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  src/lib/uds-custom-store.ts                                        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ Zustand store (useUdsCustomStore)                               ││
│  │ Persistence: localStorage (key: uds-custom-sets)                ││
│  │                                                                 ││
│  │ Actions: addCustomSet, removeCustomSet, updateCustomSet,        ││
│  │          addCommandToSet, updateCommandInSet,                    ││
│  │          removeCommandFromSet, importFromJson, exportAllToJson, ││
│  │          clearAllCustom                                          ││
│  │                                                                 ││
│  │ Derived: getMergedGroups() → defaultGroups + customGroup        ││
│  │          getCustomCommandsFlat() → flat command array            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  src/lib/uds-sequences.ts                                           │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 6 Sequence Presets: security-access, data-transfer, ecu-reset,  ││
│  │                    session-management, dtc-reading,              ││
│  │                    routine-control                               ││
│  │ Each preset: successSteps + negativeSteps                       ││
│  │ Helper: req(), resp(), negResp() DSL                            ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        UI Components                                │
├─────────────────────────────────────────────────────────────────────┤
│  src/components/uds/                                                │
│                                                                     │
│  command-explorer.tsx                                               │
│  ├── Toolbar: Add, Import, Export, Clear (tooltips + dialogs)      │
│  ├── Custom Sets Summary (expandable)                               │
│  ├── Search (SID, name, description, sub-function)                 │
│  ├── Category Filters (7 pills: all/session/data/io/memory/        │
│  │                       security/custom)                           │
│  └── Group Cards (animated AnimatePresence)                        │
│                                                                     │
│  command-group-card.tsx                                             │
│  ├── Header: group name, color indicator, icon, command count      │
│  ├── Expanded list: command rows with SID + name + actions          │
│  └── Custom group: edit/delete buttons                             │
│                                                                     │
│  command-detail-dialog.tsx                                          │
│  ├── SID badge, name, full description                             │
│  ├── Request/Response format (code blocks)                         │
│  ├── Sub-functions table                                           │
│  ├── Negative responses table                                      │
│  ├── Related services (clickable navigation)                       │
│  └── Usage notes                                                   │
│                                                                     │
│  command-form-dialog.tsx                                            │
│  ├── SID, name, group, description fields                          │
│  ├── Request/Response format fields                                │
│  ├── Sub-functions (dynamic add/remove)                            │
│  ├── Negative responses (dynamic add/remove)                       │
│  ├── Related services, usage notes                                 │
│  └── Save/Cancel                                                   │
│                                                                     │
│  import-dialog.tsx                                                  │
│  ├── File upload or paste JSON                                     │
│  ├── Validation (requires SID + name)                              │
│  └── Supports: single command, command array, set, sets array      │
│                                                                     │
│  ai-search.tsx                                                      │
│  ├── Settings: Base URL, API Token, Model Name                     │
│  ├── Provider browser (14 pre-configured)                          │
│  ├── Chat history (Markdown rendering)                             │
│  ├── Suggested queries (6 pre-defined)                             │
│  └── Error handling (local LLM vs cloud detection)                 │
│                                                                     │
│  protocol-visualizer.tsx                                            │
│  ├── Preset selector (6 presets + single service mode)             │
│  ├── SID selector (single mode)                                    │
│  ├── Success/Negative toggle                                       │
│  ├── Animate/Pause/Reset controls                                  │
│  ├── Sequence diagram (Tester ↔ CAN Bus ↔ ECU)                    │
│  │   ├── Color-coded hex bytes per step                            │
│  │   ├── Progress bar                                              │
│  │   └── Step number badges                                        │
│  ├── Request/Response byte summary cards                           │
│  ├── Active step detail card                                       │
│  └── ISO 14229 Timing Parameters                                   │
│                                                                     │
│  hex-byte-display.tsx                                               │
│  └── ByteType: sid, subfunction, parameter, data, normal           │
│      + color maps for rendering                                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        API Layer                                    │
├─────────────────────────────────────────────────────────────────────┤
│  src/app/api/uds-search/route.ts                                    │
│  POST /api/uds-search                                               │
│  Body: { question, config, history, customCommands }               │
│                                                                     │
│  Flow:                                                              │
│  1. Validate input                                                  │
│  2. Build system prompt: generateDatabaseContext() + custom context │
│  3. Call OpenAI-compatible API (configurable baseUrl + token)      │
│  4. Return { answer }                                              │
│                                                                     │
│  Security: API token stays server-side for cloud providers         │
│  Note: Local LLMs bypass this route (browser direct call)          │
└─────────────────────────────────────────────────────────────────────┘
```