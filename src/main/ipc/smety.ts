import { IpcMain } from 'electron'
import { Database } from 'sql.js'
import { run, queryAll, queryOne } from '../db'

export function registerSmetyHandlers(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle('proekty:list', () => queryAll(db, 'SELECT * FROM proekty ORDER BY sozdan DESC'))
  ipcMain.handle('proekty:create', (_, d: { nazvanie: string; zakazchik?: string; data?: string; primechaniya?: string }) =>
    run(db, 'INSERT INTO proekty (nazvanie, zakazchik, data, primechaniya) VALUES (?,?,?,?)', [d.nazvanie, d.zakazchik ?? null, d.data ?? null, d.primechaniya ?? null]))
  ipcMain.handle('proekty:update', (_, id: number, d: { nazvanie: string; zakazchik?: string; data?: string; primechaniya?: string }) =>
    run(db, 'UPDATE proekty SET nazvanie=?, zakazchik=?, data=?, primechaniya=? WHERE id=?', [d.nazvanie, d.zakazchik ?? null, d.data ?? null, d.primechaniya ?? null, id]))
  ipcMain.handle('proekty:delete', (_, id: number) => run(db, 'DELETE FROM proekty WHERE id=?', [id]))

  ipcMain.handle('smety:listByProekt', (_, proektId: number) =>
    queryAll(db, 'SELECT s.*, i.period as indeks_period, i.znachenie as indeks_znachenie FROM smety s LEFT JOIN indeksy i ON s.indeks_id = i.id WHERE s.proekt_id=?', [proektId]))
  ipcMain.handle('smety:get', (_, id: number) =>
    queryOne(db, 'SELECT s.*, i.period as indeks_period, i.znachenie as indeks_znachenie FROM smety s LEFT JOIN indeksy i ON s.indeks_id = i.id WHERE s.id=?', [id]))
  ipcMain.handle('smety:create', (_, d: { proekt_id: number; nazvanie: string; indeks_id?: number; nds_stavka: number }) =>
    run(db, 'INSERT INTO smety (proekt_id, nazvanie, indeks_id, nds_stavka) VALUES (?,?,?,?)', [d.proekt_id, d.nazvanie, d.indeks_id ?? null, d.nds_stavka]))
  ipcMain.handle('smety:update', (_, id: number, d: { nazvanie: string; indeks_id?: number; nds_stavka: number }) =>
    run(db, 'UPDATE smety SET nazvanie=?, indeks_id=?, nds_stavka=? WHERE id=?', [d.nazvanie, d.indeks_id ?? null, d.nds_stavka, id]))
  ipcMain.handle('smety:delete', (_, id: number) => run(db, 'DELETE FROM smety WHERE id=?', [id]))

  ipcMain.handle('smeta_pozicii:list', (_, smetaId: number) => {
    const rows = queryAll(db, `
      SELECT sp.*, p.nazvanie as poz_nazvanie, p.edinica as poz_edinica,
             p.tip_rabot, p.ceny, p.nomer_punkta,
             t.nazvanie as tablica_nazvanie, t.nomer as tablica_nomer,
             g.nazvanie as glava_nazvanie, s.nazvanie as spravochnik_nazvanie
      FROM smeta_pozicii sp
      LEFT JOIN pozicii p ON sp.poziciya_id = p.id
      LEFT JOIN tablicy t ON p.tablica_id = t.id
      LEFT JOIN glavy g ON t.glava_id = g.id
      LEFT JOIN spravochniki s ON g.spravochnik_id = s.id
      WHERE sp.smeta_id = ?
      ORDER BY sp.sort_order, sp.id
    `, [smetaId])
    return rows.map(row => ({
      ...row,
      koefficienty: queryAll(db, `
        SELECT k.* FROM poziciya_koefficienty pk
        JOIN koefficienty k ON pk.koefficient_id = k.id
        WHERE pk.smeta_poziciya_id = ?
      `, [row.id as number])
    }))
  })

  ipcMain.handle('smeta_pozicii:add', (_, d: {
    smeta_id: number; poziciya_id?: number; kategoriya: number; obem: number;
    nazvanie_custom?: string; edinica_custom?: string; baza_cena: number; sort_order?: number
  }) => run(db, `
    INSERT INTO smeta_pozicii (smeta_id, poziciya_id, kategoriya, obem, nazvanie_custom, edinica_custom, baza_cena, sort_order)
    VALUES (?,?,?,?,?,?,?,?)
  `, [d.smeta_id, d.poziciya_id ?? null, d.kategoriya, d.obem, d.nazvanie_custom ?? null, d.edinica_custom ?? null, d.baza_cena, d.sort_order ?? 0]))

  ipcMain.handle('smeta_pozicii:update', (_, id: number, d: { kategoriya: number; obem: number; nazvanie_custom?: string; baza_cena: number }) =>
    run(db, 'UPDATE smeta_pozicii SET kategoriya=?, obem=?, nazvanie_custom=?, baza_cena=? WHERE id=?',
      [d.kategoriya, d.obem, d.nazvanie_custom ?? null, d.baza_cena, id]))

  ipcMain.handle('smeta_pozicii:delete', (_, id: number) => run(db, 'DELETE FROM smeta_pozicii WHERE id=?', [id]))

  ipcMain.handle('smeta_pozicii:reorder', (_, _smetaId: number, orderedIds: number[]) => {
    orderedIds.forEach((id, idx) => run(db, 'UPDATE smeta_pozicii SET sort_order=? WHERE id=?', [idx, id]))
    return { ok: true }
  })

  ipcMain.handle('poziciya_koefficienty:set', (_, smetaPozId: number, koeffIds: number[]) => {
    run(db, 'DELETE FROM poziciya_koefficienty WHERE smeta_poziciya_id=?', [smetaPozId])
    koeffIds.forEach(kid => run(db, 'INSERT INTO poziciya_koefficienty (smeta_poziciya_id, koefficient_id) VALUES (?,?)', [smetaPozId, kid]))
    return { ok: true }
  })
}
