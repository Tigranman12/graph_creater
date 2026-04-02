import React, { useState, useMemo } from 'react'
import './NodeLibrary.css'
import { useGraphStore } from '../../store/graphStore'
import { NodeTemplate } from '../../types'

const NODE_TEMPLATES: NodeTemplate[] = [
  {
    name: 'Module',
    subtitle: 'Behavioral',
    color: '#5B8DD9',
    defaultPorts: [],
    defaultParameters: [
      { key: 'module_type', value: 'generic', paramType: 'text' }
    ]
  },
  {
    name: 'Behavioral Module',
    subtitle: 'Code-driven',
    color: '#D9A84A',
    defaultPorts: [
      { name: 'in0', direction: 'input', side: 'left', order: 0, maxConnections: 1 },
      { name: 'out', direction: 'output', side: 'right', order: 0, maxConnections: -1 }
    ],
    defaultParameters: [
      { key: 'module_type', value: 'behavioral', paramType: 'text' }
    ]
  },
  {
    name: 'Hierarchical Module',
    subtitle: 'Nested netlist',
    color: '#5BA85C',
    moduleKind: 'hierarchical',
    createSubgraph: true,
    defaultPorts: [
      { name: 'in', direction: 'input', side: 'left', order: 0, maxConnections: 1 },
      { name: 'out', direction: 'output', side: 'right', order: 0, maxConnections: -1 }
    ],
    defaultParameters: [
      { key: 'module_type', value: 'hierarchical', paramType: 'text' }
    ]
  }
]

const NodeLibrary: React.FC = () => {
  const [searchText, setSearchText] = useState('')
  const addNode = useGraphStore(s => s.addNode)
  const db = useGraphStore(s => s.db)
  const canvasOffset = useGraphStore(s => s.canvasOffset)
  const canvasScale = useGraphStore(s => s.canvasScale)

  const filteredTemplates = useMemo(() => {
    if (!searchText.trim()) return NODE_TEMPLATES
    const lower = searchText.toLowerCase()
    return NODE_TEMPLATES.filter(t =>
      t.name.toLowerCase().includes(lower) ||
      t.subtitle.toLowerCase().includes(lower)
    )
  }, [searchText])

  const handleAddNode = (template: NodeTemplate) => {
    // Place in visible canvas center
    const container = document.querySelector('.canvas-container')
    let cx = 300, cy = 200
    if (container) {
      const rect = container.getBoundingClientRect()
      cx = (rect.width / 2 - canvasOffset.x) / canvasScale
      cy = (rect.height / 2 - canvasOffset.y) / canvasScale
    }
    // Slightly randomize to avoid stacking
    cx += (Math.random() - 0.5) * 60
    cy += (Math.random() - 0.5) * 60

    addNode(template, cx, cy)
  }

  return (
    <div className="node-library">
      <div className="node-library-header">
        <h3>Node Library</h3>
        <input
          className="node-library-search"
          type="text"
          placeholder="Search..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>
      <div className="node-library-body">
        <div className="node-library-section-label">Templates</div>
        {filteredTemplates.map(template => (
          <button
            key={template.name}
            className="node-template-btn"
            onClick={() => handleAddNode(template)}
            title={`Add ${template.name} to canvas`}
          >
            <div
              className="template-color-dot"
              style={{ background: template.color }}
            />
            <div className="template-info">
              <span className="template-name">{template.name}</span>
              {template.subtitle && (
                <span className="template-subtitle">{template.subtitle}</span>
              )}
            </div>
            {template.defaultPorts.length > 0 && (
              <span className="template-port-count">
                {template.defaultPorts.length}
              </span>
            )}
          </button>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="node-library-hint">No templates match "{searchText}"</div>
        )}
      </div>
      <div className="node-library-hint">
        Module-only library. Nested netlists in library: {db.libraryNetlistIds.length}
      </div>
    </div>
  )
}

export default NodeLibrary
