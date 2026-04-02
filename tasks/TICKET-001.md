# TICKET-001

## Title
Module-only library UI

## Status
done

## Goal
Remove legacy node categories like Process, Source, Sink, Mux, Fork, Join, Comment and keep only one `Module` entry.

## Acceptance Criteria
- Left library shows only `Module`
- No old template names remain in `NodeLibrary.tsx`
- Library wording reflects a module-only model

## Current Implementation
- Implemented in `src/components/NodeLibrary/NodeLibrary.tsx`
- Supporting cleanup in `src/components/NodeLibrary/NodeLibrary.css`

## Notes
This was explicitly requested by the user and should not be reverted.
