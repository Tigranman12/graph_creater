# TICKET-007

## Title
Fix persisting selection/ghost dotted lines

## Status
todo

## Goal
Ensure that selection rectangles, port drag ghosts, and snap lines are correctly cleared and only visible during active interactions.

## Acceptance Criteria
- Selection rectangle disappears immediately on mouse up.
- Port drag ghost and snap lines disappear immediately on mouse up.
- No "ghost" lines remain on the canvas after a drag or selection operation is cancelled.
