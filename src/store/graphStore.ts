import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import {
  Connection,
  DraggingConnection,
  GraphNode,
  Netlist,
  NetlistDatabase,
  NodeCode,
  NodeParameter,
  NodeTemplate,
  Port,
  PortDirection,
  PortSide,
  Snapshot
} from '../types'
import { canConnect } from '../engines/validation'
import { computeNodeHeight } from '../engines/routing'

const MAX_HISTORY = 50
const DEFAULT_OFFSET = { x: 60, y: 60 }

const DEFAULT_CODE: NodeCode = {
  language: 'cpp',
  initCode: '',
  fireCode: '',
  finishCode: ''
}

interface ClipboardData {
  nodes: GraphNode[]
  netlists: Record<string, Netlist>
}

interface GraphState {
  projectId: string
  projectName: string
  projectVersion: string
  db: NetlistDatabase
  currentNetlistId: string
  navigationStack: string[]
  nodes: GraphNode[]
  connections: Connection[]
  selectedNodeIds: string[]
  selectedConnectionId: string | null
  canvasOffset: { x: number; y: number }
  canvasScale: number
  draggingConnection: DraggingConnection | null
  configDialogNodeId: string | null
  history: { past: Snapshot[]; future: Snapshot[] }
  clipboard: ClipboardData
}

interface GraphActions {
  addNode: (template: NodeTemplate, x?: number, y?: number) => string
  updateNode: (id: string, partial: Partial<GraphNode>) => void
  ensureHierarchyForNode: (id: string) => void
  groupSelectedAsSubmodule: () => void
  flattenNode: (id: string) => void
  openNetlistById: (id: string) => void
  deleteNode: (id: string) => void
  deleteSelectedNodes: () => void
  duplicateNode: (id: string) => string
  moveNode: (id: string, x: number, y: number) => void
  commitNodeMove: (id: string) => void
  lockNode: (id: string, locked: boolean) => void
  collapseNode: (id: string, collapsed: boolean) => void
  addPort: (nodeId: string, portData: Partial<Port>) => void
  updatePort: (nodeId: string, portId: string, partial: Partial<Port>) => void
  deletePort: (nodeId: string, portId: string) => void
  addConnection: (fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string) => { ok: boolean; reason?: string }
  deleteConnection: (id: string) => void
  updateConnectionLabel: (id: string, label: string) => void
  setDraggingConnection: (data: DraggingConnection | null) => void
  setSelectedNodes: (ids: string[]) => void
  toggleSelectedNode: (id: string) => void
  setSelectedConnection: (id: string | null) => void
  toggleSelectedConnection: (id: string) => void
  openConfigDialog: (nodeId: string) => void
  closeConfigDialog: () => void
  undo: () => void
  redo: () => void
  setCanvasTransform: (offset: { x: number; y: number }, scale: number) => void
  fitToScreen: (containerWidth: number, containerHeight: number) => void
  newProject: () => void
  loadProject: (data: unknown) => void
  exportProject: () => string
  setProjectName: (name: string) => void
  copySelected: () => void
  pasteClipboard: () => void
  addParameter: (nodeId: string, param: Partial<NodeParameter>) => void
  updateParameter: (nodeId: string, paramId: string, partial: Partial<NodeParameter>) => void
  deleteParameter: (nodeId: string, paramId: string) => void
  enterHierarchyByNode: (nodeId: string) => boolean
  exitHierarchy: () => boolean
}

type GraphStore = GraphState & GraphActions

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function createNetlist(name: string, nodes: GraphNode[] = [], connections: Connection[] = []): Netlist {
  return {
    id: uuidv4(),
    name,
    nodes,
    connections,
    canvasOffset: { ...DEFAULT_OFFSET },
    canvasScale: 1
  }
}

function createNodeBase(
  id: string,
  name: string,
  subtitle: string,
  x: number,
  y: number,
  styleColor: string,
  moduleKind: GraphNode['moduleKind'] = 'behavioral'
): GraphNode {
  return {
    id,
    name,
    subtitle,
    moduleType: moduleKind === 'hierarchical' ? 'structural' : 'behavioral',
    moduleKind,
    x,
    y,
    width: 180,
    height: 92,
    styleColor,
    ports: [],
    parameters: [],
    code: { ...DEFAULT_CODE },
    locked: false,
    collapsed: false
  }
}

function createPort(
  nodeId: string,
  name: string,
  direction: PortDirection,
  side: PortSide,
  order: number
): Port {
  return {
    id: uuidv4(),
    nodeId,
    name,
    direction,
    side,
    order,
    maxConnections: direction === 'input' ? 1 : -1
  }
}

function createSampleDatabase(): NetlistDatabase {
  const inputA = createNodeBase(uuidv4(), 'Input A', 'Module', 60, 120, '#5B8DD9')
  inputA.parameters = [
    { id: uuidv4(), key: 'role', value: 'input', paramType: 'text' },
    { id: uuidv4(), key: 'signal_name', value: 'a', paramType: 'text' }
  ]
  inputA.ports = [createPort(inputA.id, 'out', 'output', 'right', 0)]

  const inputB = createNodeBase(uuidv4(), 'Input B', 'Module', 60, 280, '#5B8DD9')
  inputB.parameters = [
    { id: uuidv4(), key: 'role', value: 'input', paramType: 'text' },
    { id: uuidv4(), key: 'signal_name', value: 'b', paramType: 'text' }
  ]
  inputB.ports = [createPort(inputB.id, 'out', 'output', 'right', 0)]

  const adder = createNodeBase(uuidv4(), 'Adder', 'Module', 340, 200, '#D9A84A')
  adder.parameters = [
    { id: uuidv4(), key: 'module_type', value: 'adder', paramType: 'text' },
    { id: uuidv4(), key: 'operation', value: 'add', paramType: 'text' }
  ]
  adder.ports = [
    createPort(adder.id, 'in0', 'input', 'left', 0),
    createPort(adder.id, 'in1', 'input', 'left', 1),
    createPort(adder.id, 'sum', 'output', 'right', 0)
  ]

  const output = createNodeBase(uuidv4(), 'Output', 'Module', 640, 200, '#5BA85C')
  output.parameters = [
    { id: uuidv4(), key: 'role', value: 'output', paramType: 'text' },
    { id: uuidv4(), key: 'signal_name', value: 'sum', paramType: 'text' }
  ]
  output.ports = [createPort(output.id, 'in', 'input', 'left', 0)]

  const root = createNetlist('Top Netlist', [inputA, inputB, adder, output], [
    {
      id: uuidv4(),
      fromNodeId: inputA.id,
      fromPortId: inputA.ports[0].id,
      toNodeId: adder.id,
      toPortId: adder.ports[0].id,
      routePoints: [],
      label: 'a'
    },
    {
      id: uuidv4(),
      fromNodeId: inputB.id,
      fromPortId: inputB.ports[0].id,
      toNodeId: adder.id,
      toPortId: adder.ports[1].id,
      routePoints: [],
      label: 'b'
    },
    {
      id: uuidv4(),
      fromNodeId: adder.id,
      fromPortId: adder.ports[2].id,
      toNodeId: output.id,
      toPortId: output.ports[0].id,
      routePoints: [],
      label: 'sum'
    }
  ])

  return {
    id: uuidv4(),
    name: 'Untitled Project',
    version: '2.0.0',
    rootNetlistId: root.id,
    libraryNetlistIds: [],
    netlists: {
      [root.id]: root
    }
  }
}

function getCurrentNetlist(state: Pick<GraphState, 'db' | 'currentNetlistId'>): Netlist {
  return state.db.netlists[state.currentNetlistId]
}

function buildStateForNetlist(
  db: NetlistDatabase,
  currentNetlistId: string,
  navigationStack: string[]
): Pick<GraphState, 'db' | 'currentNetlistId' | 'navigationStack' | 'nodes' | 'connections' | 'canvasOffset' | 'canvasScale'> {
  const current = db.netlists[currentNetlistId]
  return {
    db,
    currentNetlistId,
    navigationStack,
    nodes: current?.nodes || [],
    connections: current?.connections || [],
    canvasOffset: current?.canvasOffset || { ...DEFAULT_OFFSET },
    canvasScale: current?.canvasScale || 1
  }
}

function createSnapshot(state: GraphState): Snapshot {
  return {
    db: cloneDeep(state.db),
    currentNetlistId: state.currentNetlistId,
    navigationStack: [...state.navigationStack]
  }
}

function snapshotToState(snapshot: Snapshot) {
  return buildStateForNetlist(snapshot.db, snapshot.currentNetlistId, snapshot.navigationStack)
}

function findPathToNetlist(
  db: NetlistDatabase,
  targetId: string,
  currentId: string = db.rootNetlistId,
  trail: string[] = []
): string[] | null {
  if (currentId === targetId) {
    return [...trail, currentId]
  }

  const current = db.netlists[currentId]
  if (!current) return null

  for (const node of current.nodes) {
    if (!node.subgraphId || !db.netlists[node.subgraphId]) continue
    const result = findPathToNetlist(db, targetId, node.subgraphId, [...trail, currentId])
    if (result) return result
  }

  return null
}

function pushHistory(state: GraphState): Pick<GraphState, 'history'> {
  const snapshot = createSnapshot(state)
  const past = [...state.history.past, snapshot].slice(-MAX_HISTORY)
  return { history: { past, future: [] } }
}

function syncGeneratedPortsInNetlist(netlist: Netlist, nodeId: string): Netlist {
  const node = netlist.nodes.find(n => n.id === nodeId)
  if (!node) return netlist

  const generatorParams = node.parameters.filter(p => p.paramType === 'port_generator')
  const manualPorts = node.ports.filter(p => !p.generatedByParamId)
  const nextGeneratedPorts: Port[] = []

  generatorParams.forEach(param => {
    const parts = param.value.split(':')
    const count = Math.max(0, Math.min(64, parseInt(parts[0], 10) || 0))
    const direction: PortDirection = parts[1] === 'output' ? 'output' : 'input'
    const side: PortSide = ['left', 'right', 'top', 'bottom'].includes(parts[2])
      ? (parts[2] as PortSide)
      : (direction === 'output' ? 'right' : 'left')

    for (let index = 0; index < count; index += 1) {
      nextGeneratedPorts.push({
        id: `gen_${param.id}_${index}`,
        nodeId,
        name: `${param.key}${index}`,
        direction,
        side,
        order: index,
        maxConnections: direction === 'input' ? 1 : -1,
        generatedByParamId: param.id
      })
    }
  })

  const nextPorts = [...manualPorts, ...nextGeneratedPorts]
  const validPortIds = new Set(nextPorts.map(port => port.id))

  return {
    ...netlist,
    nodes: netlist.nodes.map(currentNode => currentNode.id === nodeId ? { ...currentNode, ports: nextPorts } : currentNode),
    connections: netlist.connections.filter(connection =>
      validPortIds.has(connection.fromPortId) || connection.fromNodeId !== nodeId
    ).filter(connection =>
      validPortIds.has(connection.toPortId) || connection.toNodeId !== nodeId
    )
  }
}

function ensureHierarchyNetlist(db: NetlistDatabase, node: GraphNode): { db: NetlistDatabase; node: GraphNode } {
  if (node.subgraphId && db.netlists[node.subgraphId]) {
    return { db, node: { ...node, moduleKind: 'hierarchical', moduleType: 'structural' } }
  }

  const childNetlist = createNetlist(`${node.name} Netlist`)
  return {
    db: {
      ...db,
      libraryNetlistIds: [...new Set([...db.libraryNetlistIds, childNetlist.id])],
      netlists: {
        ...db.netlists,
        [childNetlist.id]: childNetlist
      }
    },
    node: {
      ...node,
      moduleType: 'structural',
      moduleKind: 'hierarchical',
      subgraphId: childNetlist.id
    }
  }
}

function duplicateNetlistTree(
  sourceNetlists: Record<string, Netlist>,
  rootNetlistId: string
): { rootNetlistId: string; netlists: Record<string, Netlist> } {
  const nextNetlists: Record<string, Netlist> = {}
  const remappedIds = new Map<string, string>()

  const cloneNetlist = (netlistId: string): string => {
    if (remappedIds.has(netlistId)) {
      return remappedIds.get(netlistId)!
    }

    const sourceNetlist = sourceNetlists[netlistId]
    if (!sourceNetlist) {
      return netlistId
    }

    const newNetlistId = uuidv4()
    remappedIds.set(netlistId, newNetlistId)

    const nodeIdMap = new Map<string, string>()
    const portIdMap = new Map<string, string>()

    const clonedNodes = sourceNetlist.nodes.map(node => {
      const newNodeId = uuidv4()
      nodeIdMap.set(node.id, newNodeId)
      node.ports.forEach(port => portIdMap.set(port.id, uuidv4()))

      const clonedSubgraphId = node.subgraphId ? cloneNetlist(node.subgraphId) : undefined
      return {
        ...cloneDeep(node),
        id: newNodeId,
        subgraphId: clonedSubgraphId,
        ports: node.ports.map(port => ({
          ...cloneDeep(port),
          id: portIdMap.get(port.id)!,
          nodeId: newNodeId
        })),
        parameters: node.parameters.map(parameter => ({ ...cloneDeep(parameter), id: uuidv4() })),
        code: { ...node.code }
      }
    })

    const clonedConnections = sourceNetlist.connections.map(connection => ({
      ...cloneDeep(connection),
      id: uuidv4(),
      fromNodeId: nodeIdMap.get(connection.fromNodeId)!,
      fromPortId: portIdMap.get(connection.fromPortId)!,
      toNodeId: nodeIdMap.get(connection.toNodeId)!,
      toPortId: portIdMap.get(connection.toPortId)!
    }))

    nextNetlists[newNetlistId] = {
      ...cloneDeep(sourceNetlist),
      id: newNetlistId,
      nodes: clonedNodes,
      connections: clonedConnections
    }

    return newNetlistId
  }

  return {
    rootNetlistId: cloneNetlist(rootNetlistId),
    netlists: nextNetlists
  }
}

function createInterfaceNode(
  name: string,
  x: number,
  y: number,
  direction: PortDirection
): GraphNode {
  const node = createNodeBase(uuidv4(), name, 'Interface', x, y, direction === 'input' ? '#4A90D9' : '#5BA85C')
  node.parameters = [
    { id: uuidv4(), key: 'role', value: direction === 'input' ? 'submodule_input' : 'submodule_output', paramType: 'text' }
  ]
  node.ports = [
    createPort(
      node.id,
      direction === 'input' ? 'out' : 'in',
      direction === 'input' ? 'output' : 'input',
      direction === 'input' ? 'right' : 'left',
      0
    )
  ]
  node.width = 140
  return node
}

function groupNodesIntoSubmodule(
  db: NetlistDatabase,
  netlistId: string,
  selectedNodeIds: string[]
): { db: NetlistDatabase; netlist: Netlist; moduleNodeId: string } | null {
  const current = db.netlists[netlistId]
  if (!current || selectedNodeIds.length < 2) return null

  const selectedSet = new Set(selectedNodeIds)
  const selectedNodes = current.nodes.filter(node => selectedSet.has(node.id))
  if (selectedNodes.length < 2) return null

  const internalConnections = current.connections.filter(connection =>
    selectedSet.has(connection.fromNodeId) && selectedSet.has(connection.toNodeId)
  )
  const incomingConnections = current.connections.filter(connection =>
    !selectedSet.has(connection.fromNodeId) && selectedSet.has(connection.toNodeId)
  )
  const outgoingConnections = current.connections.filter(connection =>
    selectedSet.has(connection.fromNodeId) && !selectedSet.has(connection.toNodeId)
  )

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  selectedNodes.forEach(node => {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + computeNodeHeight(node))
  })

  const childNetlist = createNetlist(`Submodule ${selectedNodes[0].name}`)
  const movedNodes = selectedNodes.map(node => ({
    ...cloneDeep(node),
    x: node.x - minX + 220,
    y: node.y - minY + 120
  }))

  const childNodes: GraphNode[] = [...movedNodes]
  const childConnections: Connection[] = internalConnections.map(connection => cloneDeep(connection))
  const moduleNodeId = uuidv4()
  const modulePorts: Port[] = []
  const parentConnections: Connection[] = []

  incomingConnections.forEach((connection, index) => {
    const originalTarget = selectedNodes.find(node => node.id === connection.toNodeId)?.ports.find(port => port.id === connection.toPortId)
    const portName = originalTarget ? `${originalTarget.name}_in` : `in${index}`
    const modulePort = createPort(moduleNodeId, portName, 'input', 'left', index)
    modulePorts.push(modulePort)

    const boundaryNode = createInterfaceNode(portName, 40, 80 + index * 70, 'input')
    childNodes.push(boundaryNode)
    childConnections.push({
      id: uuidv4(),
      fromNodeId: boundaryNode.id,
      fromPortId: boundaryNode.ports[0].id,
      toNodeId: connection.toNodeId,
      toPortId: connection.toPortId,
      routePoints: [],
      label: connection.label
    })

    parentConnections.push({
      ...cloneDeep(connection),
      id: uuidv4(),
      toNodeId: moduleNodeId,
      toPortId: modulePort.id
    })
  })

  outgoingConnections.forEach((connection, index) => {
    const originalSource = selectedNodes.find(node => node.id === connection.fromNodeId)?.ports.find(port => port.id === connection.fromPortId)
    const portName = originalSource ? `${originalSource.name}_out` : `out${index}`
    const modulePort = createPort(moduleNodeId, portName, 'output', 'right', index)
    modulePorts.push(modulePort)

    const boundaryNode = createInterfaceNode(portName, Math.max(460, maxX - minX + 260), 80 + index * 70, 'output')
    childNodes.push(boundaryNode)
    childConnections.push({
      id: uuidv4(),
      fromNodeId: connection.fromNodeId,
      fromPortId: connection.fromPortId,
      toNodeId: boundaryNode.id,
      toPortId: boundaryNode.ports[0].id,
      routePoints: [],
      label: connection.label
    })

    parentConnections.push({
      ...cloneDeep(connection),
      id: uuidv4(),
      fromNodeId: moduleNodeId,
      fromPortId: modulePort.id
    })
  })

  childNetlist.nodes = childNodes
  childNetlist.connections = childConnections
  childNetlist.canvasOffset = { ...DEFAULT_OFFSET }
  childNetlist.canvasScale = 1

  const moduleNode: GraphNode = {
    id: moduleNodeId,
    name: `Submodule ${selectedNodes.length}`,
    subtitle: 'Structural Module',
    moduleType: 'structural',
    moduleKind: 'hierarchical',
    subgraphId: childNetlist.id,
    x: minX + (maxX - minX) / 2 - 110,
    y: minY + (maxY - minY) / 2 - 60,
    width: 220,
    height: 120,
    styleColor: '#5BA85C',
    ports: modulePorts,
    parameters: [
      { id: uuidv4(), key: 'module_type', value: 'structural', paramType: 'text' },
      { id: uuidv4(), key: 'group_size', value: String(selectedNodes.length), paramType: 'number' }
    ],
    code: { ...DEFAULT_CODE },
    locked: false,
    collapsed: false
  }

  const nextParentNetlist: Netlist = {
    ...current,
    nodes: [...current.nodes.filter(node => !selectedSet.has(node.id)), moduleNode],
    connections: [
      ...current.connections.filter(connection =>
        !selectedSet.has(connection.fromNodeId) && !selectedSet.has(connection.toNodeId)
      ),
      ...parentConnections
    ]
  }

  const nextDb: NetlistDatabase = {
    ...db,
    libraryNetlistIds: [...new Set([...db.libraryNetlistIds, childNetlist.id])],
    netlists: {
      ...db.netlists,
      [netlistId]: nextParentNetlist,
      [childNetlist.id]: childNetlist
    }
  }

  return {
    db: nextDb,
    netlist: nextParentNetlist,
    moduleNodeId
  }
}

function flattenSubmoduleNode(
  db: NetlistDatabase,
  netlistId: string,
  nodeId: string
): { db: NetlistDatabase; netlist: Netlist; restoredNodeIds: string[] } | null {
  const parentNetlist = db.netlists[netlistId]
  const moduleNode = parentNetlist?.nodes.find(node => node.id === nodeId)
  if (!parentNetlist || !moduleNode?.subgraphId) return null

  const childNetlist = db.netlists[moduleNode.subgraphId]
  if (!childNetlist) return null

  const boundaryNodes = childNetlist.nodes.filter(node =>
    node.parameters.some(parameter => parameter.key === 'role' && (
      parameter.value === 'submodule_input' || parameter.value === 'submodule_output'
    ))
  )
  const boundaryNodeIds = new Set(boundaryNodes.map(node => node.id))
  const internalNodes = childNetlist.nodes.filter(node => !boundaryNodeIds.has(node.id))

  if (internalNodes.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  internalNodes.forEach(node => {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + computeNodeHeight(node))
  })

  const clusterWidth = Math.max(1, maxX - minX)
  const clusterHeight = Math.max(1, maxY - minY)
  const offsetX = moduleNode.x + moduleNode.width / 2 - clusterWidth / 2 - minX
  const offsetY = moduleNode.y + moduleNode.height / 2 - clusterHeight / 2 - minY

  const restoredNodes = internalNodes.map(node => ({
    ...cloneDeep(node),
    x: node.x + offsetX,
    y: node.y + offsetY
  }))

  const internalConnections = childNetlist.connections.filter(connection =>
    !boundaryNodeIds.has(connection.fromNodeId) && !boundaryNodeIds.has(connection.toNodeId)
  ).map(connection => cloneDeep(connection))

  const externalToPort = new Map<string, Connection[]>()
  parentNetlist.connections.forEach(connection => {
    if (connection.toNodeId === moduleNode.id) {
      const list = externalToPort.get(connection.toPortId) || []
      list.push(connection)
      externalToPort.set(connection.toPortId, list)
    }
    if (connection.fromNodeId === moduleNode.id) {
      const list = externalToPort.get(connection.fromPortId) || []
      list.push(connection)
      externalToPort.set(connection.fromPortId, list)
    }
  })

  const rewiredConnections: Connection[] = []

  moduleNode.ports.forEach(modulePort => {
    const matchingBoundary = boundaryNodes.find(node => node.name === modulePort.name)
    if (!matchingBoundary) return

    const edgeConnections = childNetlist.connections.filter(connection =>
      connection.fromNodeId === matchingBoundary.id || connection.toNodeId === matchingBoundary.id
    )
    const parentConnections = externalToPort.get(modulePort.id) || []

    if (modulePort.direction === 'input') {
      const boundaryToInternal = edgeConnections.find(connection =>
        connection.fromNodeId === matchingBoundary.id && !boundaryNodeIds.has(connection.toNodeId)
      )
      if (!boundaryToInternal) return
      parentConnections.forEach(parentConnection => {
        rewiredConnections.push({
          id: uuidv4(),
          fromNodeId: parentConnection.fromNodeId,
          fromPortId: parentConnection.fromPortId,
          toNodeId: boundaryToInternal.toNodeId,
          toPortId: boundaryToInternal.toPortId,
          routePoints: [],
          label: parentConnection.label || boundaryToInternal.label
        })
      })
      return
    }

    const internalToBoundary = edgeConnections.find(connection =>
      !boundaryNodeIds.has(connection.fromNodeId) && connection.toNodeId === matchingBoundary.id
    )
    if (!internalToBoundary) return
    parentConnections.forEach(parentConnection => {
      rewiredConnections.push({
        id: uuidv4(),
        fromNodeId: internalToBoundary.fromNodeId,
        fromPortId: internalToBoundary.fromPortId,
        toNodeId: parentConnection.toNodeId,
        toPortId: parentConnection.toPortId,
        routePoints: [],
        label: parentConnection.label || internalToBoundary.label
      })
    })
  })

  const nextParentNetlist: Netlist = {
    ...parentNetlist,
    nodes: [
      ...parentNetlist.nodes.filter(node => node.id !== moduleNode.id),
      ...restoredNodes
    ],
    connections: [
      ...parentNetlist.connections.filter(connection =>
        connection.fromNodeId !== moduleNode.id && connection.toNodeId !== moduleNode.id
      ),
      ...internalConnections,
      ...rewiredConnections
    ]
  }

  const nextNetlists = { ...db.netlists }
  delete nextNetlists[moduleNode.subgraphId]

  const nextDb: NetlistDatabase = {
    ...db,
    libraryNetlistIds: db.libraryNetlistIds.filter(id => id !== moduleNode.subgraphId),
    netlists: {
      ...nextNetlists,
      [netlistId]: nextParentNetlist
    }
  }

  return {
    db: nextDb,
    netlist: nextParentNetlist,
    restoredNodeIds: restoredNodes.map(node => node.id)
  }
}

function collectReferencedNetlists(
  sourceNetlists: Record<string, Netlist>,
  nodes: GraphNode[],
  target: Record<string, Netlist> = {}
): Record<string, Netlist> {
  nodes.forEach(node => {
    if (!node.subgraphId) return
    const child = sourceNetlists[node.subgraphId]
    if (!child || target[child.id]) return
    target[child.id] = cloneDeep(child)
    collectReferencedNetlists(sourceNetlists, child.nodes, target)
  })
  return target
}

function createNodeFromTemplate(
  template: NodeTemplate,
  x: number,
  y: number,
  db: NetlistDatabase
): { db: NetlistDatabase; node: GraphNode } {
  const id = uuidv4()
  let node: GraphNode = {
    id,
    name: template.name,
    subtitle: template.subtitle,
    moduleType: (template.moduleKind || 'behavioral') === 'hierarchical' ? 'structural' : 'behavioral',
    moduleKind: template.moduleKind || 'behavioral',
    x,
    y,
    width: 180,
    height: 92,
    styleColor: template.color,
    ports: (template.defaultPorts || []).map((port, index) => ({
      id: uuidv4(),
      nodeId: id,
      name: port.name || `port${index}`,
      direction: port.direction || 'input',
      side: port.side || (port.direction === 'output' ? 'right' : 'left'),
      order: port.order ?? index,
      maxConnections: port.maxConnections ?? ((port.direction || 'input') === 'input' ? 1 : -1)
    })),
    parameters: (template.defaultParameters || []).map(parameter => ({
      id: uuidv4(),
      key: parameter.key || 'key',
      value: parameter.value || '',
      paramType: parameter.paramType || 'text'
    })),
    code: { ...DEFAULT_CODE },
    locked: false,
    collapsed: false
  }

  let nextDb = db
  if (template.createSubgraph || node.moduleKind === 'hierarchical') {
    const ensured = ensureHierarchyNetlist(db, node)
    nextDb = ensured.db
    node = ensured.node
  }

  return {
    db: nextDb,
    node: syncGeneratedPortsInNetlist(createNetlist('tmp', [node], []), node.id).nodes[0]
  }
}

function convertLegacyProjectToDb(data: {
  id?: string
  name?: string
  version?: string
  nodes?: GraphNode[]
  connections?: Connection[]
  canvasOffset?: { x: number; y: number }
  canvasScale?: number
}): NetlistDatabase {
  const root = createNetlist(data.name || 'Top Netlist')
  root.nodes = (data.nodes || []).map(node => ({
      ...cloneDeep(node),
      moduleType: node.moduleType || (node.moduleKind === 'hierarchical' ? 'structural' : 'behavioral'),
      moduleKind: node.moduleKind || (node.subgraphId ? 'hierarchical' : 'behavioral'),
    code: node.code || { ...DEFAULT_CODE },
    parameters: (node.parameters || []).map(parameter => ({ paramType: 'text' as const, ...parameter }))
  }))
  root.connections = cloneDeep(data.connections || [])
  root.canvasOffset = data.canvasOffset || { ...DEFAULT_OFFSET }
  root.canvasScale = data.canvasScale || 1

  return {
    id: data.id || uuidv4(),
    name: data.name || 'Untitled Project',
    version: data.version || '2.0.0',
    rootNetlistId: root.id,
    libraryNetlistIds: [],
    netlists: {
      [root.id]: root
    }
  }
}

function normalizeDb(data: unknown): NetlistDatabase {
  const maybeDb = data as Partial<NetlistDatabase>
  if (!maybeDb || !maybeDb.netlists || !maybeDb.rootNetlistId) {
    return convertLegacyProjectToDb(data as {
      id?: string
      name?: string
      version?: string
      nodes?: GraphNode[]
      connections?: Connection[]
      canvasOffset?: { x: number; y: number }
      canvasScale?: number
    })
  }

  const netlists = Object.fromEntries(
    Object.entries(maybeDb.netlists).map(([id, netlist]) => {
      const safeNetlist = netlist as Netlist
      return [id, {
        ...cloneDeep(safeNetlist),
        nodes: (safeNetlist.nodes || []).map(node => ({
          ...cloneDeep(node),
          moduleType: node.moduleType || (node.moduleKind === 'hierarchical' ? 'structural' : 'behavioral'),
          moduleKind: node.moduleKind || (node.subgraphId ? 'hierarchical' : 'behavioral'),
          code: node.code || { ...DEFAULT_CODE },
          parameters: (node.parameters || []).map(parameter => ({ paramType: 'text' as const, ...parameter }))
        })),
        connections: cloneDeep(safeNetlist.connections || []),
        canvasOffset: safeNetlist.canvasOffset || { ...DEFAULT_OFFSET },
        canvasScale: safeNetlist.canvasScale || 1
      } satisfies Netlist]
    })
  )

  return {
    id: maybeDb.id || uuidv4(),
    name: maybeDb.name || 'Untitled Project',
    version: maybeDb.version || '2.0.0',
    rootNetlistId: maybeDb.rootNetlistId,
    libraryNetlistIds: (maybeDb.libraryNetlistIds || []).filter(id => netlists[id]),
    netlists
  }
}

const initialDb = createSampleDatabase()
const initialNetlist = initialDb.netlists[initialDb.rootNetlistId]

export const useGraphStore = create<GraphStore>((set, get) => ({
  projectId: initialDb.id,
  projectName: initialDb.name,
  projectVersion: initialDb.version,
  db: initialDb,
  currentNetlistId: initialDb.rootNetlistId,
  navigationStack: [],
  nodes: initialNetlist.nodes,
  connections: initialNetlist.connections,
  selectedNodeIds: [],
  selectedConnectionId: null,
  canvasOffset: initialNetlist.canvasOffset,
  canvasScale: initialNetlist.canvasScale,
  draggingConnection: null,
  configDialogNodeId: null,
  history: { past: [], future: [] },
  clipboard: { nodes: [], netlists: {} },

  addNode: (template, x = 200, y = 200) => {
    const state = get()
    const current = getCurrentNetlist(state)
    const created = createNodeFromTemplate(template, x, y, state.db)
    const nextNetlist = {
      ...current,
      nodes: [...current.nodes, created.node]
    }
    const nextDb = {
      ...created.db,
      netlists: {
        ...created.db.netlists,
        [current.id]: nextNetlist
      }
    }
    set({
      ...pushHistory(state),
      ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack),
      selectedNodeIds: [created.node.id],
      selectedConnectionId: null
    })
    return created.node.id
  },

  updateNode: (id, partial) => {
    set(state => {
      const current = getCurrentNetlist(state)
      const targetNode = current.nodes.find(node => node.id === id)
      if (!targetNode) return state

      let nextDb = state.db
      
      // Determine final moduleKind and moduleType
      let moduleKind = partial.moduleKind || targetNode.moduleKind
      let moduleType = partial.moduleType || targetNode.moduleType
      
      // If one is changed, sync the other
      if (partial.moduleType === 'structural') moduleKind = 'hierarchical'
      if (partial.moduleType === 'behavioral') moduleKind = 'behavioral'
      if (partial.moduleKind === 'hierarchical') moduleType = 'structural'
      if (partial.moduleKind === 'behavioral') moduleType = 'behavioral'

      let nextNode = {
        ...targetNode,
        ...partial,
        moduleKind,
        moduleType
      }

      if (nextNode.moduleKind === 'hierarchical' || nextNode.moduleType === 'structural') {
        const ensured = ensureHierarchyNetlist(nextDb, nextNode)
        nextDb = ensured.db
        nextNode = ensured.node
      } else {
        nextNode = {
          ...nextNode,
          moduleKind: 'behavioral',
          moduleType: 'behavioral'
        }
      }

      let nextNetlist: Netlist = {
        ...current,
        nodes: current.nodes.map(node => node.id === id ? nextNode : node)
      }

      if (partial.parameters) {
        nextNetlist = syncGeneratedPortsInNetlist(nextNetlist, id)
      }

      nextDb = {
        ...nextDb,
        netlists: {
          ...nextDb.netlists,
          [current.id]: nextNetlist
        }
      }

      return {
        ...pushHistory(state),
        ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack)
      }
    })
  },

  ensureHierarchyForNode: (id) => {
    set(state => {
      const current = getCurrentNetlist(state)
      const targetNode = current.nodes.find(node => node.id === id)
      if (!targetNode) return state
      const ensured = ensureHierarchyNetlist(state.db, targetNode)
      const nextNetlist = {
        ...current,
        nodes: current.nodes.map(node => node.id === id ? ensured.node : node)
      }
      const nextDb = {
        ...ensured.db,
        netlists: {
          ...ensured.db.netlists,
          [current.id]: nextNetlist
        }
      }
      return {
        ...pushHistory(state),
        ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack)
      }
    })
  },

  groupSelectedAsSubmodule: () => {
    set(state => {
      const grouped = groupNodesIntoSubmodule(state.db, state.currentNetlistId, state.selectedNodeIds)
      if (!grouped) return state
      return {
        ...pushHistory(state),
        ...buildStateForNetlist(grouped.db, state.currentNetlistId, state.navigationStack),
        selectedNodeIds: [grouped.moduleNodeId],
        selectedConnectionId: null
      }
    })
  },

  flattenNode: (id) => {
    set(state => {
      const flattened = flattenSubmoduleNode(state.db, state.currentNetlistId, id)
      if (!flattened) return state
      return {
        ...pushHistory(state),
        ...buildStateForNetlist(flattened.db, state.currentNetlistId, state.navigationStack),
        selectedNodeIds: flattened.restoredNodeIds,
        selectedConnectionId: null,
        configDialogNodeId: state.configDialogNodeId === id ? null : state.configDialogNodeId
      }
    })
  },

  openNetlistById: (id) => {
    set(state => {
      const target = state.db.netlists[id]
      if (!target) return state
      const path = findPathToNetlist(state.db, id)
      const navigationStack = path ? path.slice(0, -1) : []
      return {
        ...buildStateForNetlist(state.db, id, navigationStack),
        projectId: state.projectId,
        projectName: state.projectName,
        projectVersion: state.projectVersion,
        history: state.history,
        clipboard: state.clipboard,
        selectedNodeIds: [],
        selectedConnectionId: null,
        draggingConnection: null,
        configDialogNodeId: null
      }
    })
  },

  deleteNode: (id) => {
    set(state => {
      const current = getCurrentNetlist(state)
      const nextNetlist = {
        ...current,
        nodes: current.nodes.filter(node => node.id !== id),
        connections: current.connections.filter(connection => connection.fromNodeId !== id && connection.toNodeId !== id)
      }
      const nextDb = {
        ...state.db,
        netlists: {
          ...state.db.netlists,
          [current.id]: nextNetlist
        }
      }
      return {
        ...pushHistory(state),
        ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack),
        selectedNodeIds: state.selectedNodeIds.filter(selectedId => selectedId !== id),
        configDialogNodeId: state.configDialogNodeId === id ? null : state.configDialogNodeId
      }
    })
  },

  deleteSelectedNodes: () => {
    set(state => {
      const current = getCurrentNetlist(state)
      const nextNetlist = {
        ...current,
        nodes: current.nodes.filter(node => !state.selectedNodeIds.includes(node.id)),
        connections: current.connections
          .filter(connection => !state.selectedNodeIds.includes(connection.fromNodeId))
          .filter(connection => !state.selectedNodeIds.includes(connection.toNodeId))
          .filter(connection => state.selectedConnectionId ? connection.id !== state.selectedConnectionId : true)
      }
      const nextDb = {
        ...state.db,
        netlists: {
          ...state.db.netlists,
          [current.id]: nextNetlist
        }
      }
      return {
        ...pushHistory(state),
        ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack),
        selectedNodeIds: [],
        selectedConnectionId: null
      }
    })
  },

  duplicateNode: (id) => {
    const state = get()
    const current = getCurrentNetlist(state)
    const node = current.nodes.find(entry => entry.id === id)
    if (!node) return ''

    let nextDb = state.db
    let duplicatedSubgraphId = node.subgraphId
    if (node.subgraphId) {
      const duplicatedTree = duplicateNetlistTree(state.db.netlists, node.subgraphId)
      duplicatedSubgraphId = duplicatedTree.rootNetlistId
      nextDb = {
        ...nextDb,
        libraryNetlistIds: [...new Set([...nextDb.libraryNetlistIds, ...Object.keys(duplicatedTree.netlists)])],
        netlists: {
          ...nextDb.netlists,
          ...duplicatedTree.netlists
        }
      }
    }

    const newNodeId = uuidv4()
    const portIdMap = new Map<string, string>()
    node.ports.forEach(port => portIdMap.set(port.id, uuidv4()))

    const duplicatedNode: GraphNode = {
      ...cloneDeep(node),
      id: newNodeId,
      name: `${node.name} Copy`,
      x: node.x + 36,
      y: node.y + 36,
      subgraphId: duplicatedSubgraphId,
      ports: node.ports.map(port => ({
        ...cloneDeep(port),
        id: portIdMap.get(port.id)!,
        nodeId: newNodeId
      })),
      parameters: node.parameters.map(parameter => ({ ...cloneDeep(parameter), id: uuidv4() })),
      code: { ...node.code }
    }

    const nextNetlist = {
      ...current,
      nodes: [...current.nodes, duplicatedNode]
    }

    nextDb = {
      ...nextDb,
      netlists: {
        ...nextDb.netlists,
        [current.id]: nextNetlist
      }
    }

    set({
      ...pushHistory(state),
      ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack),
      selectedNodeIds: [duplicatedNode.id],
      selectedConnectionId: null
    })

    return duplicatedNode.id
  },

  moveNode: (id, x, y) => {
    set(state => {
      const current = getCurrentNetlist(state)
      const nextNetlist = {
        ...current,
        nodes: current.nodes.map(node => node.id === id ? { ...node, x, y } : node)
      }
      const nextDb = {
        ...state.db,
        netlists: {
          ...state.db.netlists,
          [current.id]: nextNetlist
        }
      }
      return buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack)
    })
  },

  commitNodeMove: (_id) => {
    set(state => {
      const snapshot = createSnapshot(state)
      const past = [...state.history.past.slice(0, -1), snapshot].slice(-MAX_HISTORY)
      return { history: { past, future: [] } }
    })
  },

  lockNode: (id, locked) => {
    get().updateNode(id, { locked })
  },

  collapseNode: (id, collapsed) => {
    get().updateNode(id, { collapsed })
  },

  addPort: (nodeId, portData) => {
    set(state => {
      const current = getCurrentNetlist(state)
      const node = current.nodes.find(entry => entry.id === nodeId)
      if (!node) return state
      const side = portData.side || 'left'
      const sideCount = node.ports.filter(port => port.side === side).length
      const newPort: Port = {
        id: portData.id || uuidv4(),
        nodeId,
        name: portData.name || 'port',
        direction: portData.direction || 'input',
        side,
        order: portData.order ?? sideCount,
        maxConnections: portData.maxConnections ?? ((portData.direction || 'input') === 'input' ? 1 : -1)
      }

      const nextNetlist = {
        ...current,
        nodes: current.nodes.map(entry => entry.id === nodeId ? { ...entry, ports: [...entry.ports, newPort] } : entry)
      }
      const nextDb = {
        ...state.db,
        netlists: {
          ...state.db.netlists,
          [current.id]: nextNetlist
        }
      }
      return {
        ...pushHistory(state),
        ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack)
      }
    })
  },

  updatePort: (nodeId, portId, partial) => {
    set(state => {
      const current = getCurrentNetlist(state)
      const nextNetlist = {
        ...current,
        nodes: current.nodes.map(node =>
          node.id === nodeId
            ? { ...node, ports: node.ports.map(port => port.id === portId ? { ...port, ...partial } : port) }
            : node
        )
      }
      const nextDb = {
        ...state.db,
        netlists: {
          ...state.db.netlists,
          [current.id]: nextNetlist
        }
      }
      return {
        ...pushHistory(state),
        ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack)
      }
    })
  },

  deletePort: (nodeId, portId) => {
    set(state => {
      const current = getCurrentNetlist(state)
      const nextNetlist = {
        ...current,
        nodes: current.nodes.map(node =>
          node.id === nodeId ? { ...node, ports: node.ports.filter(port => port.id !== portId) } : node
        ),
        connections: current.connections.filter(connection => connection.fromPortId !== portId && connection.toPortId !== portId)
      }
      const nextDb = {
        ...state.db,
        netlists: {
          ...state.db.netlists,
          [current.id]: nextNetlist
        }
      }
      return {
        ...pushHistory(state),
        ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack)
      }
    })
  },

  addConnection: (fromNodeId, fromPortId, toNodeId, toPortId) => {
    const state = get()
    const current = getCurrentNetlist(state)
    const fromNode = current.nodes.find(node => node.id === fromNodeId)
    const toNode = current.nodes.find(node => node.id === toNodeId)
    if (!fromNode || !toNode) return { ok: false, reason: 'Node not found' }

    const fromPort = fromNode.ports.find(port => port.id === fromPortId)
    const toPort = toNode.ports.find(port => port.id === toPortId)
    if (!fromPort || !toPort) return { ok: false, reason: 'Port not found' }

    const result = canConnect(fromPort, toPort, current.connections)
    if (!result.ok) return result

    let actualFromNodeId = fromNodeId
    let actualFromPortId = fromPortId
    let actualToNodeId = toNodeId
    let actualToPortId = toPortId

    if (fromPort.direction === 'input') {
      actualFromNodeId = toNodeId
      actualFromPortId = toPortId
      actualToNodeId = fromNodeId
      actualToPortId = fromPortId
    }

    const connection: Connection = {
      id: uuidv4(),
      fromNodeId: actualFromNodeId,
      fromPortId: actualFromPortId,
      toNodeId: actualToNodeId,
      toPortId: actualToPortId,
      routePoints: [],
      label: ''
    }

    const nextNetlist = {
      ...current,
      connections: [...current.connections, connection]
    }
    const nextDb = {
      ...state.db,
      netlists: {
        ...state.db.netlists,
        [current.id]: nextNetlist
      }
    }

    set({
      ...pushHistory(state),
      ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack),
      selectedConnectionId: connection.id,
      selectedNodeIds: []
    })

    return { ok: true }
  },

  deleteConnection: (id) => {
    set(state => {
      const current = getCurrentNetlist(state)
      const nextNetlist = {
        ...current,
        connections: current.connections.filter(connection => connection.id !== id)
      }
      const nextDb = {
        ...state.db,
        netlists: {
          ...state.db.netlists,
          [current.id]: nextNetlist
        }
      }
      return {
        ...pushHistory(state),
        ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack),
        selectedConnectionId: state.selectedConnectionId === id ? null : state.selectedConnectionId
      }
    })
  },

  updateConnectionLabel: (id, label) => {
    set(state => {
      const current = getCurrentNetlist(state)
      const nextNetlist = {
        ...current,
        connections: current.connections.map(connection => connection.id === id ? { ...connection, label } : connection)
      }
      const nextDb = {
        ...state.db,
        netlists: {
          ...state.db.netlists,
          [current.id]: nextNetlist
        }
      }
      return buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack)
    })
  },

  setDraggingConnection: draggingConnection => set({ draggingConnection }),

  setSelectedNodes: ids => set({ selectedNodeIds: ids, selectedConnectionId: null }),

  toggleSelectedNode: id => {
    set(state => ({
      selectedNodeIds: state.selectedNodeIds.includes(id)
        ? state.selectedNodeIds.filter(entry => entry !== id)
        : [...state.selectedNodeIds, id],
      selectedConnectionId: null
    }))
  },

  setSelectedConnection: id => set({ selectedConnectionId: id, selectedNodeIds: [] }),

  toggleSelectedConnection: id => {
    set(state => ({
      selectedConnectionId: state.selectedConnectionId === id ? null : id,
      selectedNodeIds: []
    }))
  },

  openConfigDialog: nodeId => set({ configDialogNodeId: nodeId }),

  closeConfigDialog: () => set({ configDialogNodeId: null }),

  undo: () => {
    set(state => {
      const { past, future } = state.history
      if (past.length === 0) return state
      const previous = past[past.length - 1]
      const current = createSnapshot(state)
      return {
        ...snapshotToState(previous),
        history: {
          past: past.slice(0, -1),
          future: [current, ...future].slice(0, MAX_HISTORY)
        },
        selectedNodeIds: [],
        selectedConnectionId: null,
        draggingConnection: null,
        configDialogNodeId: null
      }
    })
  },

  redo: () => {
    set(state => {
      const { past, future } = state.history
      if (future.length === 0) return state
      const next = future[0]
      const current = createSnapshot(state)
      return {
        ...snapshotToState(next),
        history: {
          past: [...past, current].slice(-MAX_HISTORY),
          future: future.slice(1)
        },
        selectedNodeIds: [],
        selectedConnectionId: null,
        draggingConnection: null,
        configDialogNodeId: null
      }
    })
  },

  setCanvasTransform: (offset, scale) => {
    set(state => {
      const current = getCurrentNetlist(state)
      const nextNetlist = {
        ...current,
        canvasOffset: offset,
        canvasScale: scale
      }
      const nextDb = {
        ...state.db,
        netlists: {
          ...state.db.netlists,
          [current.id]: nextNetlist
        }
      }
      return buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack)
    })
  },

  fitToScreen: (containerWidth, containerHeight) => {
    const state = get()
    const current = getCurrentNetlist(state)
    if (current.nodes.length === 0) {
      get().setCanvasTransform({ ...DEFAULT_OFFSET }, 1)
      return
    }

    const padding = 60
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    current.nodes.forEach(node => {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x + node.width)
      maxY = Math.max(maxY, node.y + computeNodeHeight(node))
    })

    const graphWidth = Math.max(1, maxX - minX)
    const graphHeight = Math.max(1, maxY - minY)
    const scaleX = (containerWidth - padding * 2) / graphWidth
    const scaleY = (containerHeight - padding * 2) / graphHeight
    const scale = Math.max(0.1, Math.min(3, Math.min(scaleX, scaleY, 1.5)))
    const centeredX = (containerWidth - graphWidth * scale) / 2 - minX * scale
    const centeredY = (containerHeight - graphHeight * scale) / 2 - minY * scale

    get().setCanvasTransform({ x: centeredX, y: centeredY }, scale)
  },

  newProject: () => {
    const nextDb = createSampleDatabase()
    const nextNetlist = nextDb.netlists[nextDb.rootNetlistId]
    set({
      projectId: nextDb.id,
      projectName: nextDb.name,
      projectVersion: nextDb.version,
      db: nextDb,
      currentNetlistId: nextDb.rootNetlistId,
      navigationStack: [],
      nodes: nextNetlist.nodes,
      connections: nextNetlist.connections,
      selectedNodeIds: [],
      selectedConnectionId: null,
      canvasOffset: nextNetlist.canvasOffset,
      canvasScale: nextNetlist.canvasScale,
      draggingConnection: null,
      configDialogNodeId: null,
      history: { past: [], future: [] },
      clipboard: { nodes: [], netlists: {} }
    })
  },

  loadProject: (data: unknown) => {
    try {
      const db = normalizeDb(data)
      const currentNetlistId = db.rootNetlistId
      const current = db.netlists[currentNetlistId]
      set({
        projectId: db.id,
        projectName: db.name,
        projectVersion: db.version,
        db,
        currentNetlistId,
        navigationStack: [],
        nodes: current.nodes,
        connections: current.connections,
        canvasOffset: current.canvasOffset,
        canvasScale: current.canvasScale,
        selectedNodeIds: [],
        selectedConnectionId: null,
        draggingConnection: null,
        configDialogNodeId: null,
        history: { past: [], future: [] },
        clipboard: { nodes: [], netlists: {} }
      })
    } catch (error) {
      console.error('Failed to load project:', error)
    }
  },

  exportProject: () => {
    const state = get()
    const current = getCurrentNetlist(state)
    const syncedDb: NetlistDatabase = {
      ...state.db,
      id: state.projectId,
      name: state.projectName,
      version: state.projectVersion,
      netlists: {
        ...state.db.netlists,
        [current.id]: {
          ...current,
          nodes: state.nodes,
          connections: state.connections,
          canvasOffset: state.canvasOffset,
          canvasScale: state.canvasScale
        }
      }
    }
    return JSON.stringify(syncedDb, null, 2)
  },

  setProjectName: name => {
    set(state => ({
      projectName: name,
      db: {
        ...state.db,
        name
      }
    }))
  },

  copySelected: () => {
    const state = get()
    const current = getCurrentNetlist(state)
    const nodes = current.nodes.filter(node => state.selectedNodeIds.includes(node.id)).map(node => cloneDeep(node))
    const netlists = collectReferencedNetlists(state.db.netlists, nodes)
    set({
      clipboard: {
        nodes,
        netlists
      }
    })
  },

  pasteClipboard: () => {
    const state = get()
    if (state.clipboard.nodes.length === 0) return

    const current = getCurrentNetlist(state)
    let nextDb = state.db
    const newNodes: GraphNode[] = []

    state.clipboard.nodes.forEach(node => {
      let clonedSubgraphId = node.subgraphId
      if (node.subgraphId && state.clipboard.netlists[node.subgraphId]) {
        const duplicatedTree = duplicateNetlistTree(state.clipboard.netlists, node.subgraphId)
        clonedSubgraphId = duplicatedTree.rootNetlistId
        nextDb = {
          ...nextDb,
          libraryNetlistIds: [...new Set([...nextDb.libraryNetlistIds, ...Object.keys(duplicatedTree.netlists)])],
          netlists: {
            ...nextDb.netlists,
            ...duplicatedTree.netlists
          }
        }
      }

      const newNodeId = uuidv4()
      const portIdMap = new Map<string, string>()
      node.ports.forEach(port => portIdMap.set(port.id, uuidv4()))

      newNodes.push({
        ...cloneDeep(node),
        id: newNodeId,
        x: node.x + 40,
        y: node.y + 40,
        subgraphId: clonedSubgraphId,
        ports: node.ports.map(port => ({
          ...cloneDeep(port),
          id: portIdMap.get(port.id)!,
          nodeId: newNodeId
        })),
        parameters: node.parameters.map(parameter => ({ ...cloneDeep(parameter), id: uuidv4() })),
        code: { ...node.code }
      })
    })

    const nextNetlist = {
      ...current,
      nodes: [...current.nodes, ...newNodes]
    }
    nextDb = {
      ...nextDb,
      netlists: {
        ...nextDb.netlists,
        [current.id]: nextNetlist
      }
    }

    set({
      ...pushHistory(state),
      ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack),
      selectedNodeIds: newNodes.map(node => node.id),
      selectedConnectionId: null
    })
  },

  addParameter: (nodeId, param) => {
    set(state => {
      const current = getCurrentNetlist(state)
      const nextParameter: NodeParameter = {
        id: uuidv4(),
        key: param.key || 'key',
        value: param.value || '',
        paramType: param.paramType || 'text'
      }
      let nextNetlist: Netlist = {
        ...current,
        nodes: current.nodes.map(node =>
          node.id === nodeId ? { ...node, parameters: [...node.parameters, nextParameter] } : node
        )
      }
      if (nextParameter.paramType === 'port_generator') {
        nextNetlist = syncGeneratedPortsInNetlist(nextNetlist, nodeId)
      }
      const nextDb = {
        ...state.db,
        netlists: {
          ...state.db.netlists,
          [current.id]: nextNetlist
        }
      }
      return {
        ...pushHistory(state),
        ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack)
      }
    })
  },

  updateParameter: (nodeId, paramId, partial) => {
    set(state => {
      const current = getCurrentNetlist(state)
      let nextNetlist: Netlist = {
        ...current,
        nodes: current.nodes.map(node =>
          node.id === nodeId
            ? { ...node, parameters: node.parameters.map(parameter => parameter.id === paramId ? { ...parameter, ...partial } : parameter) }
            : node
        )
      }

      const editedNode = nextNetlist.nodes.find(node => node.id === nodeId)
      const editedParam = editedNode?.parameters.find(parameter => parameter.id === paramId)
      if (editedParam?.paramType === 'port_generator' || partial.paramType === 'port_generator') {
        nextNetlist = syncGeneratedPortsInNetlist(nextNetlist, nodeId)
      }

      const nextDb = {
        ...state.db,
        netlists: {
          ...state.db.netlists,
          [current.id]: nextNetlist
        }
      }

      return buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack)
    })
  },

  deleteParameter: (nodeId, paramId) => {
    set(state => {
      const current = getCurrentNetlist(state)
      const node = current.nodes.find(entry => entry.id === nodeId)
      const parameter = node?.parameters.find(entry => entry.id === paramId)
      let nextNetlist: Netlist = {
        ...current,
        nodes: current.nodes.map(entry =>
          entry.id === nodeId ? { ...entry, parameters: entry.parameters.filter(item => item.id !== paramId) } : entry
        )
      }
      if (parameter?.paramType === 'port_generator') {
        nextNetlist = syncGeneratedPortsInNetlist(nextNetlist, nodeId)
      }
      const nextDb = {
        ...state.db,
        netlists: {
          ...state.db.netlists,
          [current.id]: nextNetlist
        }
      }
      return {
        ...pushHistory(state),
        ...buildStateForNetlist(nextDb, state.currentNetlistId, state.navigationStack)
      }
    })
  },

  enterHierarchyByNode: (nodeId) => {
    const state = get()
    const current = getCurrentNetlist(state)
    const node = current.nodes.find(entry => entry.id === nodeId)
    if (!node || node.moduleKind !== 'hierarchical') return false

    let nextDb = state.db
    let nextNode = node
    if (!node.subgraphId || !state.db.netlists[node.subgraphId]) {
      const ensured = ensureHierarchyNetlist(state.db, node)
      nextDb = {
        ...ensured.db,
        netlists: {
          ...ensured.db.netlists,
          [current.id]: {
            ...current,
            nodes: current.nodes.map(entry => entry.id === nodeId ? ensured.node : entry)
          }
        }
      }
      nextNode = ensured.node
    }

    set({
      ...buildStateForNetlist(nextDb, nextNode.subgraphId!, [...state.navigationStack, state.currentNetlistId]),
      projectId: state.projectId,
      projectName: state.projectName,
      projectVersion: state.projectVersion,
      history: state.history,
      clipboard: state.clipboard,
      selectedNodeIds: [],
      selectedConnectionId: null,
      draggingConnection: null,
      configDialogNodeId: null
    })
    return true
  },

  exitHierarchy: () => {
    const state = get()
    if (state.navigationStack.length === 0) return false
    const parentId = state.navigationStack[state.navigationStack.length - 1]
    set({
      ...buildStateForNetlist(state.db, parentId, state.navigationStack.slice(0, -1)),
      projectId: state.projectId,
      projectName: state.projectName,
      projectVersion: state.projectVersion,
      history: state.history,
      clipboard: state.clipboard,
      selectedNodeIds: [],
      selectedConnectionId: null,
      draggingConnection: null,
      configDialogNodeId: null
    })
    return true
  }
}))
