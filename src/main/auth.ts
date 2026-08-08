import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import type Database from 'better-sqlite3'

const KEY_LENGTH = 64

interface AuthRecord {
  username: string
  passwordHash: string
  salt: string
}

export function ensureAuthSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      salt TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

export function getLocalUsername(db: Database.Database): string | null {
  ensureAuthSchema(db)
  const record = db.prepare('SELECT username FROM local_auth WHERE id = 1').get() as { username: string } | undefined
  return record?.username ?? null
}

function derivePassword(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH)
}

export function createLocalAccount(db: Database.Database, username: string, password: string): void {
  ensureAuthSchema(db)
  if (getLocalUsername(db)) throw new Error('ACCOUNT_EXISTS')
  const cleaned = username.trim()
  if (!cleaned) throw new Error('USERNAME_REQUIRED')
  if (password.length < 6) throw new Error('PASSWORD_TOO_SHORT')
  const salt = randomBytes(16)
  const hash = derivePassword(password, salt)
  db.prepare('INSERT INTO local_auth (id, username, passwordHash, salt) VALUES (1, ?, ?, ?)').run(
    cleaned,
    hash.toString('base64'),
    salt.toString('base64')
  )
}

export function verifyLocalCredentials(db: Database.Database, username: string, password: string): boolean {
  ensureAuthSchema(db)
  const record = db.prepare('SELECT username, passwordHash, salt FROM local_auth WHERE id = 1').get() as AuthRecord | undefined
  if (!record || record.username !== username.trim()) return false
  const stored = Buffer.from(record.passwordHash, 'base64')
  const candidate = derivePassword(password, Buffer.from(record.salt, 'base64'))
  return stored.length === candidate.length && timingSafeEqual(stored, candidate)
}

export function changeLocalPassword(db: Database.Database, currentPassword: string, newPassword: string): void {
  const username = getLocalUsername(db)
  if (!username || !verifyLocalCredentials(db, username, currentPassword)) throw new Error('INVALID_CREDENTIALS')
  if (newPassword.length < 6) throw new Error('PASSWORD_TOO_SHORT')
  const salt = randomBytes(16)
  const hash = derivePassword(newPassword, salt)
  db.prepare("UPDATE local_auth SET passwordHash = ?, salt = ?, updatedAt = datetime('now') WHERE id = 1").run(
    hash.toString('base64'),
    salt.toString('base64')
  )
}

export class LocalAuthSession {
  private authenticated = false

  constructor(private readonly database: () => Database.Database) {}

  status(): { hasAccount: boolean; authenticated: boolean; username: string | null } {
    const username = getLocalUsername(this.database())
    return { hasAccount: username != null, authenticated: this.authenticated, username }
  }

  setup(username: string, password: string): { username: string } {
    createLocalAccount(this.database(), username, password)
    this.authenticated = true
    return { username: getLocalUsername(this.database()) as string }
  }

  login(username: string, password: string): { success: boolean; username?: string } {
    if (!verifyLocalCredentials(this.database(), username, password)) return { success: false }
    this.authenticated = true
    return { success: true, username: getLocalUsername(this.database()) as string }
  }

  lock(): void { this.authenticated = false }
  logout(): void { this.authenticated = false }

  changePassword(currentPassword: string, newPassword: string): void {
    if (!this.authenticated) throw new Error('AUTH_REQUIRED')
    changeLocalPassword(this.database(), currentPassword, newPassword)
  }
}
