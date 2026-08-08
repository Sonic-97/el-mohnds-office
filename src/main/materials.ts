import type { ConstructionMaterial, ConstructionMaterialInput, MaterialRefreshResult } from '@shared/types'
import { getDb } from './db'

export function listMaterials(): ConstructionMaterial[] {
  return getDb().prepare('SELECT * FROM construction_materials ORDER BY name').all() as ConstructionMaterial[]
}

export function saveMaterial(input: ConstructionMaterialInput): ConstructionMaterial {
  const db = getDb()
  const name = input.name.trim()
  if (!name) throw new Error('اسم المادة مطلوب')
  const existing = db
    .prepare('SELECT * FROM construction_materials WHERE name = ?')
    .get(name) as ConstructionMaterial | undefined
  if (existing) {
    const previousPrice = input.price !== existing.price ? existing.price : existing.previousPrice
    db.prepare(
      `UPDATE construction_materials SET
         unit = @unit, price = @price, previousPrice = @previousPrice,
         source = @source, sourceUrl = @sourceUrl, notes = @notes,
         updatedAt = datetime('now') WHERE name = @name`
    ).run({ ...input, name, previousPrice })
    return db.prepare('SELECT * FROM construction_materials WHERE name = ?').get(name) as ConstructionMaterial
  }
  const res = db
    .prepare(
      `INSERT INTO construction_materials (name, unit, price, previousPrice, source, sourceUrl, notes)
       VALUES (@name, @unit, @price, @previousPrice, @source, @sourceUrl, @notes)`
    )
    .run({ ...input, name })
  return db.prepare('SELECT * FROM construction_materials WHERE id = ?').get(res.lastInsertRowid) as ConstructionMaterial
}

export function deleteMaterial(id: number): boolean {
  getDb().prepare('DELETE FROM construction_materials WHERE id = ?').run(id)
  return true
}

function getSetting(key: string): string {
  const row = getDb().prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as { value: string } | undefined
  return row?.value?.trim() ?? ''
}

export async function refreshMaterials(): Promise<MaterialRefreshResult> {
  const url = getSetting('materialsSourceUrl')
  if (!url) {
    return { ok: false, message: 'لا يوجد رابط مصدر تلقائي مضبوط — أضف الأسعار يدوياً', updated: 0 }
  }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 15000)
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'AlMohandsEngineerOffice/1.0' } })
    clearTimeout(t)
    if (!res.ok) return { ok: false, message: `فشل التحميل من المصدر (${res.status})`, updated: 0 }
    const raw = await res.text()
    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      return { ok: false, message: 'المصدر لا يرجع بيانات JSON صالحة', updated: 0 }
    }
    if (!Array.isArray(data)) return { ok: false, message: 'صيغة بيانات المصدر غير صحيحة', updated: 0 }

    let updated = 0
    for (const item of data) {
      const rec = item as { name?: unknown; price?: unknown; unit?: unknown; source?: unknown; sourceUrl?: unknown }
      const name = String(rec.name ?? '').trim()
      if (!name) continue
      const price = typeof rec.price === 'number' && isFinite(rec.price) ? rec.price : null
      if (price == null) continue
      saveMaterial({
        name,
        unit: String(rec.unit ?? 'طن').trim() || 'طن',
        price,
        previousPrice: null,
        source: String(rec.source ?? url).trim(),
        sourceUrl: rec.sourceUrl ? String(rec.sourceUrl).trim() : url,
        notes: 'تحديث تلقائي من المصدر'
      })
      updated++
    }

    const db = getDb()
    db.prepare(
      `INSERT INTO settings (key, value) VALUES ('materialsLastAutoUpdate', ?)
       ON CONFLICT(key) DO UPDATE SET value = ?`
    ).run(new Date().toISOString(), new Date().toISOString())
    return { ok: true, message: `تم تحديث ${updated} مادة`, updated }
  } catch (e) {
    return { ok: false, message: 'فشل التحديث التلقائي: ' + String(e), updated: 0 }
  }
}

export async function tryAutoUpdateMaterials(): Promise<void> {
  const last = getSetting('materialsLastAutoUpdate')
  if (last) {
    const d = new Date(last)
    const now = new Date()
    if (!isNaN(d.getTime()) && d.toDateString() === now.toDateString()) return
  }
  try {
    await refreshMaterials()
  } catch {
    /* ignore — stays on manual data */
  }
}
