import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (filePath: string, data: string) =>
    ipcRenderer.invoke('save-file', filePath, data),

  loadFile: (filePath: string) =>
    ipcRenderer.invoke('load-file', filePath),

  showSaveDialog: () =>
    ipcRenderer.invoke('show-save-dialog'),

  showOpenDialog: () =>
    ipcRenderer.invoke('show-open-dialog'),

  showExportDialog: () =>
    ipcRenderer.invoke('show-export-dialog'),

  onMenuAction: (callback: (event: Electron.IpcRendererEvent, action: string) => void) => {
    ipcRenderer.on('menu-action', callback)
    return () => ipcRenderer.removeListener('menu-action', callback)
  }
})
