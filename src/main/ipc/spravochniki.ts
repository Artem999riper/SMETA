import { IpcMain } from 'electron'
import { Database } from 'sql.js'
import { run, queryAll, queryOne } from '../db'

export function registerSpravochnikiHandlers(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle('spravochniki:list', () => queryAll(db, 'SELECT * FROM spravochniki ORDER BY nazvanie'))
  ipcMain.handle('spravochniki:get', (_, id: number) => queryOne(db, 'SELECT * FROM spravochniki WHERE id = ?', [id]))
  ipcMain.handle('spravochniki:create', (_, d: { kod: string; nazvanie: string; god?: number; redakciya?: string }) =>
    run(db, 'INSERT INTO spravochniki (kod, nazvanie, god, redakciya) VALUES (?, ?, ?, ?)', [d.kod, d.nazvanie, d.god ?? null, d.redakciya ?? null]))
  ipcMain.handle('spravochniki:update', (_, id: number, d: { kod: string; nazvanie: string; god?: number; redakciya?: string }) =>
    run(db, 'UPDATE spravochniki SET kod=?, nazvanie=?, god=?, redakciya=? WHERE id=?', [d.kod, d.nazvanie, d.god ?? null, d.redakciya ?? null, id]))
  ipcMain.handle('spravochniki:delete', (_, id: number) => run(db, 'DELETE FROM spravochniki WHERE id=?', [id]))

  ipcMain.handle('glavy:list', (_, sprId: number) => queryAll(db, 'SELECT * FROM glavy WHERE spravochnik_id=? ORDER BY nomer', [sprId]))
  ipcMain.handle('glavy:create', (_, d: { spravochnik_id: number; nomer: string; nazvanie: string }) =>
    run(db, 'INSERT INTO glavy (spravochnik_id, nomer, nazvanie) VALUES (?,?,?)', [d.spravochnik_id, d.nomer, d.nazvanie]))
  ipcMain.handle('glavy:update', (_, id: number, d: { nomer: string; nazvanie: string }) =>
    run(db, 'UPDATE glavy SET nomer=?, nazvanie=? WHERE id=?', [d.nomer, d.nazvanie, id]))
  ipcMain.handle('glavy:delete', (_, id: number) => run(db, 'DELETE FROM glavy WHERE id=?', [id]))

  ipcMain.handle('tablicy:list', (_, glavaId: number) => queryAll(db, 'SELECT * FROM tablicy WHERE glava_id=? ORDER BY nomer', [glavaId]))
  ipcMain.handle('tablicy:create', (_, d: { glava_id: number; nomer: string; nazvanie: string; edinica: string }) =>
    run(db, 'INSERT INTO tablicy (glava_id, nomer, nazvanie, edinica) VALUES (?,?,?,?)', [d.glava_id, d.nomer, d.nazvanie, d.edinica]))
  ipcMain.handle('tablicy:update', (_, id: number, d: { nomer: string; nazvanie: string; edinica: string }) =>
    run(db, 'UPDATE tablicy SET nomer=?, nazvanie=?, edinica=? WHERE id=?', [d.nomer, d.nazvanie, d.edinica, id]))
  ipcMain.handle('tablicy:delete', (_, id: number) => run(db, 'DELETE FROM tablicy WHERE id=?', [id]))

  ipcMain.handle('pozicii:list', (_, tablicaId: number) => queryAll(db, 'SELECT * FROM pozicii WHERE tablica_id=? ORDER BY nomer_punkta', [tablicaId]))
  ipcMain.handle('pozicii:search', (_, query: string) => {
    const q = `%${query}%`
    return queryAll(db, `
      SELECT p.*, t.nazvanie as tablica_nazvanie, t.nomer as tablica_nomer,
             g.nazvanie as glava_nazvanie, s.nazvanie as spravochnik_nazvanie
      FROM pozicii p
      JOIN tablicy t ON p.tablica_id = t.id
      JOIN glavy g ON t.glava_id = g.id
      JOIN spravochniki s ON g.spravochnik_id = s.id
      WHERE p.nazvanie LIKE ? OR p.nomer_punkta LIKE ?
      LIMIT 50
    `, [q, q])
  })
  ipcMain.handle('pozicii:create', (_, d: { tablica_id: number; nomer_punkta: string; nazvanie: string; edinica: string; tip_rabot: string; ceny: Record<string, number> }) =>
    run(db, 'INSERT INTO pozicii (tablica_id, nomer_punkta, nazvanie, edinica, tip_rabot, ceny) VALUES (?,?,?,?,?,?)',
      [d.tablica_id, d.nomer_punkta, d.nazvanie, d.edinica, d.tip_rabot, JSON.stringify(d.ceny)]))
  ipcMain.handle('pozicii:update', (_, id: number, d: { nomer_punkta: string; nazvanie: string; edinica: string; tip_rabot: string; ceny: Record<string, number> }) =>
    run(db, 'UPDATE pozicii SET nomer_punkta=?, nazvanie=?, edinica=?, tip_rabot=?, ceny=? WHERE id=?',
      [d.nomer_punkta, d.nazvanie, d.edinica, d.tip_rabot, JSON.stringify(d.ceny), id]))
  ipcMain.handle('pozicii:delete', (_, id: number) => run(db, 'DELETE FROM pozicii WHERE id=?', [id]))

  ipcMain.handle('koefficienty:list', () => queryAll(db, 'SELECT * FROM koefficienty ORDER BY kod'))
  ipcMain.handle('koefficienty:create', (_, d: { kod: string; nazvanie: string; znachenie: number; uslovie?: string; k_chemu: string }) =>
    run(db, 'INSERT INTO koefficienty (kod, nazvanie, znachenie, uslovie, k_chemu) VALUES (?,?,?,?,?)', [d.kod, d.nazvanie, d.znachenie, d.uslovie ?? null, d.k_chemu]))
  ipcMain.handle('koefficienty:update', (_, id: number, d: { kod: string; nazvanie: string; znachenie: number; uslovie?: string; k_chemu: string }) =>
    run(db, 'UPDATE koefficienty SET kod=?, nazvanie=?, znachenie=?, uslovie=?, k_chemu=? WHERE id=?', [d.kod, d.nazvanie, d.znachenie, d.uslovie ?? null, d.k_chemu, id]))
  ipcMain.handle('koefficienty:delete', (_, id: number) => run(db, 'DELETE FROM koefficienty WHERE id=?', [id]))

  ipcMain.handle('indeksy:list', () => queryAll(db, 'SELECT * FROM indeksy ORDER BY id DESC'))
  ipcMain.handle('indeksy:create', (_, d: { period: string; znachenie: number; istochnik?: string }) =>
    run(db, 'INSERT INTO indeksy (period, znachenie, istochnik) VALUES (?,?,?)', [d.period, d.znachenie, d.istochnik ?? null]))
  ipcMain.handle('indeksy:update', (_, id: number, d: { period: string; znachenie: number; istochnik?: string }) =>
    run(db, 'UPDATE indeksy SET period=?, znachenie=?, istochnik=? WHERE id=?', [d.period, d.znachenie, d.istochnik ?? null, id]))
  ipcMain.handle('indeksy:delete', (_, id: number) => run(db, 'DELETE FROM indeksy WHERE id=?', [id]))
}
