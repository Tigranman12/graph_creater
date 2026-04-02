import React, { useCallback, useMemo } from 'react'
import { Connection, GraphNode } from '../../types'
import { useGraphStore } from '../../store/graphStore'
import { getPortAnchor, routeConnection, pointsToSmoothPathD } from '../../engines/routing'

interface ConnectionLineProps {
  connection: Connection
  nodes: GraphNode[]
  isSelected: boolean
  onClick: (id: string) => void
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connection,
  nodes,
  isSelected,
  onClick
}) => {
  const [isHovered, setIsHovered] = React.useState(false)

  const fromNode = nodes.find(n => n.id === connection.fromNodeId)
  const toNode = nodes.find(n => n.id === connection.toNodeId)

  const pathD = useMemo(() => {
    if (!fromNode || !toNode) return ''

    const fromPort = fromNode.ports.find(p => p.id === connection.fromPortId)
    const toPort = toNode.ports.find(p => p.id === connection.toPortId)

    if (!fromPort || !toPort) return ''

    const fromAnchor = getPortAnchor(fromNode, fromPort)
    const toAnchor = getPortAnchor(toNode, toPort)

    const excludeIds = [fromNode.id, toNode.id]
    const routePoints = routeConnection(
      fromAnchor,
      toAnchor,
      fromPort.side,
      toPort.side,
      nodes,
      excludeIds
    )

    return pointsToSmoothPathD(routePoints)
  }, [fromNode, toNode, connection, nodes])

  const midPoint = useMemo(() => {
    if (!fromNode || !toNode) return null
    const fromPort = fromNode.ports.find(p => p.id === connection.fromPortId)
    const toPort = toNode.ports.find(p => p.id === connection.toPortId)
    if (!fromPort || !toPort) return null

    const fromAnchor = getPortAnchor(fromNode, fromPort)
    const toAnchor = getPortAnchor(toNode, toPort)
    return {
      x: (fromAnchor.x + toAnchor.x) / 2,
      y: (fromAnchor.y + toAnchor.y) / 2
    }
  }, [fromNode, toNode, connection])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(connection.id)
  }, [connection.id, onClick])

  if (!pathD) return null

  const strokeColor = isSelected ? '#90CAF9' : isHovered ? '#7EB3D9' : '#5B8CAE'
  const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : 1.8

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Wider invisible hit area */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        style={{ cursor: 'pointer' }}
      />

      {/* Visible path */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
          filter: isSelected ? 'drop-shadow(0 0 3px #4A90D9)' : 'none'
        }}
      />

      {/* Arrow indicator at midpoint or end */}
      {isHovered && midPoint && (
        <g transform={`translate(${midPoint.x}, ${midPoint.y})`}>
          <circle r={4} fill={strokeColor} opacity={0.8} />
        </g>
      )}

      {/* Connection label */}
      {connection.label && midPoint && (
        <g transform={`translate(${midPoint.x}, ${midPoint.y - 12})`}>
          <rect
            x={-connection.label.length * 3.5}
            y={-9}
            width={connection.label.length * 7}
            height={16}
            rx={3}
            fill="#1e2535"
            stroke="#2d3340"
            strokeWidth={1}
          />
          <text
            x={0}
            y={0}
            fill="#9baab8"
            fontSize={10}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="system-ui, sans-serif"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {connection.label}
          </text>
        </g>
      )}
    </g>
  )
}

export default ConnectionLine
