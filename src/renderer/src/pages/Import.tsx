import { useEffect, useState } from 'react'

const api = window.api

interface Spravochnik { id: number; nazvanie: string; kod: string }
interface Glava { id: number; nazvanie: string; nomer: string }
interface Tablica { id: number; nazvanie: string; nomer: string; edinica: string }

interface PreviewRow {
  nomer_punkta: string
  nazvanie: string
  edinica: string
  tip_rabot: string
  ceny: Record<string, number>
}

export default function ImportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [filePath, setFilePath] = useState('')
  const [fileName, setFileName] = useState('')
  const [sheets, setSheets] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({
    nomer: '', nazvanie: '', edinica: '', tip_rabot: '',
    cena_1: '', cena_2: '', cena_3: '', cena_4: '', cena_5: ''
  })

  const [spravochniki, setSpravochniki] = useState<Spravochnik[]>([])
  const [glavy, setGlavy] = useState<Glava[]>([])
  const [tablicy, setTablicy] = useState<Tablica[]>([])
  const [selSpr, setSelSpr] = useState('')
  const [selGlava, setSelGlava] = useState('')
  const [selTab, setSelTab] = useState('')
  const [defaultTipRabot, setDefaultTipRabot] = useState('field')

  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; count?: number; error?: string } | null>(null)

  useEffect(() => { loadSpr() }, [])
  useEffect(() => { if (selSpr) api.glavy.list(parseInt(selSpr)).then(setGlavy) }, [selSpr])
  useEffect(() => { if (selGlava) api.tablicy.list(parseInt(selGlava)).then(setTablicy) }, [selGlava])

  async function loadSpr() { setSpravochniki(await api.spravochniki.list()) }

  async function pickFile() {
    const res = await api.import.openFileDialog()
    if (res.canceled || !res.filePaths?.[0]) return
    const fp = res.filePaths[0]
    setFilePath(fp)
    setFileName(fp.split(/[\\/]/).pop() || fp)

    const fileRes = await api.import.readFile(fp)
    if (!fileRes.ok) { alert('Ошибка чтения файла: ' + fileRes.error); return }

    const { default: XLSX } = await import('xlsx')
    const wb = XLSX.read(fileRes.data, { type: 'base64' })
    setSheets(wb.SheetNames)
    setSelectedSheet(wb.SheetNames[0])
    loadSheet(wb, wb.SheetNames[0])
  }

  async function loadSheet(wb: unknown, sheetName: string) {
    const { default: XLSX } = await import('xlsx')
    const ws = (wb as ReturnType<typeof XLSX.read>).Sheets[sheetName]
    const aoa: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    if (aoa.length === 0) return
    setHeaders(aoa[0].map(String))
    setRawRows(aoa.slice(1).filter(r => r.some(c => c !== '')))
    setStep(2)
  }

  async function reloadSheet(sheetName: string) {
    setSelectedSheet(sheetName)
    const fileRes = await api.import.readFile(filePath)
    if (!fileRes.ok) return
    const { default: XLSX } = await import('xlsx')
    const wb = XLSX.read(fileRes.data, { type: 'base64' })
    loadSheet(wb, sheetName)
  }

  function buildPreview(): PreviewRow[] {
    return rawRows.slice(0, 20).map(row => {
      const get = (col: string) => col ? String(row[headers.indexOf(col)] ?? '') : ''
      const ceny: Record<string, number> = {}
      for (let k = 1; k <= 5; k++) {
        const col = mapping[`cena_${k}`]
        if (col) { const v = parseFloat(get(col)); if (!isNaN(v) && v > 0) ceny[String(k)] = v }
      }
      return {
        nomer_punkta: get(mapping.nomer),
        nazvanie: get(mapping.nazvanie),
        edinica: get(mapping.edinica),
        tip_rabot: defaultTipRabot,
        ceny
      }
    })
  }

  function goPreview() {
    if (!mapping.nazvanie) { alert('Выберите хотя бы колонку "Наименование"'); return }
    setPreview(buildPreview())
    setStep(3)
  }

  async function doImport() {
    if (!selTab) { alert('Выберите целевую таблицу'); return }
    setImporting(true)

    const allRows = rawRows.map(row => {
      const get = (col: string) => col ? String(row[headers.indexOf(col)] ?? '') : ''
      const ceny: Record<string, number> = {}
      for (let k = 1; k <= 5; k++) {
        const col = mapping[`cena_${k}`]
        if (col) { const v = parseFloat(get(col)); if (!isNaN(v) && v > 0) ceny[String(k)] = v }
      }
      return {
        nomer_punkta: get(mapping.nomer) || String(rawRows.indexOf(row) + 1),
        nazvanie: get(mapping.nazvanie),
        edinica: get(mapping.edinica),
        tip_rabot: defaultTipRabot,
        ceny
      }
    }).filter(r => r.nazvanie.trim() !== '')

    const res = await api.import.savePozicii({ tablica_id: parseInt(selTab), rows: allRows })
    setImporting(false)
    setResult(res)
  }

  function reset() {
    setStep(1); setFilePath(''); setFileName(''); setResult(null)
    setSheets([]); setRawRows([]); setHeaders([]); setPreview([])
    setMapping({ nomer: '', nazvanie: '', edinica: '', tip_rabot: '', cena_1: '', cena_2: '', cena_3: '', cena_4: '', cena_5: '' })
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Импорт данных из Excel / CSV</h1>

      {/* Прогресс */}
      <div className="flex items-center gap-2 mb-8">
        {['Выбор файла', 'Маппинг колонок', 'Предпросмотр и импорт'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>{label}</span>
            {i < 2 && <div className="w-8 h-px bg-slate-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* Шаг 1 */}
      {step === 1 && (
        <div className="max-w-lg">
          <div
            onClick={pickFile}
            className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="text-4xl mb-3">📂</div>
            <div className="font-semibold text-slate-700">Нажмите для выбора файла</div>
            <div className="text-sm text-slate-400 mt-1">Поддерживаются .xlsx, .xls, .csv</div>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            <p className="font-medium mb-2">Ожидаемая структура файла:</p>
            <p>Таблица с колонками: номер пункта, наименование работы, единица измерения, цена по категориям сложности (отдельная колонка на каждую категорию)</p>
          </div>
        </div>
      )}

      {/* Шаг 2 */}
      {step === 2 && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <div className="text-sm font-medium text-slate-700 mb-1">Файл: <span className="text-blue-600">{fileName}</span></div>
            {sheets.length > 1 && (
              <div className="mt-3">
                <label className="text-sm text-slate-600">Лист:</label>
                <select className="input ml-2 w-48" value={selectedSheet} onChange={e => reloadSheet(e.target.value)}>
                  {sheets.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <div className="font-semibold text-slate-700 mb-3">Маппинг колонок</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'nomer', label: 'Номер пункта' },
                { key: 'nazvanie', label: 'Наименование *' },
                { key: 'edinica', label: 'Единица измерения' },
                { key: 'cena_1', label: 'Цена кат. 1' },
                { key: 'cena_2', label: 'Цена кат. 2' },
                { key: 'cena_3', label: 'Цена кат. 3' },
                { key: 'cena_4', label: 'Цена кат. 4' },
                { key: 'cena_5', label: 'Цена кат. 5' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-slate-600">{label}</label>
                  <select className="input text-sm" value={mapping[key] || ''} onChange={e => setMapping({ ...mapping, [key]: e.target.value })}>
                    <option value="">— не выбрано —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <label className="text-xs text-slate-600">Тип работ по умолчанию</label>
              <select className="input text-sm w-48" value={defaultTipRabot} onChange={e => setDefaultTipRabot(e.target.value)}>
                <option value="field">Полевые</option>
                <option value="office">Камеральные</option>
                <option value="all">Все</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <div className="font-semibold text-slate-700 mb-3">Куда импортировать</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-600">Справочник</label>
                <select className="input text-sm" value={selSpr} onChange={e => { setSelSpr(e.target.value); setSelGlava(''); setSelTab('') }}>
                  <option value="">— выберите —</option>
                  {spravochniki.map(s => <option key={s.id} value={s.id}>{s.nazvanie}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Глава</label>
                <select className="input text-sm" value={selGlava} onChange={e => { setSelGlava(e.target.value); setSelTab('') }} disabled={!selSpr}>
                  <option value="">— выберите —</option>
                  {glavy.map(g => <option key={g.id} value={g.id}>Гл. {g.nomer} {g.nazvanie}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Таблица</label>
                <select className="input text-sm" value={selTab} onChange={e => setSelTab(e.target.value)} disabled={!selGlava}>
                  <option value="">— выберите —</option>
                  {tablicy.map(t => <option key={t.id} value={t.id}>Табл. {t.nomer} {t.nazvanie}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="btn-secondary px-4 py-2">← Назад</button>
            <button onClick={goPreview} className="btn-primary px-4 py-2">Предпросмотр →</button>
          </div>
        </div>
      )}

      {/* Шаг 3 */}
      {step === 3 && !result && (
        <div>
          <div className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
              Предпросмотр (первые 20 строк из {rawRows.length})
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 text-left text-slate-600 w-20">Номер</th>
                    <th className="p-2 text-left text-slate-600">Наименование</th>
                    <th className="p-2 text-left text-slate-600 w-20">Ед.</th>
                    <th className="p-2 text-left text-slate-600 w-24">Тип работ</th>
                    <th className="p-2 text-left text-slate-600">Цены (по кат.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 text-slate-500">{r.nomer_punkta}</td>
                      <td className="p-2 text-slate-800">{r.nazvanie}</td>
                      <td className="p-2 text-slate-500">{r.edinica}</td>
                      <td className="p-2 text-slate-500">{r.tip_rabot}</td>
                      <td className="p-2 text-slate-600">{Object.entries(r.ceny).map(([k, v]) => `К${k}: ${v}`).join(' | ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
            Будет импортировано <strong>{rawRows.filter(r => r.some(c => c !== '')).length}</strong> строк в выбранную таблицу.
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-secondary px-4 py-2">← Назад</button>
            <button onClick={doImport} disabled={importing} className="btn-primary px-4 py-2">
              {importing ? 'Импортирование...' : '✓ Импортировать'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className={`max-w-md rounded-xl p-6 ${result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {result.ok ? (
            <>
              <div className="text-green-700 font-bold text-lg mb-2">✓ Импорт выполнен</div>
              <div className="text-green-600">Добавлено расценок: <strong>{result.count}</strong></div>
            </>
          ) : (
            <>
              <div className="text-red-700 font-bold text-lg mb-2">✗ Ошибка импорта</div>
              <div className="text-red-600 text-sm">{result.error}</div>
            </>
          )}
          <button onClick={reset} className="btn-primary mt-4 px-4 py-2 text-sm">Импортировать ещё</button>
        </div>
      )}
    </div>
  )
}
