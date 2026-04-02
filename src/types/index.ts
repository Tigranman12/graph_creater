export type PortDirection = 'input' | 'output'
export type PortSide = 'left' | 'right' | 'top' | 'bottom'
export type ParamType = 'text' | 'number' | 'port_generator' | 'flag'
export type CodeLanguage = 'cpp' | 'systemc' | 'python' | 'tcl' | 'plain'
export type ModuleKind = 'behavioral' | 'hierarchical'
export type ModuleType = 'behavioral' | 'structural'

export interface Port {
  id: string
  nodeId: string
  name: string
  direction: PortDirection
  side: PortSide
  order: number
  maxConnections: number
  generatedByParamId?: string
}

export interface NodeParameter {
  id: string
  key: string
  value: string
  paramType: ParamType
}

export interface NodeCode {
  language: CodeLanguage
  initCode: string
  fireCode: string
  finishCode: string
}

export interface GraphNode {
  id: string
  name: string
  subtitle: string
  moduleType: ModuleType
  moduleKind: ModuleKind
  subgraphId?: string
  x: number
  y: number
  width: number
  height: number
  styleColor: string
  ports: Port[]
  parameters: NodeParameter[]
  code: NodeCode
  locked: boolean
  collapsed: boolean
}

export interface Connection {
  id: string
  fromNodeId: string
  fromPortId: string
  toNodeId: string
  toPortId: string
  routePoints: { x: number; y: number }[]
  label: string
}

export interface Netlist {
  id: string
  name: string
  nodes: GraphNode[]
  connections: Connection[]
  canvasOffset: { x: number; y: number }
  canvasScale: number
}

export interface NetlistDatabase {
  id: string
  name: string
  version: string
  rootNetlistId: string
  libraryNetlistIds: string[]
  netlists: Record<string, Netlist>
}

export interface DraggingConnection {
  fromNodeId: string
  fromPortId: string
  fromPoint: { x: number; y: number }
  currentPoint: { x: number; y: number }
}

export interface Snapshot {
  db: NetlistDatabase
  currentNetlistId: string
  navigationStack: string[]
}

export interface NodeTemplate {
  name: string
  subtitle: string
  color: string
  moduleKind?: ModuleKind
  createSubgraph?: boolean
  defaultPorts: Partial<Port>[]
  defaultParameters?: Partial<NodeParameter>[]
}

declare global {
  interface Window {
    electronAPI?: {
      saveFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>
      loadFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
      showSaveDialog: () => Promise<{ canceled: boolean; filePath?: string }>
      showOpenDialog: () => Promise<{ canceled: boolean; filePaths?: string[] }>
      showExportDialog: () => Promise<{ canceled: boolean; filePath?: string }>
      onMenuAction: (callback: (event: unknown, action: string) => void) => () => void
    }
  }
}
