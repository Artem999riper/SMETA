import { IpcMain, dialog } from 'electron'
import { Database } from 'sql.js'
import { queryAll, queryOne } from '../db'
import fs from 'fs'

export function registerExportHandlers(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle('export:saveDialog', (_, defaultName: string, type: 'xlsx' | 'pdf') =>
    dialog.showSaveDialog({
      title: 'Сохранить файл',
      defaultPath: defaultName,
      filters: type === 'xlsx'
        ? [{ name: 'Excel файлы', extensions: ['xlsx'] }]
        : [{ name: 'PDF файлы', extensions: ['pdf'] }]
    }))

  ipcMain.handle('export:writeFile', (_, filePath: string, base64Data: string) => {
    try {
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  ipcMain.handle('export:getSmetaData', (_, smetaId: number) => {
    const smeta = queryOne(db, `
      SELECT s.*, i.period as indeks_period, i.znachenie as indeks_znachenie,
             p.nazvanie as proekt_nazvanie, p.zakazchik
      FROM smety s
      LEFT JOIN indeksy i ON s.indeks_id = i.id
      LEFT JOIN proekty p ON s.proekt_id = p.id
      WHERE s.id = ?
    `, [smetaId])
    if (!smeta) return null

    const pozicii = queryAll(db, `
      SELECT sp.*, p.nazvanie as poz_nazvanie, p.edinica as poz_edinica,
             p.tip_rabot, p.ceny, p.nomer_punkta,
             t.nazvanie as tablica_nazvanie, g.nazvanie as glava_nazvanie
      FROM smeta_pozicii sp
      LEFT JOIN pozicii p ON sp.poziciya_id = p.id
      LEFT JOIN tablicy t ON p.tablica_id = t.id
      LEFT JOIN glavy g ON t.glava_id = g.id
      WHERE sp.smeta_id = ?
      ORDER BY sp.sort_order, sp.id
    `, [smetaId])

    return {
      smeta,
      pozicii: pozicii.map(row => ({
        ...row,
        koefficienty: queryAll(db, `
          SELECT k.* FROM poziciya_koefficienty pk JOIN koefficienty k ON pk.koefficient_id = k.id
          WHERE pk.smeta_poziciya_id = ?
        `, [row.id as number])
      }))
    }
  })
}
