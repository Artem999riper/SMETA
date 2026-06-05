import { IpcMain, dialog } from 'electron'
import { Database } from 'sql.js'
import { run } from '../db'
import fs from 'fs'
import path from 'path'

export function registerImportHandlers(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle('import:openFileDialog', () =>
    dialog.showOpenDialog({
      title: 'Выберите файл для импорта',
      filters: [
        { name: 'Excel файлы', extensions: ['xlsx', 'xls'] },
        { name: 'CSV файлы', extensions: ['csv'] },
        { name: 'Все файлы', extensions: ['*'] }
      ],
      properties: ['openFile']
    }))

  ipcMain.handle('import:readFile', (_, filePath: string) => {
    try {
      return { ok: true, data: fs.readFileSync(filePath).toString('base64'), ext: path.extname(filePath).toLowerCase() }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  ipcMain.handle('import:savePozicii', (_, data: {
    tablica_id: number
    rows: Array<{ nomer_punkta: string; nazvanie: string; edinica: string; tip_rabot: string; ceny: Record<string, number> }>
  }) => {
    try {
      for (const r of data.rows) {
        run(db, 'INSERT INTO pozicii (tablica_id, nomer_punkta, nazvanie, edinica, tip_rabot, ceny) VALUES (?,?,?,?,?,?)',
          [data.tablica_id, r.nomer_punkta, r.nazvanie, r.edinica, r.tip_rabot, JSON.stringify(r.ceny)])
      }
      return { ok: true, count: data.rows.length }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  ipcMain.handle('import:writeFile', (_, filePath: string, base64Data: string) => {
    try {
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })
}
