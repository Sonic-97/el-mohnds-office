import { app } from 'electron'
import { randomUUID } from 'crypto'
import { basename, dirname, isAbsolute, join, normalize, relative, sep } from 'path'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import AdmZip from 'adm-zip'
import Database from 'better-sqlite3'

export const BACKUP_FORMAT_VERSION = 1
export const DATABASE_FILE = 'database/al-mohands.db'

export interface BackupManifest {
  backupFormatVersion: number
  appVersion: string
  createdAt: string
  databaseFile: string
  filesIncluded: number
  directories: string[]
}

export interface BackupResult {
  filePath: string
  filename: string
  createdAt: string
  filesIncluded: number
}

export interface BackupPaths {
  userData: string
  database: string
  files: string
  branding: string
}

export function getBackupPaths(userData = app.getPath('userData')): BackupPaths {
  return {
    userData,
    database: join(userData, 'al-mohands.db'),
    files: join(userData, 'files'),
    branding: join(userData, 'branding')
  }
}

function fileCount(dir: string): number {
  if (!existsSync(dir)) return 0
  return readdirSync(dir, { withFileTypes: true }).reduce(
    (count, entry) => count + (entry.isDirectory() ? fileCount(join(dir, entry.name)) : 1),
    0
  )
}

function assertSafeEntry(name: string): void {
  const slash = name.replace(/\\/g, '/')
  const segments = slash.split('/')
  if (!slash || slash.startsWith('/') || isAbsolute(name) || /^[A-Za-z]:/.test(slash) || segments.includes('..') || name.includes('\0')) {
    throw new Error('UNSAFE_ARCHIVE_PATH')
  }
}

function validateDatabase(path: string): void {
  let database: Database.Database | null = null
  try {
    database = new Database(path, { readonly: true, fileMustExist: true })
    const result = database.pragma('quick_check') as { quick_check: string }[]
    if (result.length !== 1 || result[0].quick_check !== 'ok') throw new Error('INVALID_DATABASE')
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    const names = new Set(tables.map((table) => table.name))
    if (!names.has('properties') || !names.has('clients') || !names.has('settings') || !names.has('property_files')) {
      throw new Error('INVALID_DATABASE_SCHEMA')
    }
  } finally {
    database?.close()
  }
}

export async function createBackupArchive(
  destination: string,
  paths: BackupPaths,
  database: Database.Database,
  appVersion: string
): Promise<BackupResult> {
  const work = mkdtempSync(join(tmpdir(), 'almohands-backup-'))
  const snapshot = join(work, 'al-mohands.db')
  const createdAt = new Date().toISOString()
  try {
    mkdirSync(dirname(destination), { recursive: true })
    await database.backup(snapshot)
    validateDatabase(snapshot)

    const zip = new AdmZip()
    zip.addLocalFile(snapshot, 'database', 'al-mohands.db')
    const directories: string[] = []
    if (existsSync(paths.files)) {
      zip.addLocalFolder(paths.files, 'files')
      directories.push('files')
    }
    if (existsSync(paths.branding)) {
      zip.addLocalFolder(paths.branding, 'branding')
      directories.push('branding')
    }
    const manifest: BackupManifest = {
      backupFormatVersion: BACKUP_FORMAT_VERSION,
      appVersion,
      createdAt,
      databaseFile: DATABASE_FILE,
      filesIncluded: fileCount(paths.files) + fileCount(paths.branding),
      directories
    }
    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'))
    zip.writeZip(destination)
    inspectBackupArchive(destination)
    return { filePath: destination, filename: basename(destination), createdAt, filesIncluded: manifest.filesIncluded }
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

export function inspectBackupArchive(filePath: string): BackupManifest {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) throw new Error('INVALID_BACKUP')
  let zip: AdmZip
  try {
    zip = new AdmZip(filePath)
  } catch {
    throw new Error('INVALID_BACKUP')
  }
  for (const entry of zip.getEntries()) assertSafeEntry(entry.entryName)
  const manifestEntry = zip.getEntry('manifest.json')
  if (!manifestEntry) throw new Error('MISSING_MANIFEST')
  let manifest: BackupManifest
  try {
    manifest = JSON.parse(manifestEntry.getData().toString('utf8')) as BackupManifest
  } catch {
    throw new Error('INVALID_MANIFEST')
  }
  if (manifest.backupFormatVersion !== BACKUP_FORMAT_VERSION) throw new Error('UNSUPPORTED_BACKUP_VERSION')
  if (manifest.databaseFile !== DATABASE_FILE || !zip.getEntry(DATABASE_FILE)) throw new Error('MISSING_DATABASE')
  return manifest
}

function extractValidatedBackup(filePath: string, destination: string): BackupManifest {
  const manifest = inspectBackupArchive(filePath)
  const zip = new AdmZip(filePath)
  const allowed = (name: string): boolean =>
    name === 'manifest.json' || name === DATABASE_FILE || name.startsWith('files/') || name.startsWith('branding/')
  for (const entry of zip.getEntries()) {
    assertSafeEntry(entry.entryName)
    if (!allowed(entry.entryName)) throw new Error('UNEXPECTED_ARCHIVE_ENTRY')
    if (entry.isDirectory) continue
    const target = join(destination, ...entry.entryName.split('/'))
    const safeRelative = relative(destination, target)
    if (safeRelative.startsWith(`..${sep}`) || safeRelative === '..' || isAbsolute(safeRelative)) throw new Error('UNSAFE_ARCHIVE_PATH')
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, entry.getData())
  }
  validateDatabase(join(destination, ...DATABASE_FILE.split('/')))
  for (const directory of manifest.directories) {
    if (!['files', 'branding'].includes(directory)) throw new Error('INVALID_MANIFEST')
  }
  return manifest
}

export function validateBackupArchive(filePath: string): BackupManifest {
  const work = mkdtempSync(join(tmpdir(), 'almohands-validate-'))
  try {
    return extractValidatedBackup(filePath, work)
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}

function moveIfExists(from: string, to: string): boolean {
  if (!existsSync(from)) return false
  renameSync(from, to)
  return true
}

export async function restoreBackupArchive(
  source: string,
  paths: BackupPaths,
  currentDatabase: Database.Database,
  closeDatabase: () => void,
  appVersion: string
): Promise<{ safetyBackup: string; manifest: BackupManifest }> {
  const work = mkdtempSync(join(paths.userData, '.restore-'))
  const extracted = join(work, 'extracted')
  const stagedDb = join(work, 'al-mohands.db')
  const stagedFiles = join(work, 'files')
  const stagedBranding = join(work, 'branding')
  const rollback = join(paths.userData, `.pre-restore-${randomUUID()}`)
  mkdirSync(extracted, { recursive: true })
  mkdirSync(rollback, { recursive: true })

  const manifest = extractValidatedBackup(source, extracted)
  copyFileSync(join(extracted, ...DATABASE_FILE.split('/')), stagedDb)
  if (existsSync(join(extracted, 'files'))) cpSync(join(extracted, 'files'), stagedFiles, { recursive: true })
  if (existsSync(join(extracted, 'branding'))) cpSync(join(extracted, 'branding'), stagedBranding, { recursive: true })

  const staged = new Database(stagedDb)
  try {
    const rows = staged.prepare('SELECT id, path FROM property_files').all() as { id: number; path: string }[]
    const update = staged.prepare('UPDATE property_files SET path = ? WHERE id = ?')
    staged.transaction(() => {
      for (const row of rows) {
        const restored = join(paths.files, basename(normalize(row.path)))
        if (!existsSync(join(stagedFiles, basename(normalize(row.path))))) throw new Error('MISSING_ASSOCIATED_FILE')
        update.run(restored, row.id)
      }
    })()
  } finally {
    staged.close()
  }
  validateDatabase(stagedDb)

  const safetyDir = join(paths.userData, 'backups')
  mkdirSync(safetyDir, { recursive: true })
  const safetyBackup = join(safetyDir, `Pre-Restore-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`)
  await createBackupArchive(safetyBackup, paths, currentDatabase, appVersion)

  closeDatabase()
  const moved = { database: false, files: false, branding: false }
  try {
    moved.database = moveIfExists(paths.database, join(rollback, 'al-mohands.db'))
    for (const suffix of ['-wal', '-shm']) moveIfExists(`${paths.database}${suffix}`, join(rollback, `al-mohands.db${suffix}`))
    moved.files = moveIfExists(paths.files, join(rollback, 'files'))
    moved.branding = moveIfExists(paths.branding, join(rollback, 'branding'))
    renameSync(stagedDb, paths.database)
    if (existsSync(stagedFiles)) renameSync(stagedFiles, paths.files)
    if (existsSync(stagedBranding)) renameSync(stagedBranding, paths.branding)
    validateDatabase(paths.database)
    rmSync(rollback, { recursive: true, force: true })
    rmSync(work, { recursive: true, force: true })
    return { safetyBackup, manifest }
  } catch (error) {
    rmSync(paths.database, { force: true })
    rmSync(paths.files, { recursive: true, force: true })
    rmSync(paths.branding, { recursive: true, force: true })
    if (moved.database) renameSync(join(rollback, 'al-mohands.db'), paths.database)
    for (const suffix of ['-wal', '-shm']) {
      const old = join(rollback, `al-mohands.db${suffix}`)
      if (existsSync(old)) renameSync(old, `${paths.database}${suffix}`)
    }
    if (moved.files) renameSync(join(rollback, 'files'), paths.files)
    if (moved.branding) renameSync(join(rollback, 'branding'), paths.branding)
    throw error
  } finally {
    rmSync(work, { recursive: true, force: true })
    rmSync(rollback, { recursive: true, force: true })
  }
}

export function backupStatePath(paths: BackupPaths): string {
  return join(paths.userData, 'backup-state.json')
}

export function readBackupState(paths: BackupPaths): BackupResult | null {
  try {
    return JSON.parse(readFileSync(backupStatePath(paths), 'utf8')) as BackupResult
  } catch {
    return null
  }
}

export function writeBackupState(paths: BackupPaths, result: BackupResult): void {
  writeFileSync(backupStatePath(paths), JSON.stringify(result, null, 2), 'utf8')
}
