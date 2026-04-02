import React, { useCallback } from 'react'
import './Inspector.css'
import { useGraphStore } from '../../store/graphStore'
import { GraphNode } from '../../types'

const NODE_COLORS = [
  '#4A90D9', '#5BA85C', '#D97B5B', '#9B5BD9',
  '#5BD9C8', '#B8A04A', '#D9535B', '#7B9BD9'
]

const Inspector: React.FC = () => {
  const nodes = useGraphStore(s => s.nodes)
  const connections = useGraphStore(s => s.connections)
  const selectedNodeIds = useGraphStore(s => s.selectedNodeIds)
  const selectedConnectionId = useGraphStore(s => s.selectedConnectionId)
  const projectName = useGraphStore(s => s.projectName)
  const db = useGraphStore(s => s.db)
  const currentNetlistId = useGraphStore(s => s.currentNetlistId)
  const navigationStack = useGraphStore(s => s.navigationStack)

  const updateNode = useGraphStore(s => s.updateNode)
  const ensureHierarchyForNode = useGraphStore(s => s.ensureHierarchyForNode)
  const deleteNode = useGraphStore(s => s.deleteNode)
  const deleteConnection = useGraphStore(s => s.deleteConnection)
  const updateConnectionLabel = useGraphStore(s => s.updateConnectionLabel)
  const openConfigDialog = useGraphStore(s => s.openConfigDialog)
  const fitToScreen = useGraphStore(s => s.fitToScreen)
  const setProjectName = useGraphStore(s => s.setProjectName)
  const addParameter = useGraphStore(s => s.addParameter)
  const updateParameter = useGraphStore(s => s.updateParameter)
  const deleteParameter = useGraphStore(s => s.deleteParameter)
  const duplicateNode = useGraphStore(s => s.duplicateNode)
  const lockNode = useGraphStore(s => s.lockNode)
  const collapseNode = useGraphStore(s => s.collapseNode)
  const enterHierarchyByNode = useGraphStore(s => s.enterHierarchyByNode)
  const exitHierarchy = useGraphStore(s => s.exitHierarchy)

  const selectedNode = selectedNodeIds.length === 1
    ? nodes.find(n => n.id === selectedNodeIds[0])
    : null

  const selectedConnection = selectedConnectionId
    ? connections.find(c => c.id === selectedConnectionId)
    : null

  const handleFitToScreen = useCallback(() => {
    const container = document.querySelector('.canvas-container')
    if (container) {
      const rect = container.getBoundingClientRect()
      fitToScreen(rect.width, rect.height)
    }
  }, [fitToScreen])

  // Node inspector
  if (selectedNode) {
    const node = selectedNode
    const leftCount = node.ports.filter(p => p.side === 'left').length
    const rightCount = node.ports.filter(p => p.side === 'right').length

    return (
      <div className="inspector">
        <div className="inspector-header">
          <h3>Node Inspector</h3>
        </div>
        <div className="inspector-body">
          {/* General */}
          <div className="inspector-section">
            <div className="inspector-section-title">General</div>

            <div className="inspector-field">
              <label>Name</label>
              <input
                className="inspector-input"
                value={node.name}
                onChange={e => updateNode(node.id, { name: e.target.value })}
                placeholder="Node name"
              />
            </div>

            <div className="inspector-field">
              <label>Subtitle</label>
              <input
                className="inspector-input"
                value={node.subtitle}
                onChange={e => updateNode(node.id, { subtitle: e.target.value })}
                placeholder="Subtitle / type"
              />
            </div>

            <div className="inspector-row">
              <div className="inspector-field">
                <label>ID</label>
                <input className="inspector-input" value={node.id} readOnly />
              </div>
              <div className="inspector-field">
                <label>Kind</label>
                <select
                  className="inspector-input"
                  value={node.moduleKind}
                  onChange={e => {
                    const nextKind = e.target.value as GraphNode['moduleKind']
                    if (nextKind === 'hierarchical') {
                      ensureHierarchyForNode(node.id)
                    } else {
                      updateNode(node.id, { moduleKind: 'behavioral' })
                    }
                  }}
                >
                  <option value="behavioral">behavioral</option>
                  <option value="hierarchical">hierarchical</option>
                </select>
              </div>
            </div>

            <div className="inspector-row">
              <div className="inspector-field">
                <label>X</label>
                <input
                  className="inspector-input"
                  type="number"
                  value={Math.round(node.x)}
                  onChange={e => updateNode(node.id, { x: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="inspector-field">
                <label>Y</label>
                <input
                  className="inspector-input"
                  type="number"
                  value={Math.round(node.y)}
                  onChange={e => updateNode(node.id, { y: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="inspector-row">
              <div className="inspector-field">
                <label>Width</label>
                <input
                  className="inspector-input"
                  type="number"
                  value={node.width}
                  onChange={e => updateNode(node.id, { width: Math.max(120, parseFloat(e.target.value) || 180) })}
                />
              </div>
            </div>
          </div>

          {/* Style */}
          <div className="inspector-section">
            <div className="inspector-section-title">Style</div>
            <div className="inspector-field">
              <label>Color</label>
              <div className="color-swatches">
                {NODE_COLORS.map(color => (
                  <div
                    key={color}
                    className={`color-swatch ${node.styleColor === color ? 'active' : ''}`}
                    style={{ background: color }}
                    onClick={() => updateNode(node.id, { styleColor: color })}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="btn-group" style={{ marginTop: 8 }}>
              <button
                className="inspector-btn secondary"
                onClick={() => lockNode(node.id, !node.locked)}
              >
                {node.locked ? '🔓 Unlock' : '🔒 Lock'}
              </button>
              <button
                className="inspector-btn secondary"
                onClick={() => collapseNode(node.id, !node.collapsed)}
              >
                {node.collapsed ? '▼ Expand' : '▲ Collapse'}
              </button>
            </div>
          </div>

          {/* Ports summary */}
          <div className="inspector-section">
            <div className="inspector-section-title">Ports</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span className="inspector-badge">
                <span className="count">{leftCount}</span> inputs
              </span>
              <span className="inspector-badge">
                <span className="count">{rightCount}</span> outputs
              </span>
              <span className="inspector-badge">
                <span className="count">{node.ports.filter(p => p.side === 'top' || p.side === 'bottom').length}</span> other
              </span>
            </div>
            <button
              className="inspector-btn primary"
              style={{ width: '100%' }}
              onClick={() => openConfigDialog(node.id)}
            >
              Open Port Editor
            </button>
          </div>

          {/* Parameters */}
          <div className="inspector-section">
            <div className="inspector-section-title">Parameters</div>
            <div className="params-list">
              {node.parameters.map(param => (
                <div key={param.id} className="param-row">
                  <input
                    className="inspector-input key-input"
                    value={param.key}
                    onChange={e => updateParameter(node.id, param.id, { key: e.target.value })}
                    placeholder="key"
                  />
                  <input
                    className="inspector-input"
                    value={param.value}
                    onChange={e => updateParameter(node.id, param.id, { value: e.target.value })}
                    placeholder="value"
                  />
                  <button
                    className="param-delete-btn"
                    onClick={() => deleteParameter(node.id, param.id)}
                    title="Remove parameter"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              className="inspector-btn secondary"
              style={{ marginTop: 8 }}
              onClick={() => addParameter(node.id, { key: 'key', value: '' })}
            >
              + Add Parameter
            </button>
          </div>

          {/* Actions */}
          <div className="inspector-section">
            <div className="inspector-section-title">Actions</div>
            <div className="btn-group">
              {node.moduleKind === 'hierarchical' && (
                <button
                  className="inspector-btn secondary"
                  onClick={() => enterHierarchyByNode(node.id)}
                >
                  Enter
                </button>
              )}
              <button
                className="inspector-btn primary"
                onClick={() => openConfigDialog(node.id)}
              >
                Config...
              </button>
              <button
                className="inspector-btn secondary"
                onClick={() => duplicateNode(node.id)}
              >
                Duplicate
              </button>
              <button
                className="inspector-btn danger"
                onClick={() => deleteNode(node.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Connection inspector
  if (selectedConnection) {
    const conn = selectedConnection
    const fromNode = nodes.find(n => n.id === conn.fromNodeId)
    const toNode = nodes.find(n => n.id === conn.toNodeId)
    const fromPort = fromNode?.ports.find(p => p.id === conn.fromPortId)
    const toPort = toNode?.ports.find(p => p.id === conn.toPortId)

    return (
      <div className="inspector">
        <div className="inspector-header">
          <h3>Connection</h3>
        </div>
        <div className="inspector-body">
          <div className="inspector-section">
            <div className="inspector-section-title">Details</div>

            <div className="connection-info-row">
              <div className="connection-info-label">From</div>
              <div className="connection-info-value">
                <span className="node-name">{fromNode?.name || '?'}</span>
                {fromPort && ` . ${fromPort.name}`}
              </div>
            </div>

            <div className="connection-info-row">
              <div className="connection-info-label">To</div>
              <div className="connection-info-value">
                <span className="node-name">{toNode?.name || '?'}</span>
                {toPort && ` . ${toPort.name}`}
              </div>
            </div>
          </div>

          <div className="inspector-section">
            <div className="inspector-section-title">Label</div>
            <div className="inspector-field">
              <input
                className="inspector-input"
                value={conn.label}
                onChange={e => updateConnectionLabel(conn.id, e.target.value)}
                placeholder="Connection label"
              />
            </div>
          </div>

          <div className="inspector-section">
            <div className="inspector-section-title">Actions</div>
            <button
              className="inspector-btn danger"
              style={{ width: '100%' }}
              onClick={() => deleteConnection(conn.id)}
            >
              Delete Connection
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Nothing selected — project overview
  return (
    <div className="inspector">
      <div className="inspector-header">
        <h3>{navigationStack.length === 0 ? 'Project' : 'Netlist'}</h3>
      </div>
      <div className="inspector-body">
        <div className="inspector-section">
          <div className="inspector-section-title">Project Info</div>
          <div className="inspector-field">
            <label>Name</label>
            <input
              className="inspector-input"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="Project name"
            />
          </div>

          <div className="inspector-stat">
            <span className="stat-label">Nodes</span>
            <span className="stat-value">{nodes.length}</span>
          </div>
          <div className="inspector-stat">
            <span className="stat-label">Connections</span>
            <span className="stat-value">{connections.length}</span>
          </div>
          <div className="inspector-stat">
            <span className="stat-label">Total Ports</span>
            <span className="stat-value">
              {nodes.reduce((acc, n) => acc + n.ports.length, 0)}
            </span>
          </div>
          <div className="inspector-stat">
            <span className="stat-label">Current Netlist</span>
            <span className="stat-value">{db.netlists[currentNetlistId]?.name || 'Top Netlist'}</span>
          </div>
          <div className="inspector-stat">
            <span className="stat-label">Library Netlists</span>
            <span className="stat-value">{db.libraryNetlistIds.length}</span>
          </div>
        </div>

        <div className="inspector-section">
          <div className="inspector-section-title">Quick Actions</div>
          <div className="btn-group" style={{ flexDirection: 'column' }}>
            <button
              className="inspector-btn secondary"
              style={{ width: '100%' }}
              onClick={handleFitToScreen}
            >
              Fit to Screen
            </button>
            <button
              className="inspector-btn secondary"
              style={{ width: '100%' }}
              onClick={exitHierarchy}
              disabled={navigationStack.length === 0}
            >
              Go Up
            </button>
          </div>
        </div>

        <div className="empty-inspector" style={{ marginTop: 16 }}>
          <div className="empty-inspector-icon">↖</div>
          <p>Select a node or connection to inspect it</p>
        </div>
      </div>
    </div>
  )
}

export default Inspector
