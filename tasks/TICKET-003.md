# TICKET-003

## Title
Behavioral and structural module typing

## Status
partial

## Goal
Support explicit module typing:
- behavioral
- structural

And make hierarchical modules visually obvious.

## Acceptance Criteria
- Node model has an explicit type field
- Hierarchical modules show a clear indicator
- Structural modules are visually distinct from simple modules
- Inspector/config expose the type information

## Current Implementation
- Type field work has started in shared types/store
- Hierarchical badge exists in `src/components/NodeBlock/NodeBlock.tsx`
- Inspector exposes hierarchy kind

## Missing
- Visual distinction needs to be stronger
- Type/kind presentation should be simplified and made fully consistent
