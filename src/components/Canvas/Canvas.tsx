import React, { useRef, useCallback, useEffect, useState } from 'react'
import './Canvas.css'
import { useGraphStore } from '../../store/graphStore'
import { NodeBlock } from '../NodeBlock/NodeBlock'
import { ConnectionLine } from '../ConnectionLine/ConnectionLine'
import { GraphNode, Port, PortSide } from '../../types'
import { getPortAnchor, pointsToSmoothPathD, computeNodeHeight } from '../../engines/routing'

function computeSnapSide(point: { x: number; y: number }, node: GraphNode): PortSide {
  const nh = computeNodeHeight(node)
  const distLeft   = Math.abs(point.x - node.x)
  const distRight  = Math.abs(point.x - (node.x + node.width))
  const distTop    = Math.abs(point.y - node.y)
  const distBottom = Math.abs(point.y - (node.y + nh))
  const min = Math.min(distLeft, distRight, distTop, distBottom)
  if (min === distLeft)   return 'left'
  if (min === distRight)  return 'right'
  if (min === distTop)    return 'top'
  return 'bottom'
}

interface DragState {
  nodeId: string
  startMouseX: number
  startMouseY: number
  startNodeX: number
  startNodeY: number
}

interface SelectionRect {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export const Canvas: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Store state
  const nodes = useGraphStore(s => s.nodes)
  const connections = useGraphStore(s => s.connections)
  const selectedNodeIds = useGraphStore(s => s.selectedNodeIds)
  const selectedConnectionId = useGraphStore(s => s.selectedConnectionId)
  const canvasOffset = useGraphStore(s => s.canvasOffset)
  const canvasScale = useGraphStore(s => s.canvasScale)
  const draggingConnection = useGraphStore(s => s.draggingConnection)
  const navigationStack = useGraphStore(s => s.navigationStack)
  const clipboardCount = useGraphStore(s => s.clipboard.nodes.length)

  // Store actions
  const setCanvasTransform = useGraphStore(s => s.setCanvasTransform)
  const setSelectedNodes = useGraphStore(s => s.setSelectedNodes)
  const toggleSelectedNode = useGraphStore(s => s.toggleSelectedNode)
  const setSelectedConnection = useGraphStore(s => s.setSelectedConnection)
  const toggleSelectedConnection = useGraphStore(s => s.toggleSelectedConnection)
  const setDraggingConnection = useGraphStore(s => s.setDraggingConnection)
  const moveNode = useGraphStore(s => s.moveNode)
  const commitNodeMove = useGraphStore(s => s.commitNodeMove)
  const addConnection = useGraphStore(s => s.addConnection)
  const deleteSelectedNodes = useGraphStore(s => s.deleteSelectedNodes)
  const copySelected = useGraphStore(s => s.copySelected)
  const pasteClipboard = useGraphStore(s => s.pasteClipboard)
  const groupSelectedAsSubmodule = useGraphStore(s => s.groupSelectedAsSubmodule)
  const flattenNode = useGraphStore(s => s.flattenNode)
  const enterHierarchyByNode = useGraphStore(s => s.enterHierarchyByNode)
  const exitHierarchy = useGraphStore(s => s.exitHierarchy)
  const undo = useGraphStore(s => s.undo)
  const redo = useGraphStore(s => s.redo)

  const updatePort = useGraphStore(s => s.updatePort)

  // Local interaction state
  const [isPanning, setIsPanning] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // Port drag (Ctrl+drag to reposition)
  const portDragRef = useRef<{ nodeId: string; portId: string } | null>(null)
  const [portDragPoint, setPortDragPoint] = useState<{ x: number; y: number } | null>(null)
  const [portDragSnapSide, setPortDragSnapSide] = useState<PortSide | null>(null)

  const panStartRef = useRef<{ mouseX: number; mouseY: number; offsetX: number; offsetY: number } | null>(null)
  const nodeDragRef = useRef<DragState | null>(null)
  const isNodeDragging = useRef(false)

  // Convert screen coords to graph coords
  const screenToGraph = useCallback((sx: number, sy: number) => {
    return {
      x: (sx - canvasOffset.x) / canvasScale,
      y: (sy - canvasOffset.y) / canvasScale
    }
  }, [canvasOffset, canvasScale])

  // Get SVG-relative mouse position
  const getSVGPoint = useCallback((e: MouseEvent | React.MouseEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  // Handle canvas background mousedown
  const handleSVGMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== svgRef.current && !(e.target as Element).classList.contains('canvas-bg')) {
      return
    }

    e.preventDefault()
    setContextMenu(null)

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle mouse or Alt+drag = pan
      const pt = getSVGPoint(e)
      panStartRef.current = {
        mouseX: pt.x,
        mouseY: pt.y,
        offsetX: canvasOffset.x,
        offsetY: canvasOffset.y
      }
      setIsPanning(true)
      return
    }

    if (e.button === 0) {
      // Left click: clear selection unless Ctrl is held
      if (!e.ctrlKey && !e.metaKey) {
        setSelectedNodes([])
        setSelectedConnection(null)
      }

      const pt = getSVGPoint(e)
      setSelectionRect({
        startX: pt.x,
        startY: pt.y,
        currentX: pt.x,
        currentY: pt.y
      })
      setIsSelecting(true)
    }
  }, [canvasOffset, getSVGPoint, setSelectedNodes, setSelectedConnection])

  // Node drag start
  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    if (e.button === 2) return
    const node = nodes.find(n => n.id === nodeId)
    if (!node || node.locked) return
    setContextMenu(null)

    if (!e.ctrlKey && !e.metaKey) {
      if (!selectedNodeIds.includes(nodeId)) {
        setSelectedNodes([nodeId])
      }
    } else {
      toggleSelectedNode(nodeId)
    }

    const pt = getSVGPoint(e)
    nodeDragRef.current = {
      nodeId,
      startMouseX: pt.x,
      startMouseY: pt.y,
      startNodeX: node.x,
      startNodeY: node.y
    }
    isNodeDragging.current = false
  }, [nodes, selectedNodeIds, setSelectedNodes, toggleSelectedNode, getSVGPoint])

  const handleNodeContextMenu = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    if (!selectedNodeIds.includes(nodeId)) {
      setSelectedNodes([nodeId])
      setSelectedConnection(null)
    }
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [nodes, selectedNodeIds, setSelectedNodes, setSelectedConnection])

  // Port mousedown — Ctrl+drag repositions port, normal drag creates connection
  const handlePortMouseDown = useCallback((nodeId: string, portId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const port = node.ports.find(p => p.id === portId)
    if (!port) return

    if (e.ctrlKey || e.metaKey) {
      // Start port repositioning
      portDragRef.current = { nodeId, portId }
      const pt = getSVGPoint(e)
      const graphPt = screenToGraph(pt.x, pt.y)
      setPortDragPoint(graphPt)
      setPortDragSnapSide(computeSnapSide(graphPt, node))
      return
    }

    // Normal: start connection drag
    const anchor = getPortAnchor(node, port)
    const pt = getSVGPoint(e)
    const graphPt = screenToGraph(pt.x, pt.y)
    setDraggingConnection({ fromNodeId: nodeId, fromPortId: portId, fromPoint: anchor, currentPoint: graphPt })
    setSelectedNodes([])
    setSelectedConnection(null)
  }, [nodes, getSVGPoint, screenToGraph, setDraggingConnection, setSelectedNodes, setSelectedConnection])

  // Port mouseup — finish dragging connection
  const handlePortMouseUp = useCallback((nodeId: string, portId: string) => {
    if (!draggingConnection) return
    if (draggingConnection.fromNodeId === nodeId && draggingConnection.fromPortId === portId) {
      setDraggingConnection(null)
      return
    }

    const result = addConnection(
      draggingConnection.fromNodeId,
      draggingConnection.fromPortId,
      nodeId,
      portId
    )

    if (!result.ok) {
      console.log('Connection rejected:', result.reason)
    }

    setDraggingConnection(null)
  }, [draggingConnection, addConnection, setDraggingConnection])

  // Mouse move handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const pt = getSVGPoint(e)

    // Port drag (Ctrl+drag to reposition)
    if (portDragRef.current) {
      const graphPt = screenToGraph(pt.x, pt.y)
      setPortDragPoint(graphPt)
      const node = nodes.find(n => n.id === portDragRef.current!.nodeId)
      if (node) setPortDragSnapSide(computeSnapSide(graphPt, node))
      return
    }

    // Pan
    if (isPanning && panStartRef.current) {
      const dx = pt.x - panStartRef.current.mouseX
      const dy = pt.y - panStartRef.current.mouseY
      setCanvasTransform(
        { x: panStartRef.current.offsetX + dx, y: panStartRef.current.offsetY + dy },
        canvasScale
      )
      return
    }

    // Node drag
    if (nodeDragRef.current) {
      const drag = nodeDragRef.current
      const dx = pt.x - drag.startMouseX
      const dy = pt.y - drag.startMouseY

      if (!isNodeDragging.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isNodeDragging.current = true
      }

      if (isNodeDragging.current) {
        const graphDX = dx / canvasScale
        const graphDY = dy / canvasScale

        const newX = drag.startNodeX + graphDX
        const newY = drag.startNodeY + graphDY

        // Move all selected nodes if multiple selected
        if (selectedNodeIds.length > 1 && selectedNodeIds.includes(drag.nodeId)) {
          const node = nodes.find(n => n.id === drag.nodeId)
          if (node) {
            const refDX = newX - node.x
            const refDY = newY - node.y
            selectedNodeIds.forEach(id => {
              const n = nodes.find(n => n.id === id)
              if (n) {
                moveNode(id, n.x + refDX, n.y + refDY)
              }
            })
          }
        } else {
          moveNode(drag.nodeId, newX, newY)
        }
      }
      return
    }

    // Update dragging connection current point
    if (draggingConnection) {
      const graphPt = screenToGraph(pt.x, pt.y)
      setDraggingConnection({
        ...draggingConnection,
        currentPoint: graphPt
      })
      return
    }

    // Update selection rect
    if (isSelecting && selectionRect) {
      setSelectionRect(prev => prev ? { ...prev, currentX: pt.x, currentY: pt.y } : null)
    }
  }, [
    isPanning, canvasScale, canvasOffset, getSVGPoint, setCanvasTransform,
    nodeDragRef, selectedNodeIds, nodes, moveNode,
    draggingConnection, setDraggingConnection, screenToGraph,
    isSelecting, selectionRect
  ])

  const handleMouseUp = useCallback((_e: MouseEvent) => {
    // End port drag (Ctrl+drag reposition)
    if (portDragRef.current) {
      const { nodeId, portId } = portDragRef.current
      const node = nodes.find(n => n.id === nodeId)
      if (node && portDragSnapSide && portDragPoint) {
        const portsOnSide = node.ports.filter(p => p.side === portDragSnapSide && p.id !== portId)
        updatePort(nodeId, portId, { side: portDragSnapSide, order: portsOnSide.length })
      }
      portDragRef.current = null
      setPortDragPoint(null)
      setPortDragSnapSide(null)
      return
    }

    // End pan
    if (isPanning) {
      setIsPanning(false)
      panStartRef.current = null
      return
    }

    // End node drag
    if (nodeDragRef.current) {
      if (isNodeDragging.current) {
        commitNodeMove(nodeDragRef.current.nodeId)
      }
      nodeDragRef.current = null
      isNodeDragging.current = false
      return
    }

    // Cancel dragging connection if released outside a port
    if (draggingConnection) {
      setDraggingConnection(null)
      return
    }

    // Finalize selection rect
    if (isSelecting && selectionRect) {
      const minX = Math.min(selectionRect.startX, selectionRect.currentX)
      const maxX = Math.max(selectionRect.startX, selectionRect.currentX)
      const minY = Math.min(selectionRect.startY, selectionRect.currentY)
      const maxY = Math.max(selectionRect.startY, selectionRect.currentY)

      if (maxX - minX > 4 || maxY - minY > 4) {
        // Convert to graph coords and find nodes inside
        const gMin = screenToGraph(minX, minY)
        const gMax = screenToGraph(maxX, maxY)

        const selected = nodes.filter(node => {
          return (
            node.x + node.width > gMin.x &&
            node.x < gMax.x &&
            node.y + 44 > gMin.y &&
            node.y < gMax.y
          )
        }).map(n => n.id)

        if (e.ctrlKey || e.metaKey) {
          // Add to current selection
          const nextSet = new Set([...selectedNodeIds, ...selected])
          setSelectedNodes(Array.from(nextSet))
        } else {
          setSelectedNodes(selected)
        }
      }

      setIsSelecting(false)
      setSelectionRect(null)
    }
  }, [
    isPanning, draggingConnection, setDraggingConnection,
    isSelecting, selectionRect, nodes, screenToGraph,
    setSelectedNodes, commitNodeMove
  ])

  // Wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const pt = getSVGPoint(e)
    const delta = e.deltaY < 0 ? 1.1 : 1 / 1.1
    const newScale = Math.max(0.1, Math.min(3.0, canvasScale * delta))

    // Zoom around cursor position
    const newOffsetX = pt.x - (pt.x - canvasOffset.x) * (newScale / canvasScale)
    const newOffsetY = pt.y - (pt.y - canvasOffset.y) * (newScale / canvasScale)

    setCanvasTransform({ x: newOffsetX, y: newOffsetY }, newScale)
  }, [canvasScale, canvasOffset, getSVGPoint, setCanvasTransform])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelectedNodes()
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.key === 'z' && e.shiftKey) { e.preventDefault(); redo() }
      if (e.key === 'y') { e.preventDefault(); redo() }
    }
  }, [deleteSelectedNodes, undo, redo])

  // Attach global event listeners
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    svg.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      svg.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleMouseMove, handleMouseUp, handleWheel, handleKeyDown])

  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    window.addEventListener('resize', closeMenu)
    window.addEventListener('scroll', closeMenu, true)
    return () => {
      window.removeEventListener('resize', closeMenu)
      window.removeEventListener('scroll', closeMenu, true)
    }
  }, [])

  // Dragging connection preview path
  const dragPreviewPath = React.useMemo(() => {
    if (!draggingConnection) return null
    const { fromPoint, currentPoint } = draggingConnection
    const node = nodes.find(n => n.id === draggingConnection.fromNodeId)
    const port = node?.ports.find(p => p.id === draggingConnection.fromPortId)
    if (!port) return null

    // Simple curved preview
    const dx = currentPoint.x - fromPoint.x
    const dy = currentPoint.y - fromPoint.y

    let cp1x = fromPoint.x
    let cp2x = currentPoint.x

    if (port.side === 'right') {
      cp1x = fromPoint.x + Math.max(40, Math.abs(dx) * 0.4)
      cp2x = currentPoint.x - Math.max(40, Math.abs(dx) * 0.4)
    } else if (port.side === 'left') {
      cp1x = fromPoint.x - Math.max(40, Math.abs(dx) * 0.4)
      cp2x = currentPoint.x + Math.max(40, Math.abs(dx) * 0.4)
    }

    return `M ${fromPoint.x} ${fromPoint.y} C ${cp1x} ${fromPoint.y} ${cp2x} ${currentPoint.y} ${currentPoint.x} ${currentPoint.y}`
  }, [draggingConnection, nodes])

  // Selection rect in graph coordinates
  const selectionRectInGraph = selectionRect ? {
    x: Math.min(selectionRect.startX, selectionRect.currentX),
    y: Math.min(selectionRect.startY, selectionRect.currentY),
    width: Math.abs(selectionRect.currentX - selectionRect.startX),
    height: Math.abs(selectionRect.currentY - selectionRect.startY)
  } : null

  const selectedSingleNode = selectedNodeIds.length === 1
    ? nodes.find(node => node.id === selectedNodeIds[0]) || null
    : null
  const canGoDown = !!selectedSingleNode && selectedSingleNode.moduleKind === 'hierarchical'
  const canFlatten = !!selectedSingleNode && selectedSingleNode.moduleKind === 'hierarchical'
  const canGoUp = navigationStack.length > 0

  const cursor = isPanning ? 'grabbing' : draggingConnection ? 'crosshair' : 'default'

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onContextMenu={e => {
        if (selectedNodeIds.length === 0) return
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY })
      }}
    >
      <svg
        ref={svgRef}
        className="canvas-svg"
        style={{ cursor }}
        onMouseDown={handleSVGMouseDown}
      >
        {/* Grid pattern */}
        <defs>
          <pattern
            id="dot-grid"
            x={canvasOffset.x % 20}
            y={canvasOffset.y % 20}
            width={20 * canvasScale}
            height={20 * canvasScale}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={0}
              cy={0}
              r={0.8}
              fill="#2a3040"
              opacity={0.7}
            />
          </pattern>

          <pattern
            id="major-grid"
            x={canvasOffset.x % 100}
            y={canvasOffset.y % 100}
            width={100 * canvasScale}
            height={100 * canvasScale}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${100 * canvasScale} 0 L 0 0 0 ${100 * canvasScale}`}
              fill="none"
              stroke="#252a36"
              strokeWidth={0.5}
              opacity={0.5}
            />
          </pattern>
        </defs>

        {/* Background */}
        <rect
          className="canvas-bg"
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill="#16181f"
        />
        <rect
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill="url(#major-grid)"
          style={{ pointerEvents: 'none' }}
        />
        <rect
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill="url(#dot-grid)"
          style={{ pointerEvents: 'none' }}
        />

        {/* Main graph group with transform */}
        <g transform={`translate(${canvasOffset.x}, ${canvasOffset.y}) scale(${canvasScale})`}>
          {/* Connections */}
          {connections.map(conn => (
            <ConnectionLine
              key={conn.id}
              connection={conn}
              nodes={nodes}
              isSelected={conn.id === selectedConnectionId}
              onClick={setSelectedConnection}
              onToggle={toggleSelectedConnection}
            />
          ))}

          {/* Dragging connection preview */}
          {dragPreviewPath && (
            <path
              d={dragPreviewPath}
              fill="none"
              stroke="#5B9BD5"
              strokeWidth={2}
              strokeDasharray="6 4"
              strokeLinecap="round"
              opacity={0.85}
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Nodes */}
          {nodes.map(node => (
            <NodeBlock
              key={node.id}
              node={node}
              isSelected={selectedNodeIds.includes(node.id)}
              isDraggingConnection={!!draggingConnection}
              draggingFromPort={
                draggingConnection
                  ? nodes.find(n => n.id === draggingConnection.fromNodeId)
                    ?.ports.find(p => p.id === draggingConnection.fromPortId) || null
                  : null
              }
              onNodeMouseDown={handleNodeMouseDown}
              onNodeContextMenu={handleNodeContextMenu}
              onPortMouseDown={handlePortMouseDown}
              onPortMouseUp={handlePortMouseUp}
            />
          ))}

          {/* Port drag ghost + snap indicator */}
          {portDragRef.current && portDragPoint && (() => {
            const node = nodes.find(n => n.id === portDragRef.current!.nodeId)
            if (!node) return null
            const nh = computeNodeHeight(node)
            let snapLine: React.ReactElement | null = null
            if (portDragSnapSide) {
              const lineProps = { stroke: '#90CAF9', strokeWidth: 3, strokeDasharray: '5 3', opacity: 0.85, style: { pointerEvents: 'none' as const } }
              switch (portDragSnapSide) {
                case 'left':   snapLine = <line {...lineProps} x1={node.x} y1={node.y} x2={node.x} y2={node.y + nh} />; break
                case 'right':  snapLine = <line {...lineProps} x1={node.x + node.width} y1={node.y} x2={node.x + node.width} y2={node.y + nh} />; break
                case 'top':    snapLine = <line {...lineProps} x1={node.x} y1={node.y} x2={node.x + node.width} y2={node.y} />; break
                case 'bottom': snapLine = <line {...lineProps} x1={node.x} y1={node.y + nh} x2={node.x + node.width} y2={node.y + nh} />; break
              }
            }
            return (
              <g style={{ pointerEvents: 'none' }}>
                {snapLine}
                <circle cx={portDragPoint.x} cy={portDragPoint.y} r={9} fill="#90CAF9" opacity={0.25} />
                <circle cx={portDragPoint.x} cy={portDragPoint.y} r={6} fill="#90CAF9" opacity={0.8} />
                <circle cx={portDragPoint.x} cy={portDragPoint.y} r={9} fill="none" stroke="#90CAF9" strokeWidth={1.5} strokeDasharray="4 2" opacity={0.6} />
                <text x={portDragPoint.x + 14} y={portDragPoint.y - 10}
                  fill="#90CAF9" fontSize={10} fontFamily="system-ui, sans-serif"
                  dominantBaseline="middle" opacity={0.9}>
                  → {portDragSnapSide}
                </text>
              </g>
            )
          })()}
        </g>

        {/* Selection rectangle (in screen space) */}
        {isSelecting && selectionRectInGraph && selectionRectInGraph.width > 2 && (
          <rect
            className="selection-rect"
            x={selectionRectInGraph.x}
            y={selectionRectInGraph.y}
            width={selectionRectInGraph.width}
            height={selectionRectInGraph.height}
          />
        )}
      </svg>

      {contextMenu && (
        <div
          className="canvas-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="canvas-context-menu-item"
            disabled={clipboardCount === 0}
            onClick={() => {
              pasteClipboard()
              setContextMenu(null)
            }}
          >
            Paste
          </button>
          <button
            className="canvas-context-menu-item"
            onClick={() => {
              copySelected()
              setContextMenu(null)
            }}
          >
            Copy Selected
          </button>
          <button
            className="canvas-context-menu-item"
            disabled={selectedNodeIds.length < 2}
            onClick={() => {
              groupSelectedAsSubmodule()
              setContextMenu(null)
            }}
          >
            Make Hierarchical
          </button>
          <button
            className="canvas-context-menu-item"
            disabled={!canFlatten}
            onClick={() => {
              if (selectedSingleNode) {
                flattenNode(selectedSingleNode.id)
              }
              setContextMenu(null)
            }}
          >
            Flatten
          </button>
          <button
            className="canvas-context-menu-item"
            disabled={!canGoDown}
            onClick={() => {
              if (selectedSingleNode) {
                enterHierarchyByNode(selectedSingleNode.id)
              }
              setContextMenu(null)
            }}
          >
            Go Down
          </button>
          <button
            className="canvas-context-menu-item"
            disabled={!canGoUp}
            onClick={() => {
              exitHierarchy()
              setContextMenu(null)
            }}
          >
            Go Up
          </button>
          <button
            className="canvas-context-menu-item danger"
            onClick={() => {
              deleteSelectedNodes()
              setContextMenu(null)
            }}
          >
            Delete Selected
          </button>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="zoom-indicator">
        {Math.round(canvasScale * 100)}%
      </div>
    </div>
  )
}

export default Canvas
