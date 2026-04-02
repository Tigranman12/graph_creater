# Tasks

This directory tracks the project as tickets so another AI or engineer can continue work without re-discovering context.

## Structure
- `tickets.json`
  Machine-readable task list and status.
- `TICKET-*.md`
  Human-readable ticket details, acceptance criteria, and implementation notes.

## Status meanings
- `done`
  Implemented and expected to be present in the codebase.
- `partial`
  Some implementation exists, but acceptance criteria are not fully satisfied.
- `todo`
  Not implemented yet.

## Validation
Run:

```bash
npm run check:tasks
```

The checker does two things:
- verifies expected implementation markers in the codebase
- runs `npm run build`

This checker is heuristic. It does not replace real UI testing, but it gives a fast signal about whether ticket status still matches the code.
