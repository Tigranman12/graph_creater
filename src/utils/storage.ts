export async function saveProjectToFile(
  jsonString: string,
  filePath?: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  if (!window.electronAPI) {
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'project.json'
    a.click()
    URL.revokeObjectURL(url)
    return { success: true }
  }

  let targetPath = filePath
  if (!targetPath) {
    const result = await window.electronAPI.showSaveDialog()
    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Canceled' }
    }
    targetPath = result.filePath
  }

  const result = await window.electronAPI.saveFile(targetPath, jsonString)
  return { ...result, filePath: targetPath }
}

export async function loadProjectFromFile(): Promise<{ success: boolean; data?: unknown; error?: string }> {
  if (!window.electronAPI) {
    return { success: false, error: 'File system not available in browser' }
  }

  const dialogResult = await window.electronAPI.showOpenDialog()
  if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
    return { success: false, error: 'Canceled' }
  }

  const filePath = dialogResult.filePaths[0]
  const result = await window.electronAPI.loadFile(filePath)

  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Failed to read file' }
  }

  try {
    const data = JSON.parse(result.data)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: 'Invalid project JSON file' }
  }
}

export async function exportJsonToFile(
  jsonString: string
): Promise<{ success: boolean; error?: string }> {
  if (!window.electronAPI) {
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'netlist.json'
    a.click()
    URL.revokeObjectURL(url)
    return { success: true }
  }

  const dialogResult = await window.electronAPI.showExportDialog()
  if (dialogResult.canceled || !dialogResult.filePath) {
    return { success: false, error: 'Canceled' }
  }

  const result = await window.electronAPI.saveFile(dialogResult.filePath, jsonString)
  return result
}
