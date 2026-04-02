import React, { useState, useCallback, useEffect } from 'react'
import './Toolbar.css'
import { useGraphStore } from '../../store/graphStore'
import { saveProjectToFile, loadProjectFromFile, exportJsonToFile } from '../../utils/storage'

const Toolbar: React.FC = () => {
  const projectName = useGraphStore(s => s.projectName)
  const setProjectName = useGraphStore(s => s.setProjectName)
  const newProject = useGraphStore(s => s.newProject)
  const loadProject = useGraphStore(s => s.loadProject)
  const exportProject = useGraphStore(s => s.exportProject)
  const undo = useGraphStore(s => s.undo)
  const redo = useGraphStore(s => s.redo)
  const history = useGraphStore(s => s.history)
  const deleteSelectedNodes = useGraphStore(s => s.deleteSelectedNodes)
  const selectedNodeIds = useGraphStore(s => s.selectedNodeIds)
  const selectedConnectionId = useGraphStore(s => s.selectedConnectionId)
  const canvasScale = useGraphStore(s => s.canvasScale)
  const canvasOffset = useGraphStore(s => s.canvasOffset)
  const currentNetlistId = useGraphStore(s => s.currentNetlistId)
  const navigationStack = useGraphStore(s => s.navigationStack)
  const db = useGraphStore(s => s.db)
  const setCanvasTransform = useGraphStore(s => s.setCanvasTransform)
  const fitToScreen = useGraphStore(s => s.fitToScreen)
  const copySelected = useGraphStore(s => s.copySelected)
  const pasteClipboard = useGraphStore(s => s.pasteClipboard)
  const exitHierarchy = useGraphStore(s => s.exitHierarchy)

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(projectName)

  useEffect(() => {
    setNameValue(projectName)
  }, [projectName])

  const handleNameBlur = useCallback(() => {
    setEditingName(false)
    if (nameValue.trim()) {
      setProjectName(nameValue.trim())
    } else {
      setNameValue(projectName)
    }
  }, [nameValue, projectName, setProjectName])

  const handleNewProject = useCallback(() => {
    if (window.confirm('Start a new project? Unsaved changes will be lost.')) {
      newProject()
    }
  }, [newProject])

  const handleOpen = useCallback(async () => {
    const result = await loadProjectFromFile()
    if (result.success && result.data) {
      loadProject(result.data)
    }
  }, [loadProject])

  const handleSave = useCallback(async () => {
    const json = exportProject()
    await saveProjectToFile(json)
  }, [exportProject])

  const handleExport = useCallback(async () => {
    const json = exportProject()
    await exportJsonToFile(json)
  }, [exportProject])

  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(3.0, canvasScale * 1.2)
    setCanvasTransform(canvasOffset, newScale)
  }, [canvasScale, canvasOffset, setCanvasTransform])

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(0.1, canvasScale / 1.2)
    setCanvasTransform(canvasOffset, newScale)
  }, [canvasScale, canvasOffset, setCanvasTransform])

  const handleZoomReset = useCallback(() => {
    setCanvasTransform({ x: 60, y: 60 }, 1)
  }, [setCanvasTransform])

  const handleFitToScreen = useCallback(() => {
    const container = document.querySelector('.canvas-container')
    if (container) {
      const rect = container.getBoundingClientRect()
      fitToScreen(rect.width, rect.height)
    }
  }, [fitToScreen])

  const hasSelection = selectedNodeIds.length > 0 || !!selectedConnectionId
  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0
  const currentNetlist = db.netlists[currentNetlistId]

  // Listen for menu actions from Electron
  useEffect(() => {
    if (!window.electronAPI) return

    const cleanup = window.electronAPI.onMenuAction((_event, action) => {
      switch (action) {
        case 'new-project': handleNewProject(); break
        case 'open-project': handleOpen(); break
        case 'save-project': handleSave(); break
        case 'export-json': handleExport(); break
        case 'undo': undo(); break
        case 'redo': redo(); break
        case 'zoom-in': handleZoomIn(); break
        case 'zoom-out': handleZoomOut(); break
        case 'zoom-reset': handleZoomReset(); break
        case 'fit-to-screen': handleFitToScreen(); break
        case 'delete-selected': deleteSelectedNodes(); break
        case 'duplicate-selected': {
          const store = useGraphStore.getState()
          store.selectedNodeIds.forEach(id => store.duplicateNode(id))
          break
        }
        case 'go-up-hierarchy': exitHierarchy(); break
        case 'select-all': {
          const store = useGraphStore.getState()
          store.setSelectedNodes(store.nodes.map(n => n.id))
          break
        }
      }
    })

    return cleanup
  }, [handleNewProject, handleOpen, handleSave, handleExport, undo, redo,
    handleZoomIn, handleZoomOut, handleZoomReset, handleFitToScreen, deleteSelectedNodes, exitHierarchy])

  return (
    <div className="toolbar">
      {/* File actions */}
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={handleNewProject} title="New Project (Ctrl+N)">
          <span className="toolbar-icon">+</span>
          New
        </button>
        <button className="toolbar-btn" onClick={handleOpen} title="Open Project (Ctrl+O)">
          <span className="toolbar-icon">📂</span>
          Open
        </button>
        <button className="toolbar-btn" onClick={handleSave} title="Save Project (Ctrl+S)">
          <span className="toolbar-icon">💾</span>
          Save
        </button>
        <button className="toolbar-btn" onClick={handleExport} title="Export JSON">
          <span className="toolbar-icon">↗</span>
          Export
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Edit actions */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <span className="toolbar-icon">↩</span>
          Undo
        </button>
        <button
          className="toolbar-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <span className="toolbar-icon">↪</span>
          Redo
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* View actions */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn icon-only"
          onClick={handleZoomOut}
          title="Zoom Out (Ctrl+-)"
        >
          −
        </button>
        <button
          className="toolbar-btn icon-only"
          onClick={handleZoomReset}
          title="Reset Zoom (Ctrl+0)"
          style={{ fontSize: 11, minWidth: 46 }}
        >
          {Math.round(canvasScale * 100)}%
        </button>
        <button
          className="toolbar-btn icon-only"
          onClick={handleZoomIn}
          title="Zoom In (Ctrl++)"
        >
          +
        </button>
        <button
          className="toolbar-btn"
          onClick={handleFitToScreen}
          title="Fit to Screen (Ctrl+Shift+F)"
        >
          <span className="toolbar-icon">⊡</span>
          Fit
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={exitHierarchy}
          disabled={navigationStack.length === 0}
          title="Go up one netlist level (Space)"
        >
          <span className="toolbar-icon">⬆</span>
          Up
        </button>
        <span className="toolbar-path" title={currentNetlist?.name || 'Netlist'}>
          {navigationStack.length === 0 ? 'Top Netlist' : currentNetlist?.name}
        </span>
      </div>

      <div className="toolbar-separator" />

      {/* Selection actions */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={copySelected}
          disabled={selectedNodeIds.length === 0}
          title="Copy (Ctrl+C)"
        >
          Copy
        </button>
        <button
          className="toolbar-btn"
          onClick={pasteClipboard}
          title="Paste (Ctrl+V)"
        >
          Paste
        </button>
        <button
          className="toolbar-btn danger"
          onClick={deleteSelectedNodes}
          disabled={!hasSelection}
          title="Delete Selected (Delete)"
        >
          <span className="toolbar-icon">✕</span>
          Delete
        </button>
      </div>

      {/* Project name in center */}
      <div className="toolbar-center">
        {editingName ? (
          <input
            className="toolbar-project-name-input"
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={e => {
              if (e.key === 'Enter') handleNameBlur()
              if (e.key === 'Escape') { setEditingName(false); setNameValue(projectName) }
            }}
            autoFocus
          />
        ) : (
          <span
            className="toolbar-project-name"
            onClick={() => setEditingName(true)}
            title="Click to rename project"
          >
            {projectName}
          </span>
        )}
      </div>
    </div>
  )
}

export default Toolbar
