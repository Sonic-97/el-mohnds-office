import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import Database from 'better-sqlite3'
import { ensureAuthSchema } from './auth'

let db: Database.Database | null = null

export function getDatabasePath(): string {
  return join(app.getPath('userData'), 'al-mohands.db')
}

export function getDb(): Database.Database {
  if (db) return db
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  db = new Database(getDatabasePath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createSchema(db)
  ensureAuthSchema(db)
  migrate(db)
  seedMarketReference(db)
  return db
}

export function closeDb(): void {
  if (!db) return
  db.close()
  db = null
}

function migrate(db: Database.Database): void {
  const cols = db.prepare(`PRAGMA table_info(clients)`).all() as { name: string }[]
  const has = (name: string): boolean => cols.some((c) => c.name === name)
  const addCol = (name: string, ddl: string): void => {
    if (!has(name)) db.exec(`ALTER TABLE clients ADD COLUMN ${ddl}`)
  }
  addCol('requestType', `requestType TEXT NOT NULL DEFAULT ''`)
  addCol('type', `type TEXT NOT NULL DEFAULT ''`)
  addCol('area', `area TEXT NOT NULL DEFAULT ''`)
  addCol('governorate', `governorate TEXT NOT NULL DEFAULT ''`)
  addCol('city', `city TEXT NOT NULL DEFAULT ''`)
  addCol('center', `center TEXT NOT NULL DEFAULT ''`)
  addCol('neighborhood', `neighborhood TEXT NOT NULL DEFAULT ''`)
  addCol('budgetFrom', `budgetFrom REAL`)
  addCol('budgetTo', `budgetTo REAL`)
  addCol('areaFrom', `areaFrom REAL`)
  addCol('areaTo', `areaTo REAL`)
  addCol('desiredStatus', `desiredStatus TEXT NOT NULL DEFAULT ''`)
  addCol('followUpDate', `followUpDate TEXT NOT NULL DEFAULT ''`)
  addCol('followUpNote', `followUpNote TEXT NOT NULL DEFAULT ''`)
  addCol('followUpStatus', `followUpStatus TEXT NOT NULL DEFAULT 'new'`)

  const mCols = db.prepare(`PRAGMA table_info(market_areas)`).all() as { name: string }[]
  const mHas = (name: string): boolean => mCols.some((c) => c.name === name)
  const addMCol = (name: string, ddl: string): void => {
    if (!mHas(name)) db.exec(`ALTER TABLE market_areas ADD COLUMN ${ddl}`)
  }
  addMCol('rentMin', `rentMin REAL`)
  addMCol('rentAvg', `rentAvg REAL`)
  addMCol('rentMax', `rentMax REAL`)
  addMCol('rentCount', `rentCount INTEGER NOT NULL DEFAULT 0`)
  addMCol('rentDataType', `rentDataType TEXT NOT NULL DEFAULT 'manual'`)
}

function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS property_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT '',
      governorate TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      center TEXT NOT NULL DEFAULT '',
      neighborhood TEXT NOT NULL DEFAULT '',
      zone TEXT NOT NULL DEFAULT '',
      street TEXT NOT NULL DEFAULT '',
      propertyNumber TEXT NOT NULL DEFAULT '',
      mapsUrl TEXT NOT NULL DEFAULT '',
      latitude REAL,
      longitude REAL,
      area REAL,
      price REAL,
      pricePerMeter REAL,
      status TEXT NOT NULL DEFAULT 'available',
      facadeDirection TEXT NOT NULL DEFAULT '',
      streetWidth REAL,
      ownerName TEXT NOT NULL DEFAULT '',
      ownerPhone TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS property_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      propertyId INTEGER NOT NULL,
      kind TEXT NOT NULL DEFAULT 'other',
      name TEXT NOT NULL DEFAULT '',
      path TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'buyer',
      budget REAL,
      preferredArea TEXT NOT NULL DEFAULT '',
      preferredType TEXT NOT NULL DEFAULT '',
      preferredAreaSize REAL,
      seriousness TEXT NOT NULL DEFAULT 'possible',
      notes TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      area TEXT NOT NULL DEFAULT '',
      requestType TEXT NOT NULL DEFAULT '',
      governorate TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      center TEXT NOT NULL DEFAULT '',
      neighborhood TEXT NOT NULL DEFAULT '',
      budgetFrom REAL,
      budgetTo REAL,
      areaFrom REAL,
      areaTo REAL,
      desiredStatus TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      propertyId INTEGER NOT NULL,
      docType TEXT NOT NULL DEFAULT '',
      done INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      fieldType TEXT NOT NULL DEFAULT 'text',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS custom_field_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      propertyId INTEGER NOT NULL,
      fieldId INTEGER NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      UNIQUE(propertyId, fieldId),
      FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
      FOREIGN KEY (fieldId) REFERENCES custom_fields(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS market_areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area TEXT NOT NULL UNIQUE,
      landMin REAL,
      landAvg REAL,
      landMax REAL,
      landCount INTEGER NOT NULL DEFAULT 0,
      landDataType TEXT NOT NULL DEFAULT 'listing',
      aptMin REAL,
      aptAvg REAL,
      aptMax REAL,
      aptCount INTEGER NOT NULL DEFAULT 0,
      aptDataType TEXT NOT NULL DEFAULT 'listing',
      sourceName TEXT NOT NULL DEFAULT '',
      sourceUrl TEXT NOT NULL DEFAULT '',
      sourceDate TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS construction_cost (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL UNIQUE,
      minCost REAL,
      typicalCost REAL,
      maxCost REAL,
      sourceName TEXT NOT NULL DEFAULT '',
      sourceUrl TEXT NOT NULL DEFAULT '',
      sourceDate TEXT NOT NULL DEFAULT '',
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS map_areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#2a4872',
      points TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS zmap_cache (
      key TEXT PRIMARY KEY,
      payload TEXT NOT NULL DEFAULT '{}',
      fetchedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS construction_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      unit TEXT NOT NULL DEFAULT 'طن',
      price REAL,
      previousPrice REAL,
      source TEXT NOT NULL DEFAULT '',
      sourceUrl TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      propertyId INTEGER NOT NULL,
      finalPrice REAL NOT NULL DEFAULT 0,
      cType TEXT NOT NULL DEFAULT 'percent',
      rate REAL NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      received INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE
    );
  `)
}

function seedMarketReference(db: Database.Database): void {
  const areas = db.prepare('SELECT COUNT(*) AS c FROM market_areas').get() as { c: number }
  const consts = db.prepare('SELECT COUNT(*) AS c FROM construction_cost').get() as { c: number }
  if (areas.c === 0) {
    const ins = db.prepare(
      `INSERT OR IGNORE INTO market_areas
        (area, landMin, landAvg, landMax, landCount, landDataType, aptMin, aptAvg, aptMax, aptCount, aptDataType, sourceName, sourceUrl, sourceDate, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const rows: (string | number | null)[][] = [
      ['القومية', 3982, 24500, 45000, 2, 'listing', 21000, 21000, 21000, 1, 'listing',
        'إعلانات عقارماب / بيوت (أسعار عرض)', 'https://aqarmap.com.eg/ar/for-sale/land-or-farm/sharqia/zagazig/',
        '2026-08-07', 'أسعار عرض من إعلانات 2026. عينة الأرض تشمل قطعة كبيرة محيطية وأخرى صغيرة على الشارع الرئيسي. الشقة 180م نصف تشطيب 21 ألف/م² (بيوت 09-06-2026).'],
      ['مركز فاروق', null, null, null, 0, 'listing', 15000, 15000, 15000, 1, 'listing',
        'إعلان عقارماب (سعر عرض)', 'https://aqarmap.com.eg/ar/listing/6252174-for-sale-sharqia-zagazig-zagazig-city-markaz-farouk-st/',
        '2026-02-20', 'شقة 150م نصف تشطيب كاملة المرافق على طريق الزراعة: 15 ألف/م² كاش + 100 ألف خدمات (إعلان 20-02-2026).'],
      ['حي الزهور', 47846, 47846, 47846, 1, 'listing', null, null, null, 0, 'listing',
        'إعلان عقارماب (سعر عرض)', 'https://aqarmap.com.eg/ar/for-sale/land-or-farm/sharqia/zagazig/',
        '2026-08-07', 'أرض 209م بحي الزهور: 47,846 ج/م² (إعلان). عينة واحدة فقط.'],
      ['طريق الغشام', 23055, 31528, 40000, 2, 'listing', null, null, null, 0, 'listing',
        'إعلانات عقارماب (أسعار عرض)', 'https://aqarmap.com.eg/ar/for-sale/land-or-farm/sharqia/zagazig/',
        '2026-08-07', 'أراضي 180م و250م: 23,055 و40,000 ج/م².'],
      ['هرية رزنة', 20000, 20000, 20000, 1, 'listing', null, null, null, 0, 'listing',
        'إعلان عقارماب (سعر عرض)', 'https://aqarmap.com.eg/ar/for-sale/land-or-farm/sharqia/zagazig/',
        '2026-08-07', 'أرض 1050م: 20,000 ج/م². عينة واحدة فقط.'],
      ['دويدة', 6140, 6140, 6140, 1, 'listing', null, null, null, 0, 'listing',
        'إعلان عقارماب (سعر عرض)', 'https://aqarmap.com.eg/ar/for-sale/land-or-farm/sharqia/zagazig/',
        '2026-08-07', 'أرض 114م: 6,140 ج/م². عينة واحدة فقط.'],
      ['شرويدة', 5714, 5714, 5714, 1, 'listing', null, null, null, 0, 'listing',
        'إعلان عقارماب (سعر عرض)', 'https://aqarmap.com.eg/ar/for-sale/land-or-farm/sharqia/zagazig/',
        '2026-08-07', 'أرض 175م: 5,714 ج/م². عينة واحدة فقط.'],
      ['الزنكلون', 8571, 8571, 8571, 1, 'listing', null, null, null, 0, 'listing',
        'إعلان عقارماب (سعر عرض)', 'https://aqarmap.com.eg/ar/for-sale/land-or-farm/sharqia/zagazig/',
        '2026-08-07', 'أرض 1750م: 8,571 ج/م². عينة واحدة فقط.']
    ]
    for (const r of rows) ins.run(...r)
  }
  if (consts.c === 0) {
    const ins = db.prepare(
      `INSERT OR IGNORE INTO construction_cost (category, minCost, typicalCost, maxCost, sourceName, sourceUrl, sourceDate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    const rows: (string | number)[][] = [
      ['هيكل خرساني فقط', 3500, 4200, 5000, 'تقدير تقريبي - aqaar24 مصر 2026 (عظم)', 'https://aqaar24.com/%D8%AA%D9%83%D9%84%D9%81%D8%A9-%D8%A8%D9%86%D8%A7%D8%A1-%D9%85%D9%86%D8%B2%D9%84-250-%D9%85%D8%AA%D8%B1-%D9%81%D9%8A-%D9%85%D8%B5%D8%B1-2026-%D8%AD%D8%B3%D8%A7%D8%A8-%D8%AA%D9%81%D8%B5%D9%8A%D9%84/', '2026-03-18'],
      ['مباني + هيكل', 5000, 6000, 7000, 'تقدير تقريبي - aqaar24 مصر 2026 (بناء اقتصادي)', 'https://aqaar24.com/%D8%AA%D9%83%D9%84%D9%81%D8%A9-%D8%A8%D9%86%D8%A7%D8%A1-%D9%85%D9%86%D8%B2%D9%84-250-%D9%85%D8%AA%D8%B1-%D9%81%D9%8A-%D9%85%D8%B5%D8%B1-2026-%D8%AD%D8%B3%D8%A7%D8%A8-%D8%AA%D9%81%D8%B5%D9%8A%D9%84/', '2026-03-18'],
      ['نصف تشطيب', 5500, 6500, 7500, 'تقدير تقريبي - aqaar24 مصر 2026', 'https://aqaar24.com/%D8%AA%D9%83%D9%84%D9%81%D8%A9-%D8%A8%D9%86%D8%A7%D8%A1-%D9%85%D9%86%D8%B2%D9%84-250-%D9%85%D8%AA%D8%B1-%D9%81%D9%8A-%D9%85%D8%B5%D8%B1-2026-%D8%AD%D8%B3%D8%A7%D8%A8-%D8%AA%D9%81%D8%B5%D9%8A%D9%84/', '2026-03-18'],
      ['تشطيب متوسط', 7500, 8000, 8500, 'تقدير تقريبي - aqaar24 مصر 2026', 'https://aqaar24.com/%D8%AA%D9%83%D9%84%D9%81%D8%A9-%D8%A8%D9%86%D8%A7%D8%A1-%D9%85%D9%86%D8%B2%D9%84-250-%D9%85%D8%AA%D8%B1-%D9%81%D9%8A-%D9%85%D8%B5%D8%B1-2026-%D8%AD%D8%B3%D8%A7%D8%A8-%D8%AA%D9%81%D8%B5%D9%8A%D9%84/', '2026-03-18'],
      ['تشطيب جيد', 8000, 10000, 12000, 'تقدير تقريبي - royalhomeegy / creative3design مصر 2026', 'https://www.royalhomeegy.com/2025/07/Turnkey-Finishing-Egypt-The-Smart-Solution-for-Stress-Free-Interior-Projects.html', '2026-08-07'],
      ['تشطيب فاخر', 12000, 14000, 18000, 'تقدير تقريبي - royalhomeegy / creative3design مصر 2026', 'https://www.royalhomeegy.com/2025/07/Turnkey-Finishing-Egypt-The-Smart-Solution-for-Stress-Free-Interior-Projects.html', '2026-08-07']
    ]
    for (const r of rows) ins.run(...r)
  }
}
