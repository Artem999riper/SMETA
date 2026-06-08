import initSqlJs, { Database, SqlJsStatic } from 'sql.js'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let db: Database
let SQL: SqlJsStatic
let dbPath: string

export async function initDb(): Promise<Database> {
  if (db) return db

  // sql.js needs the path to the .wasm file
  const wasmPath = path.join(app.getAppPath(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  SQL = await initSqlJs({ locateFile: () => wasmPath })

  dbPath = path.join(app.getPath('userData'), 'smeta-sbc.db')

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')
  migrate(db)
  save()
  return db
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function save(): void {
  if (!db || !dbPath) return
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
}

function migrate(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS spravochniki (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kod TEXT NOT NULL,
      nazvanie TEXT NOT NULL,
      god INTEGER,
      redakciya TEXT
    );
    CREATE TABLE IF NOT EXISTS glavy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spravochnik_id INTEGER NOT NULL REFERENCES spravochniki(id) ON DELETE CASCADE,
      nomer TEXT NOT NULL,
      nazvanie TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tablicy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      glava_id INTEGER NOT NULL REFERENCES glavy(id) ON DELETE CASCADE,
      nomer TEXT NOT NULL,
      nazvanie TEXT NOT NULL,
      edinica TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS pozicii (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tablica_id INTEGER NOT NULL REFERENCES tablicy(id) ON DELETE CASCADE,
      nomer_punkta TEXT NOT NULL,
      nazvanie TEXT NOT NULL,
      edinica TEXT NOT NULL DEFAULT '',
      tip_rabot TEXT NOT NULL DEFAULT 'all',
      ceny TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS koefficienty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kod TEXT NOT NULL,
      nazvanie TEXT NOT NULL,
      znachenie REAL NOT NULL,
      uslovie TEXT,
      k_chemu TEXT NOT NULL DEFAULT 'all'
    );
    CREATE TABLE IF NOT EXISTS indeksy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period TEXT NOT NULL,
      znachenie REAL NOT NULL,
      istochnik TEXT
    );
    CREATE TABLE IF NOT EXISTS proekty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nazvanie TEXT NOT NULL,
      zakazchik TEXT,
      data TEXT,
      primechaniya TEXT,
      sozdan TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS smety (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proekt_id INTEGER NOT NULL REFERENCES proekty(id) ON DELETE CASCADE,
      nazvanie TEXT NOT NULL,
      indeks_id INTEGER REFERENCES indeksy(id),
      nds_stavka REAL NOT NULL DEFAULT 20
    );
    CREATE TABLE IF NOT EXISTS smeta_pozicii (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      smeta_id INTEGER NOT NULL REFERENCES smety(id) ON DELETE CASCADE,
      poziciya_id INTEGER REFERENCES pozicii(id),
      kategoriya INTEGER NOT NULL DEFAULT 1,
      obem REAL NOT NULL DEFAULT 1,
      nazvanie_custom TEXT,
      edinica_custom TEXT,
      baza_cena REAL NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS poziciya_koefficienty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      smeta_poziciya_id INTEGER NOT NULL REFERENCES smeta_pozicii(id) ON DELETE CASCADE,
      koefficient_id INTEGER NOT NULL REFERENCES koefficienty(id)
    );
  `)
}

// sql.js cannot bind `undefined` (and rejects other non-primitive types).
// Normalize every param to a value SQLite accepts: undefined → null,
// booleans → 0/1, objects → JSON string.
function sanitize(params: unknown[]): (string | number | Uint8Array | null)[] {
  return params.map((p) => {
    if (p === undefined || p === null) return null
    if (typeof p === 'boolean') return p ? 1 : 0
    if (typeof p === 'number' || typeof p === 'string') return p
    if (p instanceof Uint8Array) return p
    return JSON.stringify(p)
  })
}

export function run(db: Database, sql: string, params: unknown[] = []): { lastInsertRowid: number; changes: number } {
  db.run(sql, sanitize(params) as never[])
  save()
  const lastId = db.exec('SELECT last_insert_rowid() as id')
  return {
    lastInsertRowid: (lastId[0]?.values[0]?.[0] as number) ?? 0,
    changes: 1
  }
}

export function queryAll(db: Database, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const res = db.exec(sql, sanitize(params) as never[])
  if (!res.length) return []
  const { columns, values } = res[0]
  return values.map(row => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, i) => { obj[col] = row[i] })
    return obj
  })
}

export function queryOne(db: Database, sql: string, params: unknown[] = []): Record<string, unknown> | undefined {
  return queryAll(db, sql, params)[0]
}

export function seedIfEmpty(db: Database): void {
  const row = queryOne(db, 'SELECT COUNT(*) as c FROM spravochniki')
  if ((row?.c as number) > 0) return

  const r1 = run(db, 'INSERT INTO spravochniki (kod, nazvanie, god, redakciya) VALUES (?, ?, ?, ?)',
    ['IGI-2012', 'Инженерно-геодезические изыскания (ИГИ)', 2012, 'Ред. 1'])

  const g1 = run(db, 'INSERT INTO glavy (spravochnik_id, nomer, nazvanie) VALUES (?, ?, ?)', [r1.lastInsertRowid, '1', 'Топографо-геодезические работы'])
  const g2 = run(db, 'INSERT INTO glavy (spravochnik_id, nomer, nazvanie) VALUES (?, ?, ?)', [r1.lastInsertRowid, '2', 'Камеральная обработка'])

  const t11 = run(db, 'INSERT INTO tablicy (glava_id, nomer, nazvanie, edinica) VALUES (?, ?, ?, ?)', [g1.lastInsertRowid, '1.1', 'Создание планово-высотного обоснования', 'точка'])
  const t12 = run(db, 'INSERT INTO tablicy (glava_id, nomer, nazvanie, edinica) VALUES (?, ?, ?, ?)', [g1.lastInsertRowid, '1.2', 'Топографическая съёмка масштаба 1:500', 'кв.км'])
  const t21 = run(db, 'INSERT INTO tablicy (glava_id, nomer, nazvanie, edinica) VALUES (?, ?, ?, ?)', [g2.lastInsertRowid, '2.1', 'Составление топографического плана', 'кв.км'])

  const pSql = 'INSERT INTO pozicii (tablica_id, nomer_punkta, nazvanie, edinica, tip_rabot, ceny) VALUES (?, ?, ?, ?, ?, ?)'
  run(db, pSql, [t11.lastInsertRowid, '1.1.1', 'Теодолитный ход I разряда', 'точка', 'field', JSON.stringify({ 1: 850, 2: 1020, 3: 1250 })])
  run(db, pSql, [t11.lastInsertRowid, '1.1.2', 'Нивелирование IV класса', 'точка', 'field', JSON.stringify({ 1: 620, 2: 750, 3: 920 })])
  run(db, pSql, [t11.lastInsertRowid, '1.1.3', 'GPS-измерения', 'точка', 'field', JSON.stringify({ 1: 1100, 2: 1350, 3: 1600 })])
  run(db, pSql, [t12.lastInsertRowid, '1.2.1', 'Топографическая съёмка застроенной территории', 'кв.км', 'field', JSON.stringify({ 1: 45000, 2: 55000, 3: 68000 })])
  run(db, pSql, [t12.lastInsertRowid, '1.2.2', 'Топографическая съёмка незастроенной территории', 'кв.км', 'field', JSON.stringify({ 1: 32000, 2: 40000, 3: 50000 })])
  run(db, pSql, [t21.lastInsertRowid, '2.1.1', 'Составление плана в масштабе 1:500', 'кв.км', 'office', JSON.stringify({ 1: 18000, 2: 22000, 3: 27000 })])
  run(db, pSql, [t21.lastInsertRowid, '2.1.2', 'Составление плана в масштабе 1:1000', 'кв.км', 'office', JSON.stringify({ 1: 14000, 2: 17000, 3: 21000 })])
  run(db, pSql, [t21.lastInsertRowid, '2.1.3', 'Цифровое моделирование рельефа', 'кв.км', 'office', JSON.stringify({ 1: 8000, 2: 10000, 3: 12500 })])

  const kSql = 'INSERT INTO koefficienty (kod, nazvanie, znachenie, uslovie, k_chemu) VALUES (?, ?, ?, ?, ?)'
  run(db, kSql, ['K_NBP', 'Неблагоприятный период (осень-зима)', 1.25, 'При производстве работ в осенне-зимний период', 'field'])
  run(db, kSql, ['K_TRD', 'Труднодоступность района', 1.40, 'При производстве работ в труднодоступных районах', 'all'])
  run(db, kSql, ['K_POV', 'Повторные работы', 0.85, 'При выполнении повторных (контрольных) работ', 'all'])
  run(db, kSql, ['K_NSP', 'Стеснённые условия (городская застройка)', 1.15, 'При работе в условиях плотной городской застройки', 'field'])
  run(db, kSql, ['K_ENZ', 'Экологически неблагополучный район', 1.20, 'При работе в экологически неблагополучных районах', 'all'])

  const iSql = 'INSERT INTO indeksy (period, znachenie, istochnik) VALUES (?, ?, ?)'
  run(db, iSql, ['I кв. 2024', 8.32, 'Письмо Минстроя России №7958-ИФ/09 от 22.02.2024'])
  run(db, iSql, ['II кв. 2024', 8.57, 'Письмо Минстроя России №23539-ИФ/09 от 21.05.2024'])
  run(db, iSql, ['III кв. 2024', 8.78, 'Письмо Минстроя России №42738-ИФ/09 от 20.08.2024'])
  const r4 = run(db, iSql, ['IV кв. 2024', 9.05, 'Письмо Минстроя России №59421-ИФ/09 от 19.11.2024'])

  const proId = run(db, 'INSERT INTO proekty (nazvanie, zakazchik, data, primechaniya) VALUES (?, ?, ?, ?)',
    ['Инженерно-геодезические изыскания под строительство ЖК "Пример"', 'ООО "СтройИнвест"', '2024-03-15', 'Демонстрационный проект'])
  run(db, 'INSERT INTO smety (proekt_id, nazvanie, indeks_id, nds_stavka) VALUES (?, ?, ?, ?)',
    [proId.lastInsertRowid, 'Смета на ИГИ', r4.lastInsertRowid, 20])
}
