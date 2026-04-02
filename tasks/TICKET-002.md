# TICKET-002

## Title
JSON netlist database and hierarchy navigation

## Status
done

## Goal
Represent the project as a JSON DB with multiple netlists and support entering/exiting hierarchical modules.

## Acceptance Criteria
- `NetlistDatabase` exists in the shared types
- Project export writes the DB structure
- Hierarchical nodes can be entered
- Parent navigation is available
- Save/load preserves nested netlists

## Current Implementation
- `src/types/index.ts`
- `src/store/graphStore.ts`
- `src/components/Toolbar/Toolbar.tsx`
- `electron/main.ts`

## Notes
Current navigation entry points:
- node hierarchy badge
- inspector enter action
- toolbar up button
- `Space`
- `Tools -> Go Up`
