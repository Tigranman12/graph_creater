# Project Context

## Purpose
Electron desktop netlist editor for visually building and editing dummy connection graphs.

This project is not an HDL, FPGA, synthesis, or simulation tool.
It is a graphical netlist editor with a clean canvas workflow.

## Product Direction
- One module/node class only.
- Modules are configured by parameters, ports, and code fields.
- Modules can be:
  - `behavioral`
  - `structural` / hierarchical
- Hierarchical modules own an inner netlist.
- Users must be able to enter and exit hierarchy.
- JSON is the project database format.
- Copy, duplicate, delete, save, load, and export must preserve data safely.

## Current Architecture

### Core stack
- Electron
- React 18
- TypeScript
- Zustand
- SVG canvas rendering
- `electron-vite`

### Important files
- `src/types/index.ts`
  Shared model types.
- `src/store/graphStore.ts`
  Main application state, JSON DB model, hierarchy navigation, copy/paste, save/export data.
- `src/components/Canvas/Canvas.tsx`
  Selection, dragging, canvas pan/zoom, connection drag.
- `src/components/NodeBlock/NodeBlock.tsx`
  Node rendering and hierarchy badge rendering.
- `src/components/Inspector/Inspector.tsx`
  Node/project actions.
- `src/components/NodeConfigDialog/NodeConfigDialog.tsx`
  Node configuration UI.
- `src/components/NodeLibrary/NodeLibrary.tsx`
  Left library panel.
- `electron/main.ts`
  Native menu wiring.

## Data Model

### Current persisted model
- `NetlistDatabase`
  - `rootNetlistId`
  - `libraryNetlistIds`
  - `netlists`
- `Netlist`
  - `nodes`
  - `connections`
  - `canvasOffset`
  - `canvasScale`
- `GraphNode`
  - `id`
  - `name`
  - `subtitle`
  - `moduleType`
  - `moduleKind`
  - `subgraphId`
  - `ports`
  - `parameters`
  - `code`

### Meaning
- `moduleType`
  Explicit type field for user-facing classification.
  Current intended values:
  - `behavioral`
  - `structural`
- `moduleKind`
  Internal rendering/navigation behavior.
  Current values:
  - `behavioral`
  - `hierarchical`

## Current Implemented Features
- Module-only library UI.
- Initial sample netlist on startup:
  - `Input A`
  - `Input B`
  - `Adder`
  - `Output`
- Copy selected nodes.
- Paste clipboard.
- Duplicate node.
- Delete node / selected nodes.
- Save/load/export JSON DB.
- Hierarchical module creation support in the model.
- Enter hierarchy:
  - top-right node badge
  - inspector action
- Exit hierarchy:
  - toolbar `Up`
  - `Tools -> Go Up`
  - `Space`
- Code fields:
  - init
  - fire
  - finish
- Ctrl-drag port repositioning.

## Current UI Expectations
- Left panel should show only one library item:
  - `Module`
- Nodes must display:
  - name
  - ID
- Hierarchical nodes should be visually distinct.

## Git History So Far
- `d4c8a22` `chore: add repo ignore rules`
- `13626b3` `feat: add module-based hierarchical netlist editor`
- `4413c60` `chore: ignore local codex marker`
- `a33b749` `refactor: keep library module-only`

## Current Dev Run
- `npm run dev`
- Electron dev server has been run successfully in this repo.

## Active Requested Roadmap

### High priority
- Stronger hierarchy visualization:
  - clearer icon/badge
  - optional structural border style
  - obvious difference between simple and hierarchical modules
- Group selected nodes into a hierarchical submodule.
- Auto-create submodule ports from external connections.
- Preserve external connectivity by converting crossing connections into explicit ports.
- Keep data handling immutable.
- Keep commits clean and isolated.

### Expected grouping behavior
When multiple selected nodes are converted into a hierarchical submodule:
- selected nodes move into a new child netlist
- parent canvas receives one structural module node
- external incoming/outgoing links become ports on the new module
- internal connectivity is preserved
- parent connectivity is rewired through the new module ports

## Rules For Future AI Sessions
- Do not reintroduce old library node types such as:
  - Process
  - Source
  - Sink
  - Mux
  - Fork
  - Join
  - Comment
- Treat this as a module-only editor.
- Prefer immutable transforms over in-place mutation.
- Keep JSON human-readable.
- Keep git history clean with focused commits.
- Before large changes, read:
  - `PROJECT_CONTEXT.md`
  - `summ.md`
  - `claude.md`

## Recommended Next Steps
1. Finish `group selected -> submodule` in `graphStore.ts`.
2. Add inspector and toolbar action for grouping selected nodes.
3. Strengthen hierarchical node visual style in `NodeBlock.tsx`.
4. Build and run.
5. Commit the change as a focused hierarchy feature commit.
