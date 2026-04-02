import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a1d23',
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    show: false
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  setupMenu()
}

function sendMenuAction(action: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('menu-action', action)
  }
}

function setupMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendMenuAction('new-project')
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendMenuAction('open-project')
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendMenuAction('save-project')
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendMenuAction('save-project-as')
        },
        { type: 'separator' },
        {
          label: 'Export JSON',
          accelerator: 'CmdOrCtrl+E',
          click: () => sendMenuAction('export-json')
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => sendMenuAction('undo')
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => sendMenuAction('redo')
        },
        { type: 'separator' },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          click: () => sendMenuAction('select-all')
        },
        {
          label: 'Delete Selected',
          accelerator: 'Delete',
          click: () => sendMenuAction('delete-selected')
        },
        { type: 'separator' },
        {
          label: 'Duplicate Selected',
          accelerator: 'CmdOrCtrl+D',
          click: () => sendMenuAction('duplicate-selected')
        },
        {
          label: 'Group as Submodule',
          accelerator: 'CmdOrCtrl+G',
          click: () => sendMenuAction('group-selected')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => sendMenuAction('zoom-in')
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+Minus',
          click: () => sendMenuAction('zoom-out')
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => sendMenuAction('zoom-reset')
        },
        {
          label: 'Fit to Screen',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => sendMenuAction('fit-to-screen')
        },
        { type: 'separator' },
        {
          label: 'Toggle DevTools',
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Go Up',
          accelerator: 'Space',
          click: () => sendMenuAction('go-up-hierarchy')
        },
        {
          label: 'Customize Tools Menu',
          enabled: false
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// IPC Handlers
ipcMain.handle('save-file', async (_event, filePath: string, data: string) => {
  try {
    writeFileSync(filePath, data, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('load-file', async (_event, filePath: string) => {
  try {
    const data = readFileSync(filePath, 'utf-8')
    return { success: true, data }
  } catch (err) {
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('show-save-dialog', async () => {
  if (!mainWindow) return { canceled: true }
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Project',
    defaultPath: 'project.gcg',
    filters: [
      { name: 'Graph Creator Project', extensions: ['gcg', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result
})

ipcMain.handle('show-open-dialog', async () => {
  if (!mainWindow) return { canceled: true }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Project',
    filters: [
      { name: 'Graph Creator Project', extensions: ['gcg', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  return result
})

ipcMain.handle('show-export-dialog', async () => {
  if (!mainWindow) return { canceled: true }
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export JSON',
    defaultPath: 'netlist.json',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
