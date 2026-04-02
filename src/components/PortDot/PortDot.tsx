import React, { useCallback } from 'react'
import { Port } from '../../types'
import { useGraphStore } from '../../store/graphStore'

interface PortDotProps {
  port: Port
  nodeX: number
  nodeY: number
  nodeWidth: number
  nodeHeight: number
  nodeCollapsed: boolean
  allPorts: Port[]
  isDraggingConnection: boolean
  isValidTarget: boolean | null // null = not checked
  onPortMouseDown: (portId: string, e: React.MouseEvent) => void
  onPortMouseUp: (portId: string) => void
}

const PORT_RADIUS = 6
const PORT_HOVER_RADIUS = 8

export const PortDot: React.FC<PortDotProps> = ({
  port,
  nodeX,
  nodeY,
  nodeWidth,
  allPorts,
  isDraggingConnection,
  isValidTarget,
  onPortMouseDown,
  onPortMouseUp
}) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const connections = useGraphStore(s => s.connections)

  // Compute port position relative to node origin
  const headerHeight = 44
  const leftPorts = allPorts.filter(p => p.side === 'left').sort((a, b) => a.order - b.order)
  const rightPorts = allPorts.filter(p => p.side === 'right').sort((a, b) => a.order - b.order)
  const topPorts = allPorts.filter(p => p.side === 'top').sort((a, b) => a.order - b.order)
  const bottomPorts = allPorts.filter(p => p.side === 'bottom').sort((a, b) => a.order - b.order)

  let px = 0
  let py = 0
  let labelAnchor: 'start' | 'end' = 'start'
  let labelX = 0

  if (port.side === 'left') {
    const idx = leftPorts.findIndex(p => p.id === port.id)
    px = 0
    py = headerHeight + idx * 28 + 18
    labelAnchor = 'start'
    labelX = PORT_RADIUS + 8
  } else if (port.side === 'right') {
    const idx = rightPorts.findIndex(p => p.id === port.id)
    px = nodeWidth
    py = headerHeight + idx * 28 + 18
    labelAnchor = 'end'
    labelX = -PORT_RADIUS - 8
  } else if (port.side === 'top') {
    const idx = topPorts.findIndex(p => p.id === port.id)
    const spacing = nodeWidth / (topPorts.length + 1)
    px = spacing * (idx + 1)
    py = 0
    labelAnchor = 'start'
    labelX = PORT_RADIUS + 4
  } else {
    const idx = bottomPorts.findIndex(p => p.id === port.id)
    const spacing = nodeWidth / (bottomPorts.length + 1)
    px = spacing * (idx + 1)
    py = 0 // will be adjusted by nodeHeight
    labelAnchor = 'start'
    labelX = PORT_RADIUS + 4
  }

  const isConnected = connections.some(
    c => c.fromPortId === port.id || c.toPortId === port.id
  )

  const isOutput = port.direction === 'output'

  // Determine fill color based on state
  let circleColor = isOutput ? '#5B9BD5' : '#3a4556'
  let strokeColor = isOutput ? '#7BB8F0' : '#5B8DD9'
  let circleRadius = PORT_RADIUS

  if (isDraggingConnection) {
    if (isValidTarget === true) {
      circleColor = '#4CAF50'
      strokeColor = '#81C784'
      circleRadius = PORT_HOVER_RADIUS
    } else if (isValidTarget === false) {
      circleColor = '#3a2a2a'
      strokeColor = '#e57373'
      circleRadius = PORT_RADIUS
    }
  } else if (isHovered) {
    circleRadius = PORT_HOVER_RADIUS
    strokeColor = '#90CAF9'
    circleColor = isOutput ? '#6BAEE0' : '#4a5566'
  }

  if (isConnected && !isDraggingConnection) {
    circleColor = isOutput ? '#4A90D9' : '#3d6a9e'
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onPortMouseDown(port.id, e)
  }, [port.id, onPortMouseDown])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onPortMouseUp(port.id)
  }, [port.id, onPortMouseUp])

  // Label positioning based on side
  const showLabel = port.side === 'left' || port.side === 'right'
  const labelTextAnchor = port.side === 'left' ? 'start' : 'end'
  const labelOffX = port.side === 'left' ? PORT_RADIUS + 8 : -PORT_RADIUS - 8

  return (
    <g
      transform={`translate(${px}, ${py})`}
      style={{ cursor: 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Port circle */}
      <circle
        r={circleRadius}
        fill={circleColor}
        stroke={strokeColor}
        strokeWidth={1.5}
        style={{
          transition: 'r 0.1s ease, fill 0.1s ease',
          filter: (isHovered || isValidTarget === true)
            ? `drop-shadow(0 0 4px ${strokeColor})`
            : 'none'
        }}
      />

      {/* Direction indicator triangle */}
      {isOutput ? (
        <polygon
          points="2,-3 8,0 2,3"
          fill={strokeColor}
          opacity={0.8}
          style={{ pointerEvents: 'none' }}
        />
      ) : (
        <polygon
          points="-8,-3 -2,0 -8,3"
          fill="#5B8DD9"
          opacity={0.6}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Port label */}
      {showLabel && (
        <text
          x={labelOffX}
          y={0}
          dominantBaseline="middle"
          textAnchor={labelTextAnchor}
          fill="#9baab8"
          fontSize={10}
          fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {port.name}
        </text>
      )}

      {/* Hover tooltip for top/bottom ports */}
      {isHovered && !showLabel && (
        <text
          x={0}
          y={port.side === 'top' ? -14 : 14}
          dominantBaseline="middle"
          textAnchor="middle"
          fill="#e2e8f0"
          fontSize={10}
          fontFamily="system-ui, sans-serif"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {port.name}
        </text>
      )}

      {/* Hit area (larger transparent circle for easier clicking) */}
      <circle
        r={PORT_HOVER_RADIUS + 4}
        fill="transparent"
        style={{ cursor: 'crosshair' }}
      />
    </g>
  )
}

export default PortDot
