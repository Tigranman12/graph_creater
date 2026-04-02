# TICKET-008

## Title
High-performance rendering and Quadtree optimization

## Status
todo

## Goal
Optimize the engine to handle large netlists (1000+ nodes) and scale towards 200k objects without UI lag.

## Strategy & Optimization Methods
- **Quadtree Spatial Index:** Implement a Quadtree to manage node positions for $O(\log n)$ lookup during panning, zooming, and selection.
- **Frustum Culling:** Only render nodes and connections that are currently within the visible canvas viewport.
- **Level of Detail (LoD):** 
  - Zoom < 0.3: Render nodes as simple rectangles (no text/ports).
  - Zoom < 0.1: Render nodes as single pixels or tiny dots.
- **Layered Rendering:** Consider moving connections to a `<canvas>` layer for faster batch drawing, while keeping nodes as interactive SVG elements.
- **Worker Routing:** Move the `routeConnection` logic to a Web Worker to prevent UI freezes during large-scale rerouting.

## Acceptance Criteria
- Smooth 60fps panning/zooming with 1000+ nodes.
- Interaction (selection/dragging) remains responsive as the node count grows.
- Quadtree correctly identifies visible objects.
