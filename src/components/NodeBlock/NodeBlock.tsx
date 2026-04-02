import React, { useCallback, useRef } from 'react'
import { GraphNode, Port } from '../../types'
import { useGraphStore } from '../../store/graphStore'
import { PortDot } from '../PortDot/PortDot'
import { canConnect } from '../../engines/validation'
import { computeNodeHeight } from '../../engines/routing'

interface NodeBlockProps {
  node: GraphNode
  isSelected: boolean
  isDraggingConnection: boolean
  draggingFromPort: Port | null
  onNodeMouseDown: (nodeId: string, e: React.MouseEvent) => void
  onPortMouseDown: (nodeId: string, portId: string, e: React.MouseEvent) => void
  onPortMouseUp: (nodeId: string, portId: string) => void
}

function lightenColor(hex: string, amount: number = 0.15): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const nr = Math.min(255, Math.round(r + (255 - r) * amount))
  const ng = Math.min(255, Math.round(g + (255 - g) * amount))
  const nb = Math.min(255, Math.round(b + (255 - b) * amount))
  return `rgb(${nr}, ${ng}, ${nb})`
}

function darkenColor(hex: string, amount: number = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const nr = Math.max(0, Math.round(r * (1 - amount)))
  const ng = Math.max(0, Math.round(g * (1 - amount)))
  const nb = Math.max(0, Math.round(b * (1 - amount)))
  return `rgb(${nr}, ${ng}, ${nb})`
}

export const NodeBlock: React.FC<NodeBlockProps> = ({
  node,
  isSelected,
  isDraggingConnection,
  draggingFromPort,
  onNodeMouseDown,
  onPortMouseDown,
  onPortMouseUp
}) => {
  const connections = useGraphStore(s => s.connections)
  const openConfigDialog = useGraphStore(s => s.openConfigDialog)
  const enterHierarchyByNode = useGraphStore(s => s.enterHierarchyByNode)
  const lastClickTime = useRef(0)

  const headerHeight = 44
  const nodeHeight = computeNodeHeight(node)
  const { x, y, width, styleColor, name, subtitle, ports, locked, collapsed } = node

  const bodyColor = darkenColor(styleColor, 0.5)
  const isStructural = node.moduleType === 'structural' || node.moduleKind === 'hierarchical'
  const borderColor = isSelected ? '#90CAF9' : isStructural ? '#7DD3A7' : lightenColor(styleColor, 0.05)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (locked) return
    e.stopPropagation()

    // Double-click detection
    const now = Date.now()
    if (now - lastClickTime.current < 350) {
      openConfigDialog(node.id)
      return
    }
    lastClickTime.current = now

    onNodeMouseDown(node.id, e)
  }, [node.id, locked, onNodeMouseDown, openConfigDialog])

  const handlePortMouseDown = useCallback((portId: string, e: React.MouseEvent) => {
    onPortMouseDown(node.id, portId, e)
  }, [node.id, onPortMouseDown])

  const handlePortMouseUp = useCallback((portId: string) => {
    onPortMouseUp(node.id, portId)
  }, [node.id, onPortMouseUp])

  const getPortValidState = useCallback((port: Port): boolean | null => {
    if (!isDraggingConnection || !draggingFromPort) return null
    if (port.nodeId === draggingFromPort.nodeId) return false
    const result = canConnect(draggingFromPort, port, connections)
    return result.ok
  }, [isDraggingConnection, draggingFromPort, connections])

  const topPorts = ports.filter(p => p.side === 'top').sort((a, b) => a.order - b.order)
  const bottomPorts = ports.filter(p => p.side === 'bottom').sort((a, b) => a.order - b.order)

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: locked ? 'not-allowed' : 'move' }}
      onMouseDown={handleMouseDown}
    >
      {/* Selection glow */}
      {isSelected && (
        <rect
          x={-3}
          y={-3}
          width={width + 6}
          height={nodeHeight + 6}
          rx={10}
          ry={10}
          fill="none"
          stroke="#4A90D9"
          strokeWidth={2}
          opacity={0.6}
          style={{ filter: 'drop-shadow(0 0 6px #4A90D9)' }}
        />
      )}

      {/* Node body */}
      <rect
        x={0}
        y={0}
        width={width}
        height={nodeHeight}
        rx={8}
        ry={8}
        fill={bodyColor}
        stroke={borderColor}
        strokeWidth={isSelected ? 2 : isStructural ? 1.8 : 1}
        strokeDasharray={isStructural ? '6 4' : undefined}
      />

      {/* Header background */}
      <rect
        x={0}
        y={0}
        width={width}
        height={headerHeight}
        rx={8}
        ry={8}
        fill={styleColor}
        opacity={0.95}
      />
      {/* Cover bottom corners of header */}
      {!collapsed && (
        <rect
          x={0}
          y={headerHeight - 8}
          width={width}
          height={8}
          fill={styleColor}
          opacity={0.95}
        />
      )}

      {/* Lock icon */}
      {locked && (
        <text
          x={width - 14}
          y={14}
          fill="rgba(255,255,255,0.7)"
          fontSize={10}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none' }}
        >
          🔒
        </text>
      )}

      {node.moduleKind === 'hierarchical' && (
        <g
          transform={`translate(${width - 22}, 10)`}
          onDoubleClick={e => {
            e.stopPropagation()
            enterHierarchyByNode(node.id)
          }}
          style={{ cursor: 'pointer' }}
        >
          <rect
            x={-8}
            y={-8}
            width={16}
            height={16}
            rx={3}
            fill="rgba(15, 23, 42, 0.28)"
            stroke="rgba(255,255,255,0.25)"
          />
          <text
            x={0}
            y={1}
            fill="#ffffff"
            fontSize={9}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            H
          </text>
        </g>
      )}

      {isStructural && (
        <g transform={`translate(${width - 48}, 10)`}>
          <rect
            x={-18}
            y={-8}
            width={32}
            height={16}
            rx={8}
            fill="rgba(18, 52, 35, 0.55)"
            stroke="rgba(125, 211, 167, 0.45)"
          />
          <text
            x={-2}
            y={1}
            fill="#c8f3de"
            fontSize={8}
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            STRUCT
          </text>
        </g>
      )}

      {/* Node name */}
      <text
        x={width / 2}
        y={locked ? 18 : 22}
        fill="#ffffff"
        fontSize={13}
        fontWeight="600"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {name}
      </text>

      {/* Subtitle */}
      {subtitle && (
        <text
          x={width / 2}
          y={34}
          fill="rgba(255,255,255,0.65)"
          fontSize={10}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="system-ui, sans-serif"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {subtitle}
        </text>
      )}

      <text
        x={12}
        y={16}
        fill="rgba(255,255,255,0.55)"
        fontSize={8}
        textAnchor="start"
        dominantBaseline="middle"
        fontFamily="monospace"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {node.id.slice(0, 8)}
      </text>

      {/* Ports — top side */}
      {topPorts.map(port => (
        <PortDot
          key={port.id}
          port={port}
          nodeX={x}
          nodeY={y}
          nodeWidth={width}
          nodeHeight={nodeHeight}
          nodeCollapsed={collapsed}
          allPorts={ports}
          isDraggingConnection={isDraggingConnection}
          isValidTarget={getPortValidState(port)}
          onPortMouseDown={handlePortMouseDown}
          onPortMouseUp={handlePortMouseUp}
        />
      ))}

      {/* Ports — left & right (only if not collapsed) */}
      {!collapsed && ports
        .filter(p => p.side === 'left' || p.side === 'right')
        .map(port => (
          <PortDot
            key={port.id}
            port={port}
            nodeX={x}
            nodeY={y}
            nodeWidth={width}
            nodeHeight={nodeHeight}
            nodeCollapsed={collapsed}
            allPorts={ports}
            isDraggingConnection={isDraggingConnection}
            isValidTarget={getPortValidState(port)}
            onPortMouseDown={handlePortMouseDown}
            onPortMouseUp={handlePortMouseUp}
          />
        ))}

      {/* Ports — bottom side */}
      {bottomPorts.map(port => (
        <g key={port.id} transform={`translate(0, ${nodeHeight})`}>
          <PortDot
            port={port}
            nodeX={x}
            nodeY={y}
            nodeWidth={width}
            nodeHeight={nodeHeight}
            nodeCollapsed={collapsed}
            allPorts={ports}
            isDraggingConnection={isDraggingConnection}
            isValidTarget={getPortValidState(port)}
            onPortMouseDown={handlePortMouseDown}
            onPortMouseUp={handlePortMouseUp}
          />
        </g>
      ))}

      {/* Collapsed indicator */}
      {collapsed && ports.filter(p => p.side === 'left' || p.side === 'right').length > 0 && (
        <text
          x={width / 2}
          y={headerHeight + 12}
          fill="rgba(255,255,255,0.4)"
          fontSize={9}
          textAnchor="middle"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          ···
        </text>
      )}
    </g>
  )
}

export default NodeBlock
