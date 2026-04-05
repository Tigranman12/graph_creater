# graph_creater

A beautiful Electron desktop app for drawing and editing visual connection graphs and netlists.

Not an EDA or hardware tool — purely a **graphical node-and-channel editor** focused on clean visuals and comfortable editing.

## Features

- **Unified module model** — all nodes are the same class, differentiated by parameters
- **SVG canvas** — pan, zoom, fit-to-screen, drag nodes, multi-select
- **Orthogonal routing** — clean lines that avoid node bodies and reroute on move
- **Port management** — add/remove/rename ports on any side (left/right/top/bottom), Ctrl+drag to reposition
- **Port generator parameters** — a parameter of type `port_generator` auto-creates ports
- **Hierarchical subgraphs** — group nodes into submodules, drill in/out
- **Code fields per node** — init / fire / finish code blocks with language selector (C++, SystemC, Python, TCL)
- **Node config dialog** — 5 tabs: General / Ports / Parameters / Code / Style
- **Inspector panel** — context-sensitive right panel for node, connection, or project info
- **Undo/redo** — 50-deep history
- **Save / Load / Export** — JSON project files via native Electron file dialogs
- **Keyboard shortcuts** — Ctrl+Z/Y, Ctrl+C/V, Ctrl+G (group), Delete, Space (exit hierarchy)

## Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron |
| UI | React 18 + TypeScript |
| Bundler | electron-vite |
| State | Zustand |
| Rendering | SVG |

## Getting Started

```bash
npm install
npm run dev
```

To build a distributable:

```bash
npm run build
```

## Project Structure

```
src/
├── types/index.ts              # All shared TypeScript types
├── store/graphStore.ts         # Zustand store — all state and actions
├── engines/
│   ├── routing.ts              # Orthogonal routing, port anchors, node height
│   └── validation.ts           # Connection direction / duplicate rules
├── utils/
│   ├── storage.ts              # Save / load / export JSON
│   └/Quadtree.ts              # Spatial index for canvas performance
└── components/
    ├── Canvas/                 # SVG canvas, pan/zoom/drag/selection
    ├── NodeBlock/              # Single node renderer
    ├── PortDot/                # Port circle with direction indicator
    ├── ConnectionLine/         # Routed connection path
    ├── Inspector/              # Right panel
    ├── NodeLibrary/            # Left panel — module templates
    ├── Toolbar/                # Top bar — file/edit/view actions
    └── NodeConfigDialog/       # 5-tab node config modal
```

## License

MIT
