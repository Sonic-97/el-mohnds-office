import { ipcMain, app, shell } from 'electron'
import { join, basename, resolve } from 'path'
import { copyFileSync, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs'
import type {
  PropertyInput,
  ClientInput,
  PropertyDetail,
  PropertyFile,
  DocumentItem,
  CustomFieldValue,
  SearchFilters,
  DuplicateCheck,
  MapPoint,
  AreaStat,
  SettingsMap,
  DashboardStats,
  MarketAreaInput,
  ConstructionCostInput,
  OfficeZoneStat,
  Client,
  Property
} from '@shared/types'
import { getDb } from './db'
import {
  matchPropertiesForClient,
  matchClientsForProperty,
  computeMatchOpportunities,
  getBudgetTolerancePercent
} from './matching'

function computePricePerMeter(price: number | null, area: number | null): number | null {
  if (price != null && area != null && area > 0) return Math.round((price / area) * 100) / 100
  return null
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function copyFileToStore(sourcePath: string, propertyId: number): string {
  const dir = join(app.getPath('userData'), 'files')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const stamp = Date.now()
  const dest = join(dir, `${propertyId}_${stamp}_${basename(sourcePath)}`)
  copyFileSync(sourcePath, dest)
  return dest
}

function buildDetail(db: ReturnType<typeof getDb>, row: any): PropertyDetail {
  const files = db
    .prepare('SELECT * FROM property_files WHERE propertyId = ? ORDER BY createdAt')
    .all(row.id) as PropertyFile[]
  const documents = db
    .prepare('SELECT * FROM documents WHERE propertyId = ? ORDER BY id')
    .all(row.id) as DocumentItem[]
  const values = db
    .prepare('SELECT fieldId, value FROM custom_field_values WHERE propertyId = ?')
    .all(row.id) as Pick<CustomFieldValue, 'fieldId' | 'value'>[]
  const customValues: Record<number, string> = {}
  for (const v of values) customValues[v.fieldId] = v.value
  return { ...row, files, documents, customValues }
}

export function registerIpc(): void {
  ipcMain.handle('settings:getAll', () => {
    const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    const map: SettingsMap = {}
    for (const r of rows) map[r.key] = r.value
    return map
  })

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    const db = getDb()
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?').run(
      key,
      value,
      value
    )
    return true
  })

  ipcMain.handle('types:list', () => {
    return getDb().prepare('SELECT * FROM property_types ORDER BY id').all()
  })

  ipcMain.handle('types:create', (_e, name: string) => {
    const db = getDb()
    const cleaned = name.trim()
    if (!cleaned) throw new Error('الاسم مطلوب')
    const exists = db.prepare('SELECT id FROM property_types WHERE name = ?').get(cleaned)
    if (exists) throw new Error('هذا النوع موجود بالفعل')
    const res = db.prepare('INSERT INTO property_types (name) VALUES (?)').run(cleaned)
    return db.prepare('SELECT * FROM property_types WHERE id = ?').get(res.lastInsertRowid)
  })

  ipcMain.handle('types:ensure', (_e, name: string) => {
    const db = getDb()
    const cleaned = name.trim()
    if (!cleaned) throw new Error('الاسم مطلوب')
    const existing = db.prepare('SELECT * FROM property_types WHERE name = ?').get(cleaned)
    if (existing) return existing
    const res = db.prepare('INSERT INTO property_types (name) VALUES (?)').run(cleaned)
    return db.prepare('SELECT * FROM property_types WHERE id = ?').get(res.lastInsertRowid)
  })

  ipcMain.handle('types:delete', (_e, id: number) => {
    getDb().prepare('DELETE FROM property_types WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('properties:list', () => {
    return getDb().prepare('SELECT * FROM properties ORDER BY updatedAt DESC').all()
  })

  ipcMain.handle('properties:get', (_e, id: number) => {
    const db = getDb()
    const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(id)
    if (!row) return null
    return buildDetail(db, row)
  })

  ipcMain.handle('properties:create', (_e, input: PropertyInput) => {
    const db = getDb()
    const pricePerMeter = computePricePerMeter(input.price, input.area)
    const res = db
      .prepare(
        `INSERT INTO properties (name, type, governorate, city, center, neighborhood, zone,
          street, propertyNumber, mapsUrl, latitude, longitude, area, price, pricePerMeter,
          status, facadeDirection, streetWidth, ownerName, ownerPhone, notes)
         VALUES (@name, @type, @governorate, @city, @center, @neighborhood, @zone,
          @street, @propertyNumber, @mapsUrl, @latitude, @longitude, @area, @price, @pricePerMeter,
          @status, @facadeDirection, @streetWidth, @ownerName, @ownerPhone, @notes)`
      )
      .run({ ...input, pricePerMeter })
    const id = Number(res.lastInsertRowid)
    const insertDoc = db.prepare('INSERT INTO documents (propertyId, docType, done) VALUES (?, ?, 0)')
    for (const doc of ['عقد', 'ملكية', 'رخصة', 'مرافق', 'مستندات أخرى']) {
      insertDoc.run(id, doc)
    }
    return getDb().prepare('SELECT * FROM properties WHERE id = ?').get(id)
  })

  ipcMain.handle('properties:update', (_e, id: number, input: PropertyInput) => {
    const db = getDb()
    const pricePerMeter = computePricePerMeter(input.price, input.area)
    db.prepare(
      `UPDATE properties SET name = @name, type = @type, governorate = @governorate,
        city = @city, center = @center, neighborhood = @neighborhood, zone = @zone,
        street = @street, propertyNumber = @propertyNumber, mapsUrl = @mapsUrl,
        latitude = @latitude, longitude = @longitude, area = @area, price = @price,
        pricePerMeter = @pricePerMeter, status = @status, facadeDirection = @facadeDirection,
        streetWidth = @streetWidth, ownerName = @ownerName, ownerPhone = @ownerPhone,
        notes = @notes, updatedAt = datetime('now') WHERE id = @id`
    ).run({ ...input, pricePerMeter, id })
    return getDb().prepare('SELECT * FROM properties WHERE id = ?').get(id)
  })

  ipcMain.handle('properties:delete', (_e, id: number) => {
    const db = getDb()
    const files = db.prepare('SELECT path FROM property_files WHERE propertyId = ?').all(id) as { path: string }[]
    db.prepare('DELETE FROM properties WHERE id = ?').run(id)
    const filesDir = join(app.getPath('userData'), 'files')
    for (const f of files) {
      try {
        const fullPath = resolve(f.path)
        if (fullPath.startsWith(filesDir) && existsSync(fullPath)) unlinkSync(fullPath)
      } catch {
        /* ignore */
      }
    }
    return true
  })

  ipcMain.handle('properties:search', (_e, filters: SearchFilters) => {
    const clauses: string[] = []
    const params: any[] = []
    if (filters.type) {
      clauses.push('type = ?')
      params.push(filters.type)
    }
    if (filters.zone) {
      clauses.push('(zone LIKE ? OR city LIKE ? OR neighborhood LIKE ?)')
      params.push(`%${filters.zone}%`, `%${filters.zone}%`, `%${filters.zone}%`)
    }
    if (filters.status) {
      clauses.push('status = ?')
      params.push(filters.status)
    }
    if (filters.maxPrice != null) {
      clauses.push('price <= ?')
      params.push(filters.maxPrice)
    }
    if (filters.minArea != null) {
      clauses.push('area >= ?')
      params.push(filters.minArea)
    }
    if (filters.maxArea != null) {
      clauses.push('area <= ?')
      params.push(filters.maxArea)
    }
    if (filters.query) {
      clauses.push('(name LIKE ? OR ownerName LIKE ? OR ownerPhone LIKE ? OR city LIKE ? OR street LIKE ?)')
      const like = `%${filters.query}%`
      params.push(like, like, like, like, like)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    return getDb().prepare(`SELECT * FROM properties ${where} ORDER BY updatedAt DESC`).all(...params)
  })

  ipcMain.handle('properties:checkDuplicates', (_e, input: PropertyInput) => {
    const db = getDb()
    const results: DuplicateCheck = { hasDuplicates: false, matches: [] }
    const where: string[] = []
    const params: any[] = []
    if (input.ownerPhone.trim()) {
      where.push('ownerPhone = ?')
      params.push(input.ownerPhone.trim())
    }
    if (input.mapsUrl.trim()) {
      where.push('mapsUrl = ?')
      params.push(input.mapsUrl.trim())
    }
    if (input.street.trim() && input.zone.trim()) {
      where.push('street = ? AND zone = ?')
      params.push(input.street.trim(), input.zone.trim())
    }
    if (where.length) {
      const matches = db.prepare(`SELECT * FROM properties WHERE ${where.join(' OR ')}`).all(...params) as any[]
      if (matches.length) {
        results.hasDuplicates = true
        results.matches = matches
      }
    }
    const norm = normalize(input.name)
    if (norm.length >= 5) {
      const similar = db
        .prepare('SELECT * FROM properties')
        .all() as any[]
      const found = similar.filter((p) => {
        const n = normalize(p.name)
        return n === norm || (n.length >= 5 && (n.includes(norm) || norm.includes(n)))
      })
      if (found.length) {
        results.hasDuplicates = true
        const existingIds = new Set(results.matches.map((m) => m.id))
        for (const f of found) if (!existingIds.has(f.id)) results.matches.push(f)
      }
    }
    return results
  })

  ipcMain.handle('properties:mapPoints', () => {
    const rows = getDb()
      .prepare(
        'SELECT id, name, type, status, price, area, zone, city, governorate, latitude, longitude FROM properties WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
      )
      .all() as MapPoint[]
    return rows
  })

  ipcMain.handle('stats:dashboard', () => {
    const db = getDb()
    const one = (sql: string): number => (db.prepare(sql).get() as { c: number }).c
    const stats: DashboardStats = {
      totalProperties: one('SELECT COUNT(*) AS c FROM properties'),
      totalLands: one("SELECT COUNT(*) AS c FROM properties WHERE type = 'أرض'"),
      totalApartments: one("SELECT COUNT(*) AS c FROM properties WHERE type = 'شقة'"),
      totalClients: one('SELECT COUNT(*) AS c FROM clients'),
      available: one("SELECT COUNT(*) AS c FROM properties WHERE status = 'available'"),
      sold: one("SELECT COUNT(*) AS c FROM properties WHERE status = 'sold'")
    }
    return stats
  })

  ipcMain.handle('stats:areaAverages', () => {
    const rows = getDb()
      .prepare(
        `SELECT zone, COUNT(*) AS count, AVG(pricePerMeter) AS avgPricePerMeter
         FROM properties WHERE zone != '' AND pricePerMeter IS NOT NULL
         GROUP BY zone ORDER BY count DESC`
      )
      .all() as AreaStat[]
    return rows
  })

  ipcMain.handle('files:list', (_e, propertyId: number) => {
    return getDb().prepare('SELECT * FROM property_files WHERE propertyId = ? ORDER BY createdAt').all(propertyId)
  })

  ipcMain.handle('files:add', (_e, propertyId: number, kind: string, sourcePath: string) => {
    const db = getDb()
    const stored = copyFileToStore(sourcePath, propertyId)
    const name = basename(sourcePath)
    const res = db
      .prepare('INSERT INTO property_files (propertyId, kind, name, path) VALUES (?, ?, ?, ?)')
      .run(propertyId, kind, name, stored)
    return db.prepare('SELECT * FROM property_files WHERE id = ?').get(res.lastInsertRowid)
  })

  ipcMain.handle('files:delete', (_e, id: number) => {
    getDb().prepare('DELETE FROM property_files WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('files:open', async (_e, path: string) => {
    return shell.openPath(path)
  })

  ipcMain.handle('documents:list', (_e, propertyId: number) => {
    return getDb().prepare('SELECT * FROM documents WHERE propertyId = ? ORDER BY id').all(propertyId)
  })

  ipcMain.handle('documents:toggle', (_e, id: number, done: boolean) => {
    getDb().prepare('UPDATE documents SET done = ? WHERE id = ?').run(done ? 1 : 0, id)
    return true
  })

  ipcMain.handle('clients:list', () => {
    return getDb().prepare('SELECT * FROM clients ORDER BY updatedAt DESC').all()
  })

  ipcMain.handle('clients:get', (_e, id: number) => {
    return getDb().prepare('SELECT * FROM clients WHERE id = ?').get(id)
  })

  ipcMain.handle('clients:create', (_e, input: ClientInput) => {
    const res = getDb()
      .prepare(
        `INSERT INTO clients (name, phone, role, budget, preferredArea, preferredType,
          preferredAreaSize, seriousness, notes, type, area, requestType, governorate, city, center,
          neighborhood, budgetFrom, budgetTo, areaFrom, areaTo, desiredStatus)
         VALUES (@name, @phone, @role, @budget, @preferredArea, @preferredType,
          @preferredAreaSize, @seriousness, @notes, @type, @area, @requestType, @governorate, @city, @center,
          @neighborhood, @budgetFrom, @budgetTo, @areaFrom, @areaTo, @desiredStatus)`
      )
      .run(input)
    return getDb().prepare('SELECT * FROM clients WHERE id = ?').get(res.lastInsertRowid)
  })

  ipcMain.handle('clients:update', (_e, id: number, input: ClientInput) => {
    const db = getDb()
    db.prepare(
      `UPDATE clients SET name = @name, phone = @phone, role = @role, budget = @budget,
        preferredArea = @preferredArea, preferredType = @preferredType,
        preferredAreaSize = @preferredAreaSize, seriousness = @seriousness,
        notes = @notes, type = @type, area = @area, requestType = @requestType, governorate = @governorate,
        city = @city, center = @center, neighborhood = @neighborhood,
        budgetFrom = @budgetFrom, budgetTo = @budgetTo,
        areaFrom = @areaFrom, areaTo = @areaTo, desiredStatus = @desiredStatus,
        updatedAt = datetime('now') WHERE id = @id`
    ).run({ ...input, id })
    return db.prepare('SELECT * FROM clients WHERE id = ?').get(id)
  })

  ipcMain.handle('clients:delete', (_e, id: number) => {
    getDb().prepare('DELETE FROM clients WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('matching:clientMatches', (_e, clientId: number) => {
    const client = getDb().prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as Client | undefined
    if (!client) return []
    return matchPropertiesForClient(client)
  })

  ipcMain.handle('matching:propertyMatches', (_e, propertyId: number) => {
    const property = getDb().prepare('SELECT * FROM properties WHERE id = ?').get(propertyId) as Property | undefined
    if (!property) return []
    return matchClientsForProperty(property)
  })

  ipcMain.handle('matching:clientMatchCount', (_e, clientId: number) => {
    const client = getDb().prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as Client | undefined
    if (!client) return 0
    return matchPropertiesForClient(client).length
  })

  ipcMain.handle('matching:propertyMatchCount', (_e, propertyId: number) => {
    const property = getDb().prepare('SELECT * FROM properties WHERE id = ?').get(propertyId) as Property | undefined
    if (!property) return 0
    return matchClientsForProperty(property).length
  })

  ipcMain.handle('matching:opportunities', () => {
    return computeMatchOpportunities()
  })

  ipcMain.handle('matching:budgetTolerance', () => {
    return getBudgetTolerancePercent()
  })

  ipcMain.handle('customFields:list', () => {
    return getDb().prepare('SELECT * FROM custom_fields ORDER BY id').all()
  })

  ipcMain.handle('customFields:create', (_e, name: string, fieldType: 'text' | 'number') => {
    const db = getDb()
    const cleaned = name.trim()
    if (!cleaned) throw new Error('الاسم مطلوب')
    const exists = db.prepare('SELECT id FROM custom_fields WHERE name = ?').get(cleaned)
    if (exists) throw new Error('هذا الحقل موجود بالفعل')
    const res = db.prepare('INSERT INTO custom_fields (name, fieldType) VALUES (?, ?)').run(cleaned, fieldType)
    return db.prepare('SELECT * FROM custom_fields WHERE id = ?').get(res.lastInsertRowid)
  })

  ipcMain.handle('customFields:delete', (_e, id: number) => {
    getDb().prepare('DELETE FROM custom_fields WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('customFields:save', (_e, propertyId: number, values: Record<number, string>) => {
    const db = getDb()
    const upsert = db.prepare(
      `INSERT INTO custom_field_values (propertyId, fieldId, value) VALUES (?, ?, ?)
       ON CONFLICT(propertyId, fieldId) DO UPDATE SET value = excluded.value`
    )
    const del = db.prepare('DELETE FROM custom_field_values WHERE propertyId = ? AND fieldId = ?')
    for (const [fieldId, value] of Object.entries(values)) {
      if (value.trim()) upsert.run(propertyId, Number(fieldId), value)
      else del.run(propertyId, Number(fieldId))
    }
    return true
  })

  type BrandingKind = 'logo' | 'banner' | 'background'
  const brandingFile = (kind: BrandingKind): string =>
    join(app.getPath('userData'), 'branding', `${kind}.png`)

  ipcMain.handle('market:listAreas', () => {
    return getDb().prepare('SELECT * FROM market_areas ORDER BY area').all()
  })

  ipcMain.handle('market:saveArea', (_e, input: MarketAreaInput) => {
    const db = getDb()
    const area = input.area.trim()
    if (!area) throw new Error('اسم المنطقة مطلوب')
    const params = { ...input, area }
    const existing = db.prepare('SELECT id FROM market_areas WHERE area = ?').get(area)
    if (existing) {
      db.prepare(
        `UPDATE market_areas SET
          landMin=@landMin, landAvg=@landAvg, landMax=@landMax, landCount=@landCount, landDataType=@landDataType,
          aptMin=@aptMin, aptAvg=@aptAvg, aptMax=@aptMax, aptCount=@aptCount, aptDataType=@aptDataType,
          sourceName=@sourceName, sourceUrl=@sourceUrl, sourceDate=@sourceDate, notes=@notes,
          updatedAt=datetime('now') WHERE area=@area`
      ).run(params)
      return db.prepare('SELECT * FROM market_areas WHERE area = ?').get(area)
    }
    const res = db
      .prepare(
        `INSERT INTO market_areas
          (area, landMin, landAvg, landMax, landCount, landDataType, aptMin, aptAvg, aptMax, aptCount, aptDataType, sourceName, sourceUrl, sourceDate, notes)
         VALUES
          (@area, @landMin, @landAvg, @landMax, @landCount, @landDataType, @aptMin, @aptAvg, @aptMax, @aptCount, @aptDataType, @sourceName, @sourceUrl, @sourceDate, @notes)`
      )
      .run(params)
    return db.prepare('SELECT * FROM market_areas WHERE id = ?').get(res.lastInsertRowid)
  })

  ipcMain.handle('market:deleteArea', (_e, id: number) => {
    getDb().prepare('DELETE FROM market_areas WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('market:officeStats', () => {
    const rows = getDb()
      .prepare(
        `SELECT zone, pricePerMeter, price, area FROM properties
         WHERE (pricePerMeter IS NOT NULL) OR (price IS NOT NULL AND area IS NOT NULL AND area > 0)`
      )
      .all() as { zone: string; pricePerMeter: number | null; price: number | null; area: number | null }[]
    const byZone = new Map<string, number[]>()
    for (const r of rows) {
      const ppm = r.pricePerMeter ?? (r.price != null && r.area && r.area > 0 ? r.price / r.area : null)
      if (ppm == null || !isFinite(ppm)) continue
      const zone = r.zone?.trim() || 'غير محدد'
      const list = byZone.get(zone) ?? []
      list.push(ppm)
      byZone.set(zone, list)
    }
    const out: OfficeZoneStat[] = []
    for (const [zone, values] of byZone) {
      const sorted = [...values].sort((a, b) => a - b)
      const n = sorted.length
      const mid = Math.floor(n / 2)
      const median = n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
      const sum = sorted.reduce((a, b) => a + b, 0)
      out.push({
        zone,
        count: n,
        min: sorted[0],
        avg: Math.round((sum / n) * 100) / 100,
        median: Math.round(median * 100) / 100,
        max: sorted[n - 1]
      })
    }
    return out.sort((a, b) => b.count - a.count)
  })

  ipcMain.handle('constCost:list', () => {
    return getDb().prepare('SELECT * FROM construction_cost ORDER BY id').all()
  })

  ipcMain.handle('constCost:save', (_e, input: ConstructionCostInput) => {
    const db = getDb()
    const category = input.category.trim()
    if (!category) throw new Error('اسم البند مطلوب')
    const params = { ...input, category }
    const existing = db.prepare('SELECT id FROM construction_cost WHERE category = ?').get(category)
    if (existing) {
      db.prepare(
        `UPDATE construction_cost SET
          minCost=@minCost, typicalCost=@typicalCost, maxCost=@maxCost,
          sourceName=@sourceName, sourceUrl=@sourceUrl, sourceDate=@sourceDate,
          updatedAt=datetime('now') WHERE category=@category`
      ).run(params)
      return db.prepare('SELECT * FROM construction_cost WHERE category = ?').get(category)
    }
    const res = db
      .prepare(
        `INSERT INTO construction_cost (category, minCost, typicalCost, maxCost, sourceName, sourceUrl, sourceDate)
         VALUES (@category, @minCost, @typicalCost, @maxCost, @sourceName, @sourceUrl, @sourceDate)`
      )
      .run(params)
    return db.prepare('SELECT * FROM construction_cost WHERE id = ?').get(res.lastInsertRowid)
  })

  ipcMain.handle('constCost:delete', (_e, id: number) => {
    getDb().prepare('DELETE FROM construction_cost WHERE id = ?').run(id)
    return true
  })

  ipcMain.handle('branding:get', () => {
    const logo = brandingFile('logo')
    const banner = brandingFile('banner')
    const background = brandingFile('background')
    return {
      logo: existsSync(logo) ? logo : null,
      banner: existsSync(banner) ? banner : null,
      background: existsSync(background) ? background : null
    }
  })

  ipcMain.handle('branding:save', (_e, kind: BrandingKind, payload: string | number[]) => {
    const dir = join(app.getPath('userData'), 'branding')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const dest = brandingFile(kind)
    if (Array.isArray(payload)) {
      writeFileSync(dest, Buffer.from(payload))
    } else {
      if (!payload) throw new Error('مسار الملف فارغ')
      copyFileSync(payload, dest)
    }
    return dest
  })

  ipcMain.handle('branding:remove', (_e, kind: BrandingKind) => {
    const dest = brandingFile(kind)
    if (existsSync(dest)) unlinkSync(dest)
    return true
  })
}
