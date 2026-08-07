import { app, shell, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { registerIpc } from './ipc'
import { getDb } from './db'

function resolveIcon(): string | undefined {
  const brandingLogo = join(app.getPath('userData'), 'branding', 'logo.png')
  const candidates = [
    brandingLogo,
    ...(app.isPackaged
      ? [join(process.resourcesPath, 'resources', 'icon.png')]
      : [join(app.getAppPath(), 'resources', 'icon.png')])
  ]
  return candidates.find((p) => existsSync(p))
}

function createWindow(): void {
  const iconPath = resolveIcon()
  const icon = iconPath ? nativeImage.createFromPath(iconPath) : undefined

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    icon: icon || undefined,
    title: 'المهندس - Real Estate Office',
    backgroundColor: '#0e1b2e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      webSecurity: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  getDb()
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
