import { Port, Connection } from '../types'

export interface ValidationResult {
  ok: boolean
  reason?: string
}

export function canConnect(
  fromPort: Port,
  toPort: Port,
  connections: Connection[]
): ValidationResult {
  // Cannot connect a port to itself
  if (fromPort.id === toPort.id) {
    return { ok: false, reason: 'Cannot connect a port to itself' }
  }

  // Cannot connect ports on the same node
  if (fromPort.nodeId === toPort.nodeId) {
    return { ok: false, reason: 'Cannot connect ports on the same node' }
  }

  // Must be output → input
  if (fromPort.direction === 'input' && toPort.direction === 'input') {
    return { ok: false, reason: 'Cannot connect input to input — drag from an output port' }
  }

  if (fromPort.direction === 'output' && toPort.direction === 'output') {
    return { ok: false, reason: 'Cannot connect output to output — connect to an input port' }
  }

  // Determine actual from/to based on direction
  let actualFromId: string
  let actualToId: string

  if (fromPort.direction === 'output' && toPort.direction === 'input') {
    actualFromId = fromPort.id
    actualToId = toPort.id
  } else {
    // fromPort is input, toPort is output — swap
    actualFromId = toPort.id
    actualToId = fromPort.id
  }

  // Check for duplicate connection
  const duplicate = connections.find(
    c => c.fromPortId === actualFromId && c.toPortId === actualToId
  )
  if (duplicate) {
    return { ok: false, reason: 'This connection already exists' }
  }

  // Check maxConnections on the input (to) port
  const inputPort = fromPort.direction === 'input' ? fromPort : toPort
  if (inputPort.maxConnections !== -1 && inputPort.maxConnections >= 1) {
    const existingCount = connections.filter(c => c.toPortId === inputPort.id).length
    if (existingCount >= inputPort.maxConnections) {
      return {
        ok: false,
        reason: `Input port "${inputPort.name}" is already occupied (max ${inputPort.maxConnections} connection${inputPort.maxConnections > 1 ? 's' : ''})`
      }
    }
  }

  // Check maxConnections on the output (from) port
  const outputPort = fromPort.direction === 'output' ? fromPort : toPort
  if (outputPort.maxConnections !== -1) {
    const existingCount = connections.filter(c => c.fromPortId === outputPort.id).length
    if (existingCount >= outputPort.maxConnections) {
      return {
        ok: false,
        reason: `Output port "${outputPort.name}" has reached its maximum connection count (${outputPort.maxConnections})`
      }
    }
  }

  return { ok: true }
}

export function validateGraph(
  nodes: { id: string; ports: Port[] }[],
  connections: Connection[]
): { type: 'error' | 'warning' | 'info'; message: string }[] {
  const issues: { type: 'error' | 'warning' | 'info'; message: string }[] = []
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  for (const conn of connections) {
    const fromNode = nodeMap.get(conn.fromNodeId)
    const toNode = nodeMap.get(conn.toNodeId)

    if (!fromNode) {
      issues.push({
        type: 'error',
        message: `Connection ${conn.id} references missing source node ${conn.fromNodeId}`
      })
      continue
    }

    if (!toNode) {
      issues.push({
        type: 'error',
        message: `Connection ${conn.id} references missing target node ${conn.toNodeId}`
      })
      continue
    }

    const fromPort = fromNode.ports.find(p => p.id === conn.fromPortId)
    const toPort = toNode.ports.find(p => p.id === conn.toPortId)

    if (!fromPort) {
      issues.push({
        type: 'error',
        message: `Connection references missing source port ${conn.fromPortId}`
      })
    }

    if (!toPort) {
      issues.push({
        type: 'error',
        message: `Connection references missing target port ${conn.toPortId}`
      })
    }
  }

  return issues
}
