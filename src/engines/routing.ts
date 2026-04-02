import { GraphNode, Port, PortSide } from '../types'

export interface Point {
  x: number
  y: number
}

const EXIT_LENGTH = 40
const NODE_MARGIN = 20

export function getPortAnchor(node: GraphNode, port: Port): Point {
  const { x, y, width } = node
  const headerHeight = 44

  const leftPorts = node.ports.filter(p => p.side === 'left').sort((a, b) => a.order - b.order)
  const rightPorts = node.ports.filter(p => p.side === 'right').sort((a, b) => a.order - b.order)
  const topPorts = node.ports.filter(p => p.side === 'top').sort((a, b) => a.order - b.order)
  const bottomPorts = node.ports.filter(p => p.side === 'bottom').sort((a, b) => a.order - b.order)

  if (port.side === 'left') {
    const idx = leftPorts.findIndex(p => p.id === port.id)
    return { x: x, y: y + headerHeight + idx * 28 + 18 }
  } else if (port.side === 'right') {
    const idx = rightPorts.findIndex(p => p.id === port.id)
    return { x: x + width, y: y + headerHeight + idx * 28 + 18 }
  } else if (port.side === 'top') {
    const idx = topPorts.findIndex(p => p.id === port.id)
    const spacing = width / (topPorts.length + 1)
    return { x: x + spacing * (idx + 1), y: y }
  } else {
    // bottom
    const idx = bottomPorts.findIndex(p => p.id === port.id)
    const spacing = width / (bottomPorts.length + 1)
    const nodeHeight = computeNodeHeight(node)
    return { x: x + spacing * (idx + 1), y: y + nodeHeight }
  }
}

export function computeNodeHeight(node: GraphNode): number {
  if (node.collapsed) return 44

  const headerHeight = 44
  const leftPorts = node.ports.filter(p => p.side === 'left').length
  const rightPorts = node.ports.filter(p => p.side === 'right').length
  const topPorts = node.ports.filter(p => p.side === 'top').length
  const bottomPorts = node.ports.filter(p => p.side === 'bottom').length

  const sidePortRows = Math.max(leftPorts, rightPorts)
  const verticalPadding = (topPorts > 0 ? 20 : 0) + (bottomPorts > 0 ? 20 : 0)
  
  const minHeight = headerHeight + sidePortRows * 28 + 16 + verticalPadding
  return Math.max(minHeight, node.height)
}

function sideToDirection(side: PortSide): Point {
  switch (side) {
    case 'left': return { x: -1, y: 0 }
    case 'right': return { x: 1, y: 0 }
    case 'top': return { x: 0, y: -1 }
    case 'bottom': return { x: 0, y: 1 }
  }
}

interface BBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

function getNodeBBox(node: GraphNode): BBox {
  const h = computeNodeHeight(node)
  return {
    x1: node.x - NODE_MARGIN,
    y1: node.y - NODE_MARGIN,
    x2: node.x + node.width + NODE_MARGIN,
    y2: node.y + h + NODE_MARGIN
  }
}

function segmentIntersectsBBox(p1: Point, p2: Point, bbox: BBox): boolean {
  // Check if axis-aligned segment intersects bounding box
  if (p1.x === p2.x) {
    // Vertical segment
    const x = p1.x
    const minY = Math.min(p1.y, p2.y)
    const maxY = Math.max(p1.y, p2.y)
    return x > bbox.x1 && x < bbox.x2 && maxY > bbox.y1 && minY < bbox.y2
  } else {
    // Horizontal segment
    const y = p1.y
    const minX = Math.min(p1.x, p2.x)
    const maxX = Math.max(p1.x, p2.x)
    return y > bbox.y1 && y < bbox.y2 && maxX > bbox.x1 && minX < bbox.x2
  }
}

function checkObstacle(
  p1: Point,
  p2: Point,
  nodes: GraphNode[],
  excludeNodeIds: string[]
): BBox | null {
  for (const node of nodes) {
    if (excludeNodeIds.includes(node.id)) continue
    const bbox = getNodeBBox(node)
    if (segmentIntersectsBBox(p1, p2, bbox)) {
      return bbox
    }
  }
  return null
}

export function routeConnection(
  from: Point,
  to: Point,
  fromSide: PortSide,
  toSide: PortSide,
  nodes: GraphNode[],
  excludeNodeIds: string[] = []
): Point[] {
  const fromDir = sideToDirection(fromSide)
  const toDir = sideToDirection(toSide)

  // Exit points from ports
  const exitFrom: Point = {
    x: from.x + fromDir.x * EXIT_LENGTH,
    y: from.y + fromDir.y * EXIT_LENGTH
  }

  const exitTo: Point = {
    x: to.x + toDir.x * EXIT_LENGTH,
    y: to.y + toDir.y * EXIT_LENGTH
  }

  // Simple case: right-to-left or left-to-right (most common)
  if (fromSide === 'right' && toSide === 'left') {
    return routeRightToLeft(from, to, exitFrom, exitTo, nodes, excludeNodeIds)
  } else if (fromSide === 'left' && toSide === 'right') {
    return routeRightToLeft(to, from, exitTo, exitFrom, nodes, excludeNodeIds).reverse()
  } else if (fromSide === 'right' && toSide === 'right') {
    return routeSameSide(from, to, exitFrom, exitTo, 'right')
  } else if (fromSide === 'left' && toSide === 'left') {
    return routeSameSide(from, to, exitFrom, exitTo, 'left')
  } else {
    return routeGeneral(from, to, exitFrom, exitTo, nodes, excludeNodeIds)
  }
}

function segmentNormal(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: 0, y: dx >= 0 ? -1 : 1 }
  }
  return { x: dy >= 0 ? 1 : -1, y: 0 }
}

export function offsetOrthogonalRoute(points: Point[], offset: number): Point[] {
  if (offset === 0 || points.length < 2) return points

  return points.map((point, index) => {
    if (index === 0) {
      const normal = segmentNormal(points[0], points[1])
      return { x: point.x + normal.x * offset, y: point.y + normal.y * offset }
    }

    if (index === points.length - 1) {
      const normal = segmentNormal(points[index - 1], points[index])
      return { x: point.x + normal.x * offset, y: point.y + normal.y * offset }
    }

    const prevNormal = segmentNormal(points[index - 1], points[index])
    const nextNormal = segmentNormal(points[index], points[index + 1])
    const avgX = prevNormal.x + nextNormal.x
    const avgY = prevNormal.y + nextNormal.y

    if (avgX === 0 && avgY === 0) {
      return { x: point.x + nextNormal.x * offset, y: point.y + nextNormal.y * offset }
    }

    return {
      x: point.x + avgX * offset,
      y: point.y + avgY * offset
    }
  })
}

function routeRightToLeft(
  from: Point,
  to: Point,
  exitFrom: Point,
  exitTo: Point,
  nodes: GraphNode[],
  excludeNodeIds: string[]
): Point[] {
  // Direct path: exitFrom horizontal to midX, then vertical, then horizontal to exitTo
  if (exitFrom.x <= exitTo.x) {
    // Normal case: from is to the left of to (or equal)
    const midX = (exitFrom.x + exitTo.x) / 2
    const direct: Point[] = [
      from,
      exitFrom,
      { x: midX, y: exitFrom.y },
      { x: midX, y: exitTo.y },
      exitTo,
      to
    ]
    // Check for obstacles
    const hasObs = checkPathForObstacles(direct, nodes, excludeNodeIds)
    if (!hasObs) return simplifyPath(direct)

    // Route around obstacles
    return routeAroundObstacles(from, to, exitFrom, exitTo, nodes, excludeNodeIds)
  } else {
    // Backtrack: from is to the right of to, need U-shape
    return routeBacktrack(from, to, exitFrom, exitTo, nodes, excludeNodeIds)
  }
}

function routeBacktrack(
  from: Point,
  to: Point,
  exitFrom: Point,
  exitTo: Point,
  nodes: GraphNode[],
  excludeNodeIds: string[]
): Point[] {
  // Find vertical routing lane that avoids obstacles
  // Try above and below
  const allBBoxes = nodes
    .filter(n => !excludeNodeIds.includes(n.id))
    .map(n => getNodeBBox(n))

  const minY = Math.min(exitFrom.y, exitTo.y)
  const maxY = Math.max(exitFrom.y, exitTo.y)

  // Try routing above all obstacles
  let topY = minY - 60
  for (const bbox of allBBoxes) {
    const overlapX = Math.max(exitTo.x, exitFrom.x) > bbox.x1 &&
      Math.min(exitTo.x, exitFrom.x) < bbox.x2
    if (overlapX && bbox.y1 < topY + 20) {
      topY = bbox.y1 - 30
    }
  }

  // Try routing below
  let bottomY = maxY + 60
  for (const bbox of allBBoxes) {
    const overlapX = Math.max(exitTo.x, exitFrom.x) > bbox.x1 &&
      Math.min(exitTo.x, exitFrom.x) < bbox.x2
    if (overlapX && bbox.y2 > bottomY - 20) {
      bottomY = bbox.y2 + 30
    }
  }

  // Choose the shorter route
  const aboveDist = Math.abs(exitFrom.y - topY) + Math.abs(exitTo.y - topY)
  const belowDist = Math.abs(exitFrom.y - bottomY) + Math.abs(exitTo.y - bottomY)

  const routeY = aboveDist < belowDist ? topY : bottomY

  return simplifyPath([
    from,
    exitFrom,
    { x: exitFrom.x, y: routeY },
    { x: exitTo.x, y: routeY },
    exitTo,
    to
  ])
}

function routeSameSide(
  from: Point,
  to: Point,
  exitFrom: Point,
  exitTo: Point,
  side: 'left' | 'right'
): Point[] {
  // Route out, then go around
  const extremeX = side === 'right'
    ? Math.max(exitFrom.x, exitTo.x) + 20
    : Math.min(exitFrom.x, exitTo.x) - 20

  return simplifyPath([
    from,
    exitFrom,
    { x: extremeX, y: exitFrom.y },
    { x: extremeX, y: exitTo.y },
    exitTo,
    to
  ])
}

function routeGeneral(
  from: Point,
  to: Point,
  exitFrom: Point,
  exitTo: Point,
  _nodes: GraphNode[],
  _excludeNodeIds: string[]
): Point[] {
  // Simple L-shape routing for mixed sides
  // Go to mid point horizontally then vertically
  const midY = (exitFrom.y + exitTo.y) / 2

  return simplifyPath([
    from,
    exitFrom,
    { x: exitFrom.x, y: midY },
    { x: exitTo.x, y: midY },
    exitTo,
    to
  ])
}

function checkPathForObstacles(
  points: Point[],
  nodes: GraphNode[],
  excludeNodeIds: string[]
): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    if (checkObstacle(points[i], points[i + 1], nodes, excludeNodeIds)) {
      return true
    }
  }
  return false
}

function routeAroundObstacles(
  from: Point,
  to: Point,
  exitFrom: Point,
  exitTo: Point,
  nodes: GraphNode[],
  excludeNodeIds: string[]
): Point[] {
  // Collect all obstacle bboxes
  const obstacles = nodes
    .filter(n => !excludeNodeIds.includes(n.id))
    .map(n => getNodeBBox(n))

  if (obstacles.length === 0) {
    const midX = (exitFrom.x + exitTo.x) / 2
    return simplifyPath([
      from, exitFrom,
      { x: midX, y: exitFrom.y },
      { x: midX, y: exitTo.y },
      exitTo, to
    ])
  }

  // Find vertical routing space
  const candidateXs: number[] = []
  for (const obs of obstacles) {
    candidateXs.push(obs.x1 - 10)
    candidateXs.push(obs.x2 + 10)
  }
  candidateXs.push((exitFrom.x + exitTo.x) / 2)

  // Try each candidate midX
  for (const midX of candidateXs) {
    const path: Point[] = [
      from, exitFrom,
      { x: midX, y: exitFrom.y },
      { x: midX, y: exitTo.y },
      exitTo, to
    ]
    if (!checkPathForObstacles(path, nodes, excludeNodeIds)) {
      return simplifyPath(path)
    }
  }

  // Fall back to backtrack route
  return routeBacktrack(from, to, exitFrom, exitTo, nodes, excludeNodeIds)
}

function simplifyPath(points: Point[]): Point[] {
  if (points.length <= 2) return points

  const result: Point[] = [points[0]]

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1]
    const curr = points[i]
    const next = points[i + 1]

    // Skip collinear points
    const dx1 = curr.x - prev.x
    const dy1 = curr.y - prev.y
    const dx2 = next.x - curr.x
    const dy2 = next.y - curr.y

    if (dx1 === dx2 && dy1 === dy2) continue
    if (dx1 === 0 && dx2 === 0) continue
    if (dy1 === 0 && dy2 === 0) continue

    // Skip zero-length segments
    if (Math.abs(curr.x - prev.x) < 0.5 && Math.abs(curr.y - prev.y) < 0.5) continue

    result.push(curr)
  }

  result.push(points[points.length - 1])
  return result
}

export function pointsToPathD(points: Point[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`
  }
  return d
}

export function pointsToSmoothPathD(points: Point[]): string {
  if (points.length === 0) return ''
  if (points.length <= 2) return pointsToPathD(points)

  const r = 8 // corner radius
  let d = `M ${points[0].x} ${points[0].y}`

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]

    // Direction vectors
    const d1x = curr.x - prev.x
    const d1y = curr.y - prev.y
    const len1 = Math.sqrt(d1x * d1x + d1y * d1y)

    const d2x = next.x - curr.x
    const d2y = next.y - curr.y
    const len2 = Math.sqrt(d2x * d2x + d2y * d2y)

    if (len1 < 0.1 || len2 < 0.1) {
      d += ` L ${curr.x} ${curr.y}`
      continue
    }

    const actualR = Math.min(r, len1 / 2, len2 / 2)

    const p1x = curr.x - (d1x / len1) * actualR
    const p1y = curr.y - (d1y / len1) * actualR
    const p2x = curr.x + (d2x / len2) * actualR
    const p2y = curr.y + (d2y / len2) * actualR

    d += ` L ${p1x} ${p1y}`
    d += ` Q ${curr.x} ${curr.y} ${p2x} ${p2y}`
  }

  const last = points[points.length - 1]
  d += ` L ${last.x} ${last.y}`
  return d
}
