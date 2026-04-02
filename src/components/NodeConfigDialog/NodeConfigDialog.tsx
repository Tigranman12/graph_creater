import React, { useState, useEffect, useCallback } from 'react'
import './NodeConfigDialog.css'
import { useGraphStore } from '../../store/graphStore'
import { GraphNode, NodeCode, NodeParameter, Port, PortDirection, PortSide, ParamType, CodeLanguage } from '../../types'
import { v4 as uuidv4 } from 'uuid'

type TabId = 'general' | 'ports' | 'parameters' | 'code' | 'style'

const NODE_COLORS = [
  '#4A90D9', '#5BA85C', '#D97B5B', '#9B5BD9',
  '#5BD9C8', '#B8A04A', '#D9535B', '#7B9BD9',
  '#5B8DD9', '#D9A84A', '#8DD95B', '#D95BB8'
]

const LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: 'cpp',      label: 'C++' },
  { value: 'systemc',  label: 'SystemC' },
  { value: 'python',   label: 'Python' },
  { value: 'tcl',      label: 'TCL' },
  { value: 'plain',    label: 'Plain text' }
]

const PARAM_TYPES: { value: ParamType; label: string; hint: string }[] = [
  { value: 'text',          label: 'Text',           hint: 'Free-form string value' },
  { value: 'number',        label: 'Number',         hint: 'Numeric value' },
  { value: 'flag',          label: 'Flag',           hint: 'true / false toggle' },
  { value: 'port_generator', label: 'Port Generator', hint: 'Auto-creates ports. Value: "count:direction:side" e.g. "3:input:left"' }
]

interface LocalPort extends Omit<Port, 'nodeId'> {
  isNew?: boolean
}

interface LocalParam {
  id: string
  key: string
  value: string
  paramType: ParamType
}

const NodeConfigDialog: React.FC = () => {
  const configDialogNodeId = useGraphStore(s => s.configDialogNodeId)
  const nodes = useGraphStore(s => s.nodes)
  const closeConfigDialog = useGraphStore(s => s.closeConfigDialog)
  const updateNode = useGraphStore(s => s.updateNode)
  const ensureHierarchyForNode = useGraphStore(s => s.ensureHierarchyForNode)
  const addPort = useGraphStore(s => s.addPort)
  const updatePort = useGraphStore(s => s.updatePort)
  const deletePort = useGraphStore(s => s.deletePort)

  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [localNode, setLocalNode] = useState<Partial<GraphNode>>({})
  const [localPorts, setLocalPorts] = useState<LocalPort[]>([])
  const [localParams, setLocalParams] = useState<LocalParam[]>([])
  const [localCode, setLocalCode] = useState<NodeCode>({ language: 'cpp', initCode: '', fireCode: '', finishCode: '' })

  const node = nodes.find(n => n.id === configDialogNodeId)

  useEffect(() => {
    if (node) {
      setLocalNode({
        name: node.name,
        subtitle: node.subtitle,
        moduleType: node.moduleType,
        styleColor: node.styleColor,
        width: node.width,
        height: node.height
      })
      setLocalPorts(node.ports.filter(p => !p.generatedByParamId).map(p => ({ ...p })))
      setLocalParams(node.parameters.map(p => ({ id: p.id, key: p.key, value: p.value, paramType: p.paramType || 'text' })))
      setLocalCode(node.code ? { ...node.code } : { language: 'cpp', initCode: '', fireCode: '', finishCode: '' })
      setActiveTab('general')
    }
  }, [node])

  const handleSave = useCallback(() => {
    if (!node) return

    // Reconcile manual ports
    const existingManualIds = new Set(node.ports.filter(p => !p.generatedByParamId).map(p => p.id))
    const localPortIds = new Set(localPorts.map(p => p.id))

    node.ports.filter(p => !p.generatedByParamId).forEach(p => {
      if (!localPortIds.has(p.id)) deletePort(node.id, p.id)
    })

    localPorts.forEach(lp => {
      if (existingManualIds.has(lp.id)) {
        const orig = node.ports.find(p => p.id === lp.id)
        if (orig && (orig.name !== lp.name || orig.direction !== lp.direction || orig.side !== lp.side || orig.order !== lp.order || orig.maxConnections !== lp.maxConnections)) {
          updatePort(node.id, lp.id, { name: lp.name, direction: lp.direction, side: lp.side, order: lp.order, maxConnections: lp.maxConnections })
        }
      } else {
        addPort(node.id, { id: lp.id, name: lp.name, direction: lp.direction, side: lp.side, order: lp.order, maxConnections: lp.maxConnections })
      }
    })

    const finalParams: NodeParameter[] = localParams.map(p => ({
      id: p.id,
      key: p.key,
      value: p.value,
      paramType: p.paramType
    }))

    updateNode(node.id, {
      name: localNode.name || node.name,
      subtitle: localNode.subtitle ?? node.subtitle,
      moduleType: localNode.moduleType || node.moduleType,
      moduleKind: (localNode.moduleType || node.moduleType) === 'structural' ? 'hierarchical' : 'behavioral',
      styleColor: localNode.styleColor || node.styleColor,
      width: localNode.width || node.width,
      parameters: finalParams,
      code: localCode
    })

    if ((localNode.moduleType || node.moduleType) === 'structural') {
      ensureHierarchyForNode(node.id)
    }

    closeConfigDialog()
  }, [node, localNode, localPorts, localParams, localCode, updateNode, ensureHierarchyForNode, addPort, updatePort, deletePort, closeConfigDialog])

  const handleAddPort = useCallback(() => {
    const leftCount = localPorts.filter(p => p.side === 'left').length
    setLocalPorts(prev => [...prev, {
      id: uuidv4(),
      name: `port${prev.length + 1}`,
      direction: 'input',
      side: 'left',
      order: leftCount,
      maxConnections: 1,
      isNew: true
    }])
  }, [localPorts])

  const handlePortChange = useCallback((portId: string, field: keyof Port, value: unknown) => {
    setLocalPorts(prev => prev.map(p => {
      if (p.id !== portId) return p
      const updated = { ...p, [field]: value }
      if (field === 'direction') updated.maxConnections = value === 'input' ? 1 : -1
      return updated
    }))
  }, [])

  const handleDeletePort = useCallback((portId: string) => {
    setLocalPorts(prev => prev.filter(p => p.id !== portId))
  }, [])

  const handleAddParam = useCallback(() => {
    setLocalParams(prev => [...prev, { id: uuidv4(), key: 'key', value: '', paramType: 'text' }])
  }, [])

  const handleParamChange = useCallback((paramId: string, field: keyof LocalParam, value: string) => {
    setLocalParams(prev => prev.map(p => p.id === paramId ? { ...p, [field]: value } : p))
  }, [])

  const handleDeleteParam = useCallback((paramId: string) => {
    setLocalParams(prev => prev.filter(p => p.id !== paramId))
  }, [])

  if (!node) return null

  const directionOptions: PortDirection[] = ['input', 'output']
  const sideOptions: PortSide[] = ['left', 'right', 'top', 'bottom']
  const generatedPorts = node.ports.filter(p => p.generatedByParamId)

  return (
    <div className="dialog-overlay" onClick={e => { if (e.target === e.currentTarget) closeConfigDialog() }}>
      <div className="dialog">
        <div className="dialog-titlebar">
          <div className="dialog-title">Configure Module: {node.name}</div>
          <button className="dialog-close-btn" onClick={closeConfigDialog}>×</button>
        </div>

        <div className="dialog-tabs">
          {(['general', 'ports', 'parameters', 'code', 'style'] as TabId[]).map(tab => (
            <button
              key={tab}
              className={`dialog-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'code' ? 'Code' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'ports' && (localPorts.length + generatedPorts.length) > 0 && ` (${localPorts.length + generatedPorts.length})`}
              {tab === 'parameters' && localParams.length > 0 && ` (${localParams.length})`}
            </button>
          ))}
        </div>

        <div className="dialog-body">

          {/* ── General ── */}
          {activeTab === 'general' && (
            <div>
              <div className="dialog-field">
                <label>Module Name</label>
                <input className="dialog-input" value={localNode.name || ''} autoFocus
                  onChange={e => setLocalNode(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Module name" />
              </div>
              <div className="dialog-field">
                <label>Subtitle / Type</label>
                <input className="dialog-input" value={localNode.subtitle || ''}
                  onChange={e => setLocalNode(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Optional module label" />
              </div>
              <div className="dialog-field">
                <label>Module ID</label>
                <input className="dialog-input" value={node.id} readOnly />
              </div>
              <div className="dialog-field">
                <label>Module Type</label>
                <select
                  className="dialog-input dialog-select"
                  value={localNode.moduleType || 'behavioral'}
                  onChange={e => setLocalNode(prev => ({ ...prev, moduleType: e.target.value as GraphNode['moduleType'] }))}
                >
                  <option value="behavioral">behavioral</option>
                  <option value="structural">structural</option>
                </select>
              </div>
              <div className="dialog-field">
                <label>Width (px)</label>
                <input className="dialog-input" type="number" min={120} max={600}
                  value={localNode.width || 180}
                  onChange={e => setLocalNode(prev => ({ ...prev, width: parseInt(e.target.value) || 180 }))} />
              </div>
            </div>
          )}

          {/* ── Ports ── */}
          {activeTab === 'ports' && (
            <div>
              {/* Manual ports */}
              {localPorts.length > 0 ? (
                <table className="ports-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Dir</th><th>Side</th><th>Order</th><th>Max</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {localPorts.map(port => (
                      <tr key={port.id}>
                        <td>
                          <input className="dialog-input" value={port.name} style={{ minWidth: 80 }}
                            onChange={e => handlePortChange(port.id, 'name', e.target.value)} />
                        </td>
                        <td>
                          <select className="dialog-input dialog-select" value={port.direction}
                            onChange={e => handlePortChange(port.id, 'direction', e.target.value as PortDirection)}>
                            {directionOptions.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="dialog-input dialog-select" value={port.side}
                            onChange={e => handlePortChange(port.id, 'side', e.target.value as PortSide)}>
                            {sideOptions.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="dialog-input" type="number" value={port.order} min={0} style={{ width: 52 }}
                            onChange={e => handlePortChange(port.id, 'order', parseInt(e.target.value) || 0)} />
                        </td>
                        <td>
                          <input className="dialog-input" type="number" value={port.maxConnections} min={-1} title="-1=unlimited" style={{ width: 52 }}
                            onChange={e => handlePortChange(port.id, 'maxConnections', parseInt(e.target.value))} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="port-delete-btn" onClick={() => handleDeletePort(port.id)} title="Remove">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-hint">No manual ports — add one below or use Port Generator parameters.</p>
              )}

              <button className="add-btn" onClick={handleAddPort}>+ Add Port</button>
              {(localNode.moduleType || node.moduleType) === 'structural' && (
                <p style={{ fontSize: 11, color: '#4a7090', marginTop: 10 }}>
                  This module owns an internal netlist. Use the folder badge or the Up action to navigate in and out.
                </p>
              )}

              {/* Generated ports (read-only display) */}
              {generatedPorts.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="section-label">Auto-generated ports (from Parameters)</div>
                  <table className="ports-table">
                    <thead>
                      <tr><th>Name</th><th>Dir</th><th>Side</th><th style={{ color: '#4a7090' }}>Source param</th></tr>
                    </thead>
                    <tbody>
                      {generatedPorts.map(port => {
                        const param = node.parameters.find(p => p.id === port.generatedByParamId)
                        return (
                          <tr key={port.id} style={{ opacity: 0.6 }}>
                            <td><span style={{ color: '#9baab8', padding: '5px 8px', display: 'block' }}>{port.name}</span></td>
                            <td><span className={`port-direction-badge ${port.direction}`}>{port.direction}</span></td>
                            <td><span style={{ color: '#6b7a8d', padding: '5px 8px', display: 'block' }}>{port.side}</span></td>
                            <td><span style={{ color: '#4a7090', padding: '5px 8px', display: 'block', fontFamily: 'monospace', fontSize: 11 }}>{param?.key}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <p style={{ fontSize: 11, color: '#4a5566', marginTop: 6 }}>
                    To edit generated ports, change the Port Generator parameter value in the Parameters tab.
                    Ctrl+drag any port on canvas to move it to a different edge.
                  </p>
                </div>
              )}

              <p style={{ fontSize: 11, color: '#4a5566', marginTop: 8 }}>
                Max connections: -1 = unlimited. Tip: use Ctrl+drag on canvas to reposition any port.
              </p>
            </div>
          )}

          {/* ── Parameters ── */}
          {activeTab === 'parameters' && (
            <div>
              {localParams.length === 0 && (
                <p className="empty-hint">No parameters — add one below.</p>
              )}

              {localParams.map(param => (
                <div key={param.id} className="param-row">
                  <div className="param-row-top">
                    <input className="dialog-input param-key" value={param.key}
                      onChange={e => handleParamChange(param.id, 'key', e.target.value)}
                      placeholder="key" />
                    <select className="dialog-input dialog-select param-type-select"
                      value={param.paramType}
                      onChange={e => handleParamChange(param.id, 'paramType', e.target.value)}>
                      {PARAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <button className="port-delete-btn" onClick={() => handleDeleteParam(param.id)} title="Remove">×</button>
                  </div>
                  <div className="param-row-value">
                    {param.paramType === 'flag' ? (
                      <select className="dialog-input dialog-select"
                        value={param.value}
                        onChange={e => handleParamChange(param.id, 'value', e.target.value)}>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input className="dialog-input"
                        value={param.value}
                        onChange={e => handleParamChange(param.id, 'value', e.target.value)}
                        placeholder={param.paramType === 'port_generator' ? 'count:direction:side  e.g. 3:input:left' : 'value'}
                        style={{ fontFamily: param.paramType === 'port_generator' ? 'monospace' : undefined }}
                      />
                    )}
                  </div>
                  {param.paramType === 'port_generator' && (
                    <div className="param-hint">
                      Port Generator: value format is <code>count:direction:side</code>
                      &nbsp;(e.g. <code>4:input:left</code> or <code>2:output:right</code>).
                      Ports are created automatically on Save.
                    </div>
                  )}
                </div>
              ))}

              <button className="add-btn" onClick={handleAddParam}>+ Add Parameter</button>
            </div>
          )}

          {/* ── Code ── */}
          {activeTab === 'code' && (
            <div className="code-tab">
              <div className="code-lang-row">
                <label>Language</label>
                <select className="dialog-input dialog-select code-lang-select"
                  value={localCode.language}
                  onChange={e => setLocalCode(prev => ({ ...prev, language: e.target.value as CodeLanguage }))}>
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
                <span className="code-lang-hint">Applied to all code fields in this module</span>
              </div>

              <div className="code-field">
                <div className="code-field-header">
                  <span className="code-field-label">Init Code</span>
                  <span className="code-field-desc">Runs once when module is created / simulation starts</span>
                </div>
                <textarea
                  className="code-editor"
                  value={localCode.initCode}
                  onChange={e => setLocalCode(prev => ({ ...prev, initCode: e.target.value }))}
                  rows={5}
                  placeholder={getPlaceholder('init', localCode.language)}
                  spellCheck={false}
                />
              </div>

              <div className="code-field">
                <div className="code-field-header">
                  <span className="code-field-label">Fire Code</span>
                  <span className="code-field-desc">Runs on each activation / when inputs arrive</span>
                </div>
                <textarea
                  className="code-editor"
                  value={localCode.fireCode}
                  onChange={e => setLocalCode(prev => ({ ...prev, fireCode: e.target.value }))}
                  rows={9}
                  placeholder={getPlaceholder('fire', localCode.language)}
                  spellCheck={false}
                />
              </div>

              <div className="code-field">
                <div className="code-field-header">
                  <span className="code-field-label">Finish Code</span>
                  <span className="code-field-desc">Runs on teardown / simulation end</span>
                </div>
                <textarea
                  className="code-editor"
                  value={localCode.finishCode}
                  onChange={e => setLocalCode(prev => ({ ...prev, finishCode: e.target.value }))}
                  rows={5}
                  placeholder={getPlaceholder('finish', localCode.language)}
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* ── Style ── */}
          {activeTab === 'style' && (
            <div>
              <div className="dialog-field">
                <label>Module Color</label>
                <div className="style-color-grid">
                  {NODE_COLORS.map(color => (
                    <div key={color}
                      className={`style-color-swatch ${localNode.styleColor === color ? 'active' : ''}`}
                      style={{ background: color }}
                      onClick={() => setLocalNode(prev => ({ ...prev, styleColor: color }))}
                      title={color} />
                  ))}
                </div>
              </div>
              <div className="dialog-field" style={{ marginTop: 16 }}>
                <label>Preview</label>
                <div style={{ background: localNode.styleColor, borderRadius: 8, padding: '12px 16px', color: 'white', fontWeight: 600, fontSize: 14, opacity: 0.9 }}>
                  {localNode.name || 'Module Name'}
                  {localNode.subtitle && <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>{localNode.subtitle}</div>}
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="dialog-footer">
          <button className="dialog-btn secondary" onClick={closeConfigDialog}>Cancel</button>
          <button className="dialog-btn primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}

function getPlaceholder(field: 'init' | 'fire' | 'finish', lang: CodeLanguage): string {
  const map: Record<CodeLanguage, Record<string, string>> = {
    cpp: {
      init:   '// e.g.\n// cout << "Module initialized" << endl;',
      fire:   '// e.g.\n// auto val = read_input("in");\n// write_output("out", val * 2);',
      finish: '// e.g.\n// cout << "Module done" << endl;'
    },
    systemc: {
      init:   '// SC_CTOR initialization',
      fire:   '// SC_METHOD / SC_THREAD body',
      finish: '// end_of_simulation callback'
    },
    python: {
      init:   '# e.g.\n# self.state = 0',
      fire:   '# e.g.\n# val = self.read("in")\n# self.write("out", val * 2)',
      finish: '# e.g.\n# print("done")'
    },
    tcl: {
      init:   '# init proc',
      fire:   '# fire proc',
      finish: '# finish proc'
    },
    plain: {
      init:   'Initialization notes…',
      fire:   'Main logic notes…',
      finish: 'Teardown notes…'
    }
  }
  return map[lang]?.[field] || ''
}

export default NodeConfigDialog
