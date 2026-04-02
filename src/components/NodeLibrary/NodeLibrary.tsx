import React, { useState, useMemo } from 'react'
import './NodeLibrary.css'
import { useGraphStore } from '../../store/graphStore'
import { NodeTemplate } from '../../types'

const MODULE_TEMPLATE: NodeTemplate = {
  name: 'Module',
  subtitle: 'Configurable node',
  color: '#5B8DD9',
  defaultPorts: [],
  defaultParameters: [
    { key: 'module_type', value: 'generic', paramType: 'text' }
  ]
}

const NodeLibrary: React.FC = () => {
  const [searchText, setSearchText] = useState('')
  const addNode = useGraphStore(s => s.addNode)
  const db = useGraphStore(s => s.db)
  const currentNetlistId = useGraphStore(s => s.currentNetlistId)
  const openNetlistById = useGraphStore(s => s.openNetlistById)
  const canvasOffset = useGraphStore(s => s.canvasOffset)
  const canvasScale = useGraphStore(s => s.canvasScale)

  const filteredTemplates = useMemo(() => {
    const templates = [MODULE_TEMPLATE]
    if (!searchText.trim()) return templates
    const lower = searchText.toLowerCase()
    return templates.filter(t =>
      t.name.toLowerCase().includes(lower) ||
      t.subtitle.toLowerCase().includes(lower)
    )
  }, [searchText])

  const netlistEntries = useMemo(() => {
    const ids = [db.rootNetlistId, ...db.libraryNetlistIds].filter((id, index, arr) => arr.indexOf(id) === index)
    return ids
      .map(id => db.netlists[id])
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  }, [db])

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
        <h3>Modules</h3>
        <input
          className="node-library-search"
          type="text"
          placeholder="Find module..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>
      <div className="node-library-body">
        <div className="node-library-section-label">Available</div>
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
              <span className="template-subtitle">{template.subtitle}</span>
            </div>
          </button>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="node-library-hint">No templates match "{searchText}"</div>
        )}

        <div className="node-library-section-label">Netlists</div>
        <select
          className="node-library-select"
          value={currentNetlistId}
          onChange={e => openNetlistById(e.target.value)}
        >
          {netlistEntries.map(netlist => (
            <option key={netlist.id} value={netlist.id}>
              {netlist.name}
            </option>
          ))}
        </select>

        <div className="netlist-list">
          {netlistEntries.map(netlist => (
            <button
              key={netlist.id}
              className={`netlist-link-btn ${currentNetlistId === netlist.id ? 'active' : ''}`}
              onClick={() => openNetlistById(netlist.id)}
              title={`Open ${netlist.name}`}
            >
              <span className="netlist-link-name">{netlist.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="node-library-hint">
        One module class only. Configure ports, code, IDs, and hierarchical behavior after adding it.
        Library netlists: {db.libraryNetlistIds.length}
      </div>
    </div>
  )
}

export default NodeLibrary
