# TICKET-005

## Title
Task checker and continuation workflow

## Status
done

## Goal
Provide repo-tracked tasks and a checker so future AI sessions can continue reliably.

## Acceptance Criteria
- Repo contains task directory
- Tasks are human-readable
- Tasks are machine-readable
- Checker script exists
- Checker can run build validation

## Current Implementation
- `tasks/`
- `scripts/check-tasks.mjs`
- `npm run check:tasks`
