# Session Summary — Electron Graph Editor (graph_creater)

**Date:** 2026-04-02  
**Model:** Claude Sonnet 4.6  
**Working directory:** `/home/tigran/workspace/Codex/graph_creater/`

---

## What was built in this session

A full Electron + React + TypeScript graph/netlist editor was scaffolded from scratch based on `claude.md` spec.

### Stack
- Electron (desktop shell)
- React 18 + TypeScript
- electron-vite (bundler)
- Zustand (state management)
- SVG (canvas rendering — nodes, ports, connections)
- uuid (ID generation)

### Project structure created
```
graph_creater/
├── package.json
├── tsconfig.json / tsconfig.node.json / tsconfig.web.json
├── electron.vite.config.ts
├── electron/
│   ├── main.ts          — Electron main process, native menus, IPC handlers
│   └── preload.ts       — contextBridge exposes window.electronAPI
└── src/
    ├── index.html
    ├── main.tsx          — React entry point
    ├── App.tsx           — Main layout (toolbar / library / canvas / inspector)
    ├── App.css
    ├── types/index.ts    — All shared TypeScript types
    ├── store/graphStore.ts — Zustand store, all state + actions
    ├── engines/
    │   ├── routing.ts    — Orthogonal line routing with obstacle avoidance
    │   └── validation.ts — Connection direction/duplicate rules
    ├── utils/storage.ts  — Save/load/export JSON
    └── components/
        ├── Canvas/       — SVG canvas, pan/zoom/drag/selection
        ├── NodeBlock/    — Renders a single node in SVG
        ├── PortDot/      — Port circle with direction indicator
        ├── ConnectionLine/ — Routed connection path
        ├── Inspector/    — Right panel (node/connection/project info)
        ├── NodeLibrary/  — Left panel, node templates
        ├── Toolbar/      — Top bar, file/edit/view actions
        └── NodeConfigDialog/ — Tabbed modal: General/Ports/Parameters/Style
```

### Features implemented
- Node CRUD (add, rename, move, delete, duplicate, lock, collapse)
- Port CRUD (add, remove, rename, direction, side, maxConnections)
- Drag-to-connect with live preview, valid/invalid port highlighting
- Orthogonal connection routing with obstacle avoidance
- Undo/redo (50-deep snapshot stack)
- Save/load project as JSON (via Electron file dialogs)
- Export dummy netlist JSON
- Canvas pan (alt+drag or middle-click), zoom (wheel), fit-to-screen
- Selection rectangle, multi-select
- Node config dialog (4 tabs: General / Ports / Parameters / Style)
- Inspector panel (3 modes: node / connection / nothing selected)
- Node library with 9 templates (Blank, Process, Source, Sink, etc.)
- Dark theme, professional color scheme
- Native Electron menus (File/Edit/View) wired to renderer via IPC
- Keyboard shortcuts: Delete, Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z

---

## Changes implemented (session 2 — 2026-04-02)

All implemented and building cleanly.

### 1. Unified Module Class — All Nodes Are the Same Type

Currently there are multiple "templates" (Process, Source, Sink, etc.) that create slightly different node shapes. This must be changed.

**New requirement:**
- There is only ONE node/module class (call it `Module`)
- All modules look identical by default
- Modules are differentiated entirely through their configuration parameters
- No fixed "type" determines behavior — only parameters do
- Node library templates still exist but they only pre-fill parameters, not a different class

### 2. Code Fields in Node Config Dialog

The NodeConfigDialog must have a new tab or expanded section: **"Code"**

This tab must contain these text areas (multi-line, syntax-aware if possible):

| Field | Description |
|-------|-------------|
| **Init Code** | Code that runs once when the module initializes |
| **Fire Code** | Main execution code (triggered on input) |
| **Finish Code** | Cleanup/teardown code |

Each field should:
- Be a large multi-line `<textarea>` (or a simple code editor widget)
- Support free-form text in any language (C++, Python, TCL, etc.)
- Have a language selector dropdown per field (or a single global language selector for the module)
- Show a monospace font (like a code editor)
- Syntax highlighting is desirable but optional (use a lightweight library like `highlight.js` or `CodeMirror` if possible without bloating)
- Store as plain string in the node's `parameters` or a dedicated `code` field on the GraphNode

Suggested model change:
```typescript
export interface NodeCode {
  language: string;      // 'cpp' | 'python' | 'tcl' | 'plain' | etc.
  initCode: string;
  fireCode: string;
  finishCode: string;
}

export interface GraphNode {
  // ... existing fields ...
  code: NodeCode;        // NEW field
}
```

### 3. Ctrl+Drag to Move Ports to Any Corner/Side

Currently ports are fixed to left/right sides by their `side` property set in config.

**New requirement:**
- While holding `Ctrl`, the user can drag any port dot from its current position to any edge/corner of the node
- Dragging a port with Ctrl held shows a ghost/preview of where the port will land
- Releasing on a node edge snaps the port to that side at that position
- Port order on that side updates automatically
- Ports can be placed on: `left`, `right`, `top`, `bottom`
- This is a direct WYSIWYG port placement instead of using the config dialog

**Implementation hint:**
- In `PortDot.tsx`: detect `Ctrl` key on mousedown → enter "port drag" mode
- In `Canvas.tsx` or `NodeBlock.tsx`: during port drag, compute nearest edge of parent node → show snap indicator
- On mouseup: call `updatePort(nodeId, portId, { side: newSide, order: newOrder })`

### 4. Parameters Drive I/O (Unified Object Model)

All modules are instances of the same class. The I/O ports (input/output) of a module are defined entirely by its parameter configuration. This means:

- Changing a parameter in the config dialog can add or remove ports
- Example: a parameter `num_inputs = 3` means the module gets 3 input ports auto-generated
- There may be "port-generating parameters" — special parameter types that create ports when set
- Non-port parameters are metadata/code fields

Suggested approach:
- Add a `paramType` field to `NodeParameter`:
  ```typescript
  export type ParamType = 'text' | 'number' | 'port_generator' | 'code' | 'flag';
  export interface NodeParameter {
    id: string;
    key: string;
    value: string;
    paramType: ParamType;
  }
  ```
- When `paramType === 'port_generator'`, the store auto-generates ports based on the value

---

## Files to modify / create in next session

| File | Change needed |
|------|--------------|
| `src/types/index.ts` | Add `NodeCode` type, `code` field to `GraphNode`, add `paramType` to `NodeParameter` |
| `src/store/graphStore.ts` | Update node creation to always use unified Module class, add code field to default node |
| `src/components/NodeConfigDialog/NodeConfigDialog.tsx` | Add "Code" tab with Init/Fire/Finish code areas + language selector |
| `src/components/NodeConfigDialog/NodeConfigDialog.css` | Style code editor fields (monospace, dark bg, scrollable) |
| `src/components/PortDot/PortDot.tsx` | Add Ctrl+drag port repositioning |
| `src/components/Canvas/Canvas.tsx` | Handle port drag mode (Ctrl held), show snap preview |
| `src/components/NodeLibrary/NodeLibrary.tsx` | Templates only set parameters, not different classes |
| `src/components/NodeBlock/NodeBlock.tsx` | Handle ports on top/bottom edges as well |
| `src/engines/routing.ts` | Handle ports on all 4 sides (top/bottom already partially there) |

---

## How to run the project

```bash
cd /home/tigran/workspace/Codex/graph_creater
npm run dev
```

This starts the Electron app with Vite hot-reload.

To build a distributable:
```bash
npm run build
```

---

## Notes for future AI sessions

- This project is a **visual graph/netlist editor only** — not an EDA/hardware tool
- The user cares a lot about visual quality: clean routing, polished UI, comfortable UX
- All node templates must collapse into one unified `Module` class
- The code fields (init/fire/finish) are for user-authored simulation/processing scripts, not for synthesis
- Port placement via Ctrl+drag is a high-priority UX feature
- Keep strong separation between: data model (`types/`), state (`store/`), rendering (`components/`), routing logic (`engines/`)
- The project uses `electron-vite` — entry points are `electron/main.ts` and `src/main.tsx`
- `window.electronAPI` is the IPC bridge (defined in `src/types/index.ts` as global Window augmentation)
- Save format is plain JSON — keep it human-readable
