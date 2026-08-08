import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import Database from 'better-sqlite3'
import { LocalAuthSession, ensureAuthSchema } from '../src/main/auth'
import { InactivityLockTimer } from '../src/renderer/src/lib/inactivity'

test('first-run setup hashes password and preserves existing office records', () => {
  const root = mkdtempSync(join(tmpdir(), 'almohands-auth-test-'))
  const path = join(root, 'office.db')
  let db = new Database(path)
  db.exec('CREATE TABLE properties (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO properties VALUES (1, \'سجل قائم\');')
  ensureAuthSchema(db)
  const session = new LocalAuthSession(() => db)

  assert.deepEqual(session.status(), { hasAccount: false, authenticated: false, username: null })
  session.setup('office', 'Correct-Password-1')
  assert.equal(session.status().authenticated, true)

  const stored = db.prepare('SELECT username, passwordHash, salt FROM local_auth WHERE id = 1').get() as Record<string, string>
  assert.equal(stored.username, 'office')
  assert.notEqual(stored.passwordHash, 'Correct-Password-1')
  assert.ok(stored.passwordHash.length > 40)
  assert.ok(stored.salt.length > 10)
  assert.equal(JSON.stringify(stored).includes('Correct-Password-1'), false)
  assert.equal((db.prepare('SELECT name FROM properties WHERE id = 1').get() as { name: string }).name, 'سجل قائم')

  session.logout()
  db.close()
  db = new Database(path)
  const reopened = new LocalAuthSession(() => db)
  assert.equal(reopened.status().hasAccount, true)
  assert.equal(reopened.status().authenticated, false)
  assert.equal(reopened.login('office', 'wrong').success, false)
  assert.equal(reopened.login('office', 'Correct-Password-1').success, true)
  reopened.lock()
  assert.equal(reopened.status().authenticated, false)
  assert.equal(reopened.login('office', 'Correct-Password-1').success, true)
  reopened.logout()
  assert.equal(reopened.status().authenticated, false)
  db.close()
  rmSync(root, { recursive: true, force: true })
})

test('password change verifies current password and invalidates the old password', () => {
  const root = mkdtempSync(join(tmpdir(), 'almohands-password-test-'))
  const db = new Database(join(root, 'office.db'))
  const session = new LocalAuthSession(() => db)
  session.setup('engineer', 'Old-Password-1')
  assert.throws(() => session.changePassword('wrong', 'New-Password-2'), /INVALID_CREDENTIALS/)
  session.changePassword('Old-Password-1', 'New-Password-2')
  session.logout()
  assert.equal(session.login('engineer', 'Old-Password-1').success, false)
  assert.equal(session.login('engineer', 'New-Password-2').success, true)
  db.close()
  rmSync(root, { recursive: true, force: true })
})

test('inactivity timer locks and user activity resets the deadline', async () => {
  let locks = 0
  const timer = new InactivityLockTimer(35, () => { locks += 1 })
  timer.activity()
  await new Promise((resolve) => setTimeout(resolve, 20))
  timer.activity()
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(locks, 0)
  await new Promise((resolve) => setTimeout(resolve, 25))
  assert.equal(locks, 1)
  timer.stop()
})
