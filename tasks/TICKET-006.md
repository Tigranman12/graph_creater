# TICKET-006

## Title
Ctrl-restricted multi-selection

## Status
done

## Goal
Restrict multi-selection of nodes and connections to only when the Ctrl (or Cmd) key is pressed.

## Acceptance Criteria
- Clicking a node without Ctrl clears existing selection and selects only that node.
- Clicking a node with Ctrl toggles its selection state without clearing others.
- Clicking a connection without Ctrl clears existing selection and selects only that connection.
- Clicking a connection with Ctrl toggles its selection state (if supported by store).
- Selection rectangle behavior should also consider Ctrl for additive selection (optional, but good for UX).

## Implementation Details
- Update `handleNodeMouseDown` in `src/components/Canvas/Canvas.tsx` to check for `e.ctrlKey || e.metaKey`.
- Currently, `e.shiftKey` is used for toggling; this should be changed to `Ctrl/Meta` to match standard diagram editor conventions.
- Update connection click handling in `src/components/ConnectionLine/ConnectionLine.tsx` if necessary.
