# TICKET-004

## Title
Group selected nodes into structural submodule

## Status
partial

## Goal
Allow selecting multiple nodes and converting them into a hierarchical submodule.

## Acceptance Criteria
- Action exists in the UI
- Selected nodes are moved into a child netlist
- Parent netlist receives one structural module
- External connections become explicit module ports
- Connectivity is preserved
- Operation uses immutable transforms

## Current Implementation
- Store-side grouping work has started in `src/store/graphStore.ts`
- Hierarchical model exists already

## Missing
- UI entry point for grouping
- Full end-to-end validation of generated ports and rewiring
- Strong verification in the running app
