# Project Context

## Goal
Electron desktop netlist editor for drawing dummy connection graphs.

This is not an HDL, FPGA, synthesis, or simulation tool.
It is a visual netlist editor only.

## Current Product Rules
- Only one node class: `Module`
- Modules are configured by:
  - ports
  - parameters
  - code fields
- Module categories:
  - `behavioral`
  - `structural`
- Hierarchical modules own an inner netlist
- JSON DB is the project format
- Future AI should read current state here and use git history for older details

## Current Architecture
- Electron
- React 18
- TypeScript
- Zustand
- SVG canvas
- `electron-vite`

## Main Files
- `src/types/index.ts`
- `src/store/graphStore.ts`
- `src/components/Canvas/Canvas.tsx`
- `src/components/NodeBlock/NodeBlock.tsx`
- `src/components/Inspector/Inspector.tsx`
- `src/components/NodeConfigDialog/NodeConfigDialog.tsx`
- `src/components/NodeLibrary/NodeLibrary.tsx`
- `electron/main.ts`

## Current Data Model

### Top level
- `NetlistDatabase`
  - `rootNetlistId`
  - `libraryNetlistIds`
  - `netlists`

### Per netlist
- `Netlist`
  - `nodes`
  - `connections`
  - `canvasOffset`
  - `canvasScale`

### Per module
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

## Current Implemented State
- Left library shows only `Module`
- Startup example netlist:
  - `Input A`
  - `Input B`
  - `Adder`
  - `Output`
- Save/load/export JSON DB
- Copy/paste/duplicate/delete nodes
- Node IDs shown in UI
- Code fields:
  - init
  - fire
  - finish
- Ctrl-drag port repositioning
- Hierarchy navigation exists:
  - enter from node badge
  - enter from inspector
  - exit from toolbar `Up`
  - exit from `Tools -> Go Up`
  - exit with `Space`

## Current UI Expectations
- Module-only library
- Hierarchical modules must be visually distinct
- Every module must have visible name and stored ID

## In Progress
- stronger hierarchy visual styling
- explicit structural grouping from selected nodes
- auto-generated submodule ports from external connections
- preserved external connectivity during grouping

## Constraints
- Do not reintroduce old library types:
  - Process
  - Source
  - Sink
  - Mux
  - Fork
  - Join
  - Comment
- Prefer immutable transforms
- Keep commits focused
- Keep JSON human-readable

## Workflow For Future AI
1. Read this file first
2. Read git log for change history
3. Inspect only the files relevant to the next task

## Git
Use git history as the source for older logs, experiments, and previous states.
