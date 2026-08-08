import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import Database from 'better-sqlite3'
import AdmZip from 'adm-zip'
import {
  BACKUP_FORMAT_VERSION,
  createBackupArchive,
  getBackupPaths,
  inspectBackupArchive,
  restoreBackupArchive,
  validateBackupArchive
} from '../src/main/backup'

function createTestDatabase(path: string): Database.Database {
  const db = new Database(path)
  db.exec(`
    CREATE TABLE properties (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE clients (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE property_files (id INTEGER PRIMARY KEY, propertyId INTEGER, path TEXT);
  `)
  return db
}

test('creates and restores a portable database and associated file', async () => {
  const root = mkdtempSync(join(tmpdir(), 'almohands-backup-test-'))
  const paths = getBackupPaths(join(root, 'userData'))
  mkdirSync(paths.files, { recursive: true })
  mkdirSync(paths.branding, { recursive: true })
  let db = createTestDatabase(paths.database)
  const storedFile = join(paths.files, '1_100_test-image.jpg')
  writeFileSync(storedFile, 'controlled-image')
  writeFileSync(join(paths.branding, 'logo.png'), 'controlled-logo')
  db.prepare('INSERT INTO properties VALUES (?, ?)').run(1, 'عقار اختبار')
  db.prepare('INSERT INTO clients VALUES (?, ?)').run(1, 'عميل اختبار')
  db.prepare('INSERT INTO settings VALUES (?, ?)').run('officeName', 'مكتب اختبار')
  db.prepare('INSERT INTO property_files VALUES (?, ?, ?)').run(1, 1, storedFile)

  const archive = join(root, 'portable.zip')
  await createBackupArchive(archive, paths, db, '1.0.0-test')
  assert.equal(inspectBackupArchive(archive).backupFormatVersion, BACKUP_FORMAT_VERSION)

  db.prepare('DELETE FROM properties').run()
  writeFileSync(storedFile, 'changed-image')
  const close = (): void => { db.close() }
  await restoreBackupArchive(archive, paths, db, close, '1.0.0-test')

  db = new Database(paths.database)
  assert.equal((db.prepare('SELECT name FROM properties').get() as { name: string }).name, 'عقار اختبار')
  const restoredPath = (db.prepare('SELECT path FROM property_files').get() as { path: string }).path
  assert.equal(restoredPath, join(paths.files, '1_100_test-image.jpg'))
  assert.equal(readFileSync(restoredPath, 'utf8'), 'controlled-image')
  assert.equal(readFileSync(join(paths.branding, 'logo.png'), 'utf8'), 'controlled-logo')
  db.close()
  rmSync(root, { recursive: true, force: true })
})

test('rejects invalid and incomplete archives without touching current data', async () => {
  const root = mkdtempSync(join(tmpdir(), 'almohands-invalid-test-'))
  const invalid = join(root, 'invalid.zip')
  writeFileSync(invalid, 'not a zip')
  assert.throws(() => inspectBackupArchive(invalid))

  const missingManifest = new AdmZip()
  missingManifest.addFile('database/al-mohands.db', Buffer.from('x'))
  const missingManifestPath = join(root, 'missing-manifest.zip')
  missingManifest.writeZip(missingManifestPath)
  assert.throws(() => inspectBackupArchive(missingManifestPath), /MISSING_MANIFEST/)

  const missingDatabase = new AdmZip()
  missingDatabase.addFile('manifest.json', Buffer.from(JSON.stringify({
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    appVersion: 'test',
    createdAt: new Date().toISOString(),
    databaseFile: 'database/al-mohands.db',
    filesIncluded: 0,
    directories: []
  })))
  const missingDatabasePath = join(root, 'missing-database.zip')
  missingDatabase.writeZip(missingDatabasePath)
  assert.throws(() => inspectBackupArchive(missingDatabasePath), /MISSING_DATABASE/)

  const corruptDatabase = new AdmZip()
  corruptDatabase.addFile('database/al-mohands.db', Buffer.from('not sqlite'))
  corruptDatabase.addFile('manifest.json', Buffer.from(JSON.stringify({
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    appVersion: 'test',
    createdAt: new Date().toISOString(),
    databaseFile: 'database/al-mohands.db',
    filesIncluded: 0,
    directories: []
  })))
  const corruptDatabasePath = join(root, 'corrupt-database.zip')
  corruptDatabase.writeZip(corruptDatabasePath)
  assert.throws(() => validateBackupArchive(corruptDatabasePath))

  const currentPaths = getBackupPaths(join(root, 'current-userData'))
  mkdirSync(currentPaths.userData, { recursive: true })
  const current = createTestDatabase(currentPaths.database)
  current.prepare('INSERT INTO properties VALUES (?, ?)').run(1, 'بيانات المكتب الحالية')
  await assert.rejects(restoreBackupArchive(corruptDatabasePath, currentPaths, current, () => current.close(), 'test'))
  assert.equal((current.prepare('SELECT name FROM properties').get() as { name: string }).name, 'بيانات المكتب الحالية')
  current.close()
  assert.equal(existsSync(join(root, 'current-office-data')), false)
  rmSync(root, { recursive: true, force: true })
})
