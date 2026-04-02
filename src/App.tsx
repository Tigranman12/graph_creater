import React, { useEffect } from 'react'
import './App.css'
import Toolbar from './components/Toolbar/Toolbar'
import NodeLibrary from './components/NodeLibrary/NodeLibrary'
import Canvas from './components/Canvas/Canvas'
import Inspector from './components/Inspector/Inspector'
import NodeConfigDialog from './components/NodeConfigDialog/NodeConfigDialog'
import { useGraphStore } from './store/graphStore'

const App: React.FC = () => {
  const configDialogNodeId = useGraphStore(s => s.configDialogNodeId)
  const undo = useGraphStore(s => s.undo)
  const redo = useGraphStore(s => s.redo)
  const copySelected = useGraphStore(s => s.copySelected)
  const pasteClipboard = useGraphStore(s => s.pasteClipboard)
  const deleteSelectedNodes = useGraphStore(s => s.deleteSelectedNodes)
  const groupSelectedAsSubmodule = useGraphStore(s => s.groupSelectedAsSubmodule)
  const exitHierarchy = useGraphStore(s => s.exitHierarchy)

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (ctrl && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      } else if (ctrl && e.key === 'y') {
        e.preventDefault()
        redo()
      } else if (ctrl && e.key === 'c') {
        copySelected()
      } else if (ctrl && e.key === 'v') {
        pasteClipboard()
      } else if (ctrl && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        groupSelectedAsSubmodule()
      } else if (e.key === ' ') {
        e.preventDefault()
        exitHierarchy()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedNodes()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, copySelected, pasteClipboard, deleteSelectedNodes, groupSelectedAsSubmodule, exitHierarchy])

  return (
    <div className="app">
      <Toolbar />
      <div className="app-main">
        <NodeLibrary />
        <Canvas />
        <Inspector />
      </div>

      {/* Config dialog — rendered above everything */}
      {configDialogNodeId && <NodeConfigDialog />}
    </div>
  )
}

export default App
