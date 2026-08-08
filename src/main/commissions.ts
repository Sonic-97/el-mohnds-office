import type { Commission, CommissionInput, CommissionSummary } from '@shared/types'
import { getDb } from './db'

function getCommission(id: number): Commission {
  return getDb()
    .prepare(
      `SELECT c.*, p.name AS propertyName
       FROM commissions c JOIN properties p ON p.id = c.propertyId
       WHERE c.id = ?`
    )
    .get(id) as Commission
}

export function listCommissions(): Commission[] {
  return getDb()
    .prepare(
      `SELECT c.*, p.name AS propertyName
       FROM commissions c JOIN properties p ON p.id = c.propertyId
       ORDER BY c.date DESC, c.id DESC`
    )
    .all() as Commission[]
}

export function createCommission(input: CommissionInput): Commission {
  const res = getDb()
    .prepare(
      `INSERT INTO commissions (propertyId, finalPrice, cType, rate, amount, received, date, notes)
       VALUES (@propertyId, @finalPrice, @cType, @rate, @amount, @received, @date, @notes)`
    )
    .run(input)
  return getCommission(Number(res.lastInsertRowid))
}

export function updateCommission(id: number, input: CommissionInput): Commission {
  getDb()
    .prepare(
      `UPDATE commissions SET
         propertyId = @propertyId, finalPrice = @finalPrice, cType = @cType,
         rate = @rate, amount = @amount, received = @received,
         date = @date, notes = @notes WHERE id = @id`
    )
    .run({ ...input, id })
  return getCommission(id)
}

export function deleteCommission(id: number): boolean {
  getDb().prepare('DELETE FROM commissions WHERE id = ?').run(id)
  return true
}

export function commissionSummary(): CommissionSummary {
  const rows = getDb()
    .prepare('SELECT amount, received, date FROM commissions')
    .all() as { amount: number; received: number; date: string }[]
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  let monthExpected = 0
  let monthReceived = 0
  let totalExpected = 0
  let totalReceived = 0
  for (const r of rows) {
    totalExpected += r.amount
    if (r.received) totalReceived += r.amount
    if ((r.date || '').startsWith(monthKey)) {
      monthExpected += r.amount
      if (r.received) monthReceived += r.amount
    }
  }
  return {
    monthExpected,
    monthReceived,
    monthOutstanding: monthExpected - monthReceived,
    totalExpected,
    totalReceived,
    totalOutstanding: totalExpected - totalReceived,
    count: rows.length
  }
}
