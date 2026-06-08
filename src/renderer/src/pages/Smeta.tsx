import { useEffect, useState, useCallback, ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadXlsx, loadJsPdf, loadAutoTable } from '../lib/deps'

const api = window.api

interface SmetaInfo {
  id: number
  nazvanie: string
  indeks_id: number | null
  indeks_period: string | null
  indeks_znachenie: number | null
  nds_stavka: number
  proekt_nazvanie?: string
  zakazchik?: string
}

interface Koef {
  id: number
  kod: string
  nazvanie: string
  znachenie: number
  k_chemu: string
}

interface Poziciya {
  id: number
  smeta_id: number
  poziciya_id: number | null
  kategoriya: number
  obem: number
  baza_cena: number
  nazvanie_custom: string | null
  poz_nazvanie: string | null
  poz_edinica: string | null
  edinica_custom: string | null
  tip_rabot: string | null
  ceny: string | null
  nomer_punkta: string | null
  tablica_nomer: string | null
  glava_nazvanie: string | null
  koefficienty: Koef[]
}

interface SearchResult {
  id: number
  nomer_punkta: string
  nazvanie: string
  edinica: string
  tip_rabot: string
  ceny: string
  tablica_nazvanie: string
  tablica_nomer: string
  glava_nazvanie: string
  spravochnik_nazvanie: string
}

interface Indeks {
  id: number
  period: string
  znachenie: number
}

function calcPoz(poz: Poziciya, indeks: number): { stoimost: number; koefProduct: number } {
  let baza = poz.baza_cena
  if (poz.ceny) {
    try {
      const cenyObj = JSON.parse(poz.ceny)
      const v = cenyObj[String(poz.kategoriya)]
      if (v !== undefined) baza = v
    } catch {}
  }
  const koefProduct = poz.koefficienty.reduce((acc, k) => acc * k.znachenie, 1)
  return { stoimost: baza * poz.obem * koefProduct * indeks, koefProduct }
}

export default function SmetaPage() {
  const { id } = useParams<{ id: string }>()
  const smetaId = parseInt(id!)
  const navigate = useNavigate()

  const [smeta, setSmeta] = useState<SmetaInfo | null>(null)
  const [pozicii, setPozicii] = useState<Poziciya[]>([])
  const [allKoef, setAllKoef] = useState<Koef[]>([])
  const [indeksy, setIndeksy] = useState<Indeks[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editKoefId, setEditKoefId] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ nazvanie: '', indeks_id: '', nds_stavka: '20' })

  useEffect(() => { loadAll() }, [smetaId])

  async function loadAll() {
    const [s, p, k, idx] = await Promise.all([
      api.smety.get(smetaId),
      api.smetaPozicii.list(smetaId),
      api.koefficienty.list(),
      api.indeksy.list(),
    ])
    setSmeta(s)
    setPozicii(p)
    setAllKoef(k)
    setIndeksy(idx)
    setSettingsForm({
      nazvanie: s.nazvanie,
      indeks_id: String(s.indeks_id || ''),
      nds_stavka: String(s.nds_stavka)
    })
  }

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); return }
    const res = await api.pozicii.search(q)
    setSearchResults(res)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  async function addPoziciya(sr: SearchResult, kategoriya: number) {
    let bazaCena = 0
    try { bazaCena = JSON.parse(sr.ceny)[String(kategoriya)] || 0 } catch {}
    await api.smetaPozicii.add({
      smeta_id: smetaId,
      poziciya_id: sr.id,
      kategoriya,
      obem: 1,
      baza_cena: bazaCena,
      sort_order: pozicii.length
    })
    setShowSearch(false)
    setSearchQuery('')
    loadPozicii()
  }

  async function loadPozicii() {
    const p = await api.smetaPozicii.list(smetaId)
    setPozicii(p)
  }

  async function updatePoz(poz: Poziciya, field: 'kategoriya' | 'obem', value: number) {
    let bazaCena = poz.baza_cena
    const newKat = field === 'kategoriya' ? value : poz.kategoriya
    if (poz.ceny) {
      try { bazaCena = JSON.parse(poz.ceny)[String(newKat)] || 0 } catch {}
    }
    await api.smetaPozicii.update(poz.id, {
      kategoriya: newKat,
      obem: field === 'obem' ? value : poz.obem,
      nazvanie_custom: poz.nazvanie_custom || undefined,
      baza_cena: bazaCena
    })
    loadPozicii()
  }

  async function deletePoz(id: number) {
    await api.smetaPozicii.delete(id)
    loadPozicii()
  }

  async function saveKoef(poz: Poziciya, koefIds: number[]) {
    await api.poziciyaKoefficienty.set(poz.id, koefIds)
    setEditKoefId(null)
    loadPozicii()
  }

  async function saveSettings() {
    await api.smety.update(smetaId, {
      nazvanie: settingsForm.nazvanie,
      indeks_id: settingsForm.indeks_id ? parseInt(settingsForm.indeks_id) : undefined,
      nds_stavka: parseFloat(settingsForm.nds_stavka) || 20
    })
    setShowSettings(false)
    loadAll()
  }

  // Итоги
  const indeksZnachenie = smeta?.indeks_znachenie || 1
  let totalField = 0, totalOffice = 0, totalAll = 0
  pozicii.forEach(p => {
    const { stoimost } = calcPoz(p, indeksZnachenie)
    if (p.tip_rabot === 'field') totalField += stoimost
    else if (p.tip_rabot === 'office') totalOffice += stoimost
    else totalAll += stoimost
  })
  const total = totalField + totalOffice + totalAll
  const nds = total * ((smeta?.nds_stavka || 20) / 100)
  const totalWithNds = total + nds

  function fmt(n: number) {
    return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  if (!smeta) return <div className="p-8 text-slate-400">Загрузка...</div>

  return (
    <div className="flex flex-col h-full">
      {/* Заголовок */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/proekty')} className="text-slate-400 hover:text-slate-600 text-lg">←</button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-900">{smeta.nazvanie}</h1>
          <div className="text-sm text-slate-500">
            Индекс: {smeta.indeks_period ? `${smeta.indeks_period} (×${smeta.indeks_znachenie})` : 'не выбран'}
            {' · '}НДС {smeta.nds_stavka}%
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="btn-secondary text-sm px-3 py-1.5">Настройки</button>
        <ExportButtons smetaId={smetaId} smetaName={smeta.nazvanie} />
      </div>

      {/* Кнопка добавления */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
        <button onClick={() => setShowSearch(true)} className="btn-primary text-sm px-4 py-2">
          + Добавить расценку из справочника
        </button>
      </div>

      {/* Таблица позиций */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {pozicii.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            Добавьте расценки из справочника
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 text-slate-600 font-medium w-8">№</th>
                  <th className="text-left p-3 text-slate-600 font-medium">Наименование работ</th>
                  <th className="text-left p-3 text-slate-600 font-medium w-24">Ед.</th>
                  <th className="text-center p-3 text-slate-600 font-medium w-16">Кат.</th>
                  <th className="text-right p-3 text-slate-600 font-medium w-24">Баз. цена</th>
                  <th className="text-right p-3 text-slate-600 font-medium w-20">Объём</th>
                  <th className="text-center p-3 text-slate-600 font-medium w-16">Коэф.</th>
                  <th className="text-right p-3 text-slate-600 font-medium w-28">Стоимость</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pozicii.map((poz, idx) => {
                  const { stoimost, koefProduct } = calcPoz(poz, indeksZnachenie)
                  const nazvanie = poz.nazvanie_custom || poz.poz_nazvanie || '—'
                  const edinica = poz.edinica_custom || poz.poz_edinica || ''
                  let bazaDisplay = poz.baza_cena
                  if (poz.ceny) {
                    try { bazaDisplay = JSON.parse(poz.ceny)[String(poz.kategoriya)] || poz.baza_cena } catch {}
                  }
                  const isExpanded = expandedId === poz.id

                  return (
                    <>
                      <tr key={poz.id} className={`hover:bg-slate-50 ${isExpanded ? 'bg-blue-50' : ''}`}>
                        <td className="p-3 text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800">{nazvanie}</div>
                          {poz.nomer_punkta && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              п. {poz.nomer_punkta} · {poz.glava_nazvanie}
                            </div>
                          )}
                          {poz.koefficienty.length > 0 && (
                            <div className="text-xs text-blue-600 mt-0.5">
                              Коэф: {poz.koefficienty.map(k => k.kod).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">{edinica}</td>
                        <td className="p-3 text-center">
                          <select
                            className="text-center text-sm border border-slate-200 rounded px-1 py-0.5 w-14"
                            value={poz.kategoriya}
                            onChange={e => updatePoz(poz, 'kategoriya', parseInt(e.target.value))}
                          >
                            {[1, 2, 3, 4, 5].map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </td>
                        <td className="p-3 text-right text-slate-700">{fmt(bazaDisplay)}</td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            className="text-right text-sm border border-slate-200 rounded px-1 py-0.5 w-20"
                            value={poz.obem}
                            min={0}
                            step={0.01}
                            onChange={e => updatePoz(poz, 'obem', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setEditKoefId(editKoefId === poz.id ? null : poz.id)}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                              poz.koefficienty.length > 0
                                ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                : 'border-slate-200 text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {koefProduct !== 1 ? `×${koefProduct.toFixed(2)}` : '+К'}
                          </button>
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-900">{fmt(stoimost)}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : poz.id)}
                              className="text-slate-300 hover:text-slate-600 text-sm px-1"
                              title="Показать детали"
                            >
                              {isExpanded ? '▲' : '▼'}
                            </button>
                            <button onClick={() => deletePoz(poz.id)} className="text-slate-300 hover:text-red-500 text-sm px-1">✕</button>
                          </div>
                        </td>
                      </tr>
                      {/* Детали формулы */}
                      {isExpanded && (
                        <tr key={`${poz.id}-exp`} className="bg-blue-50">
                          <td colSpan={9} className="px-8 py-3">
                            <div className="text-xs text-slate-600 space-y-1">
                              <div className="font-semibold text-slate-700 mb-2">Расчёт стоимости:</div>
                              <div>Базовая цена (кат. {poz.kategoriya}): <strong>{fmt(bazaDisplay)} руб.</strong></div>
                              <div>Объём: <strong>{poz.obem} {edinica}</strong></div>
                              {poz.koefficienty.length > 0 ? (
                                <div>
                                  Коэффициенты:
                                  {poz.koefficienty.map(k => (
                                    <span key={k.id} className="ml-2 bg-white border border-blue-200 rounded px-1.5 py-0.5 text-blue-700">
                                      {k.kod} = {k.znachenie} ({k.nazvanie})
                                    </span>
                                  ))}
                                  <span className="ml-2 font-semibold">→ произведение = {koefProduct.toFixed(4)}</span>
                                </div>
                              ) : <div>Коэффициенты: не применены (×1)</div>}
                              <div>Индекс: <strong>×{indeksZnachenie}</strong> ({smeta.indeks_period || 'не выбран'})</div>
                              <div className="mt-2 font-semibold text-slate-800 text-sm">
                                Итого: {fmt(bazaDisplay)} × {poz.obem} × {koefProduct.toFixed(4)} × {indeksZnachenie} = <span className="text-blue-700">{fmt(stoimost)} руб.</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* Редактор коэффициентов */}
                      {editKoefId === poz.id && (
                        <tr key={`${poz.id}-koef`} className="bg-yellow-50">
                          <td colSpan={9} className="px-8 py-3">
                            <KoefEditor
                              allKoef={allKoef}
                              selected={poz.koefficienty.map(k => k.id)}
                              onSave={ids => saveKoef(poz, ids)}
                              onClose={() => setEditKoefId(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Итоги */}
      {pozicii.length > 0 && (
        <div className="bg-white border-t border-slate-200 px-6 py-4">
          <div className="flex justify-end">
            <div className="w-80 space-y-1 text-sm">
              {totalField > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Полевые работы:</span>
                  <span className="font-medium">{fmt(totalField)} руб.</span>
                </div>
              )}
              {totalOffice > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Камеральные работы:</span>
                  <span className="font-medium">{fmt(totalOffice)} руб.</span>
                </div>
              )}
              {totalAll > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Прочие работы:</span>
                  <span className="font-medium">{fmt(totalAll)} руб.</span>
                </div>
              )}
              <div className="flex justify-between text-slate-800 font-semibold pt-1 border-t border-slate-200">
                <span>Итого без НДС:</span>
                <span>{fmt(total)} руб.</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>НДС {smeta.nds_stavka}%:</span>
                <span>{fmt(nds)} руб.</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold text-base pt-1 border-t-2 border-slate-300">
                <span>ИТОГО с НДС:</span>
                <span className="text-blue-700">{fmt(totalWithNds)} руб.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка поиска */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 pt-16">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <input
                autoFocus
                className="input flex-1"
                placeholder="Поиск по справочнику... (минимум 2 символа)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <div className="max-h-96 overflow-auto">
              {searchResults.length === 0 && searchQuery.length >= 2 && (
                <div className="p-6 text-center text-slate-400 text-sm">Ничего не найдено</div>
              )}
              {searchResults.length === 0 && searchQuery.length < 2 && (
                <div className="p-6 text-center text-slate-400 text-sm">Введите название или номер расценки</div>
              )}
              {searchResults.map(sr => (
                <SearchResultRow key={sr.id} sr={sr} onAdd={addPoziciya} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Настройки сметы */}
      {showSettings && (
        <Modal title="Настройки сметы" onClose={() => setShowSettings(false)}>
          <div className="space-y-3">
            <div>
              <label className="label">Наименование</label>
              <input className="input" value={settingsForm.nazvanie} onChange={e => setSettingsForm({ ...settingsForm, nazvanie: e.target.value })} />
            </div>
            <div>
              <label className="label">Индекс пересчёта</label>
              <select className="input" value={settingsForm.indeks_id} onChange={e => setSettingsForm({ ...settingsForm, indeks_id: e.target.value })}>
                <option value="">— не выбран —</option>
                {indeksy.map(i => <option key={i.id} value={i.id}>{i.period} (×{i.znachenie})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ставка НДС, %</label>
              <input type="number" className="input w-32" value={settingsForm.nds_stavka} onChange={e => setSettingsForm({ ...settingsForm, nds_stavka: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setShowSettings(false)} className="btn-secondary px-4 py-2">Отмена</button>
            <button onClick={saveSettings} className="btn-primary px-4 py-2">Сохранить</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function SearchResultRow({ sr, onAdd }: { sr: SearchResult; onAdd: (sr: SearchResult, kat: number) => void }) {
  const [kat, setKat] = useState(1)
  let cenyObj: Record<string, number> = {}
  try { cenyObj = JSON.parse(sr.ceny) } catch {}
  const price = cenyObj[String(kat)] || 0

  return (
    <div className="p-3 border-b border-slate-100 hover:bg-slate-50">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-800">{sr.nazvanie}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            п. {sr.nomer_punkta} · {sr.tablica_nazvanie} · {sr.glava_nazvanie}
          </div>
          <div className="text-xs text-slate-500">{sr.spravochnik_nazvanie}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div>
            <div className="text-xs text-slate-500 mb-0.5">Кат.</div>
            <select
              className="text-sm border border-slate-200 rounded px-1 py-0.5 w-14"
              value={kat}
              onChange={e => setKat(parseInt(e.target.value))}
            >
              {Object.keys(cenyObj).map(k => <option key={k} value={k}>{k}</option>)}
              {Object.keys(cenyObj).length === 0 && <option value={1}>1</option>}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">Цена</div>
            <div className="text-sm font-medium text-slate-700 w-24 text-right">
              {price.toLocaleString('ru-RU')} руб.
            </div>
          </div>
          <button
            onClick={() => onAdd(sr, kat)}
            className="btn-primary text-sm px-3 py-1.5 mt-4"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  )
}

function KoefEditor({ allKoef, selected, onSave, onClose }: {
  allKoef: Koef[]
  selected: number[]
  onSave: (ids: number[]) => void
  onClose: () => void
}) {
  const [sel, setSel] = useState<Set<number>>(new Set(selected))

  function toggle(id: number) {
    const next = new Set(sel)
    next.has(id) ? next.delete(id) : next.add(id)
    setSel(next)
  }

  return (
    <div>
      <div className="text-sm font-semibold text-slate-700 mb-2">Применить коэффициенты:</div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {allKoef.map(k => (
          <label key={k.id} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${sel.has(k.id) ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
            <input type="checkbox" checked={sel.has(k.id)} onChange={() => toggle(k.id)} className="mt-0.5" />
            <div>
              <div className="text-sm font-medium text-slate-700">{k.kod} = {k.znachenie}</div>
              <div className="text-xs text-slate-500">{k.nazvanie}</div>
              <div className="text-xs text-slate-400">{k.k_chemu === 'field' ? 'полевые' : k.k_chemu === 'office' ? 'камеральные' : 'все работы'}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave(Array.from(sel))} className="btn-primary text-sm px-3 py-1.5">Применить</button>
        <button onClick={onClose} className="btn-secondary text-sm px-3 py-1.5">Отмена</button>
      </div>
    </div>
  )
}

function ExportButtons({ smetaId, smetaName }: { smetaId: number; smetaName: string }) {
  async function exportXlsx() {
    const XLSX = await loadXlsx()
    const data = await api.export.getSmetaData(smetaId)
    if (!data) return

    const { smeta, pozicii } = data as { smeta: SmetaInfo & { proekt_nazvanie: string; zakazchik: string }; pozicii: Poziciya[] }
    const indeks = smeta.indeks_znachenie || 1

    const rows: unknown[][] = [
      ['СМЕТА НА ВЫПОЛНЕНИЕ РАБОТ'],
      [smeta.proekt_nazvanie || smeta.nazvanie],
      smeta.zakazchik ? ['Заказчик: ' + smeta.zakazchik] : [],
      [],
      ['№', 'Наименование работ', 'Ед. изм.', 'Кат.', 'Базовая цена', 'Объём', 'Коэф-ты', 'Индекс', 'Стоимость, руб.']
    ]

    let total = 0
    pozicii.forEach((p, i) => {
      const { stoimost, koefProduct } = calcPoz(p, indeks)
      total += stoimost
      let baza = p.baza_cena
      try { if (p.ceny) baza = JSON.parse(p.ceny)[String(p.kategoriya)] || baza } catch {}
      rows.push([
        i + 1,
        p.nazvanie_custom || p.poz_nazvanie || '',
        p.poz_edinica || '',
        p.kategoriya,
        baza,
        p.obem,
        koefProduct.toFixed(4),
        indeks,
        Math.round(stoimost * 100) / 100
      ])
    })

    const nds = total * ((smeta.nds_stavka || 20) / 100)
    rows.push([], ['', '', '', '', '', '', '', 'Итого без НДС:', Math.round(total * 100) / 100])
    rows.push(['', '', '', '', '', '', '', `НДС ${smeta.nds_stavka}%:`, Math.round(nds * 100) / 100])
    rows.push(['', '', '', '', '', '', '', 'ИТОГО с НДС:', Math.round((total + nds) * 100) / 100])

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 4 }, { wch: 50 }, { wch: 10 }, { wch: 5 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 18 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Смета')
    const buf = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })

    const res = await api.export.saveDialog(`${smetaName}.xlsx`, 'xlsx')
    if (!res.canceled && res.filePath) {
      await api.export.writeFile(res.filePath, buf)
    }
  }

  async function exportPdf() {
    const jsPDF = await loadJsPdf()
    const autoTable = await loadAutoTable()
    const data = await api.export.getSmetaData(smetaId)
    if (!data) return

    const { smeta, pozicii } = data as { smeta: SmetaInfo & { proekt_nazvanie: string; zakazchik: string }; pozicii: Poziciya[] }
    const indeks = smeta.indeks_znachenie || 1
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    doc.setFont('helvetica')
    doc.setFontSize(14)
    doc.text(smeta.nazvanie, 14, 16)
    if (smeta.proekt_nazvanie) { doc.setFontSize(10); doc.text(smeta.proekt_nazvanie, 14, 23) }
    if (smeta.zakazchik) { doc.setFontSize(9); doc.text('Заказчик: ' + smeta.zakazchik, 14, 29) }

    let total = 0
    const tableRows = pozicii.map((p, i) => {
      const { stoimost, koefProduct } = calcPoz(p, indeks)
      total += stoimost
      let baza = p.baza_cena
      try { if (p.ceny) baza = JSON.parse(p.ceny)[String(p.kategoriya)] || baza } catch {}
      return [
        i + 1,
        p.nazvanie_custom || p.poz_nazvanie || '',
        p.poz_edinica || '',
        p.kategoriya,
        baza.toLocaleString('ru-RU'),
        p.obem,
        koefProduct !== 1 ? koefProduct.toFixed(3) : '—',
        stoimost.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
      ]
    })

    const nds = total * ((smeta.nds_stavka || 20) / 100)

    autoTable(doc, {
      startY: 34,
      head: [['№', 'Наименование работ', 'Ед.', 'Кат.', 'Баз. цена', 'Объём', 'Коэф.', 'Стоимость, руб.']],
      body: tableRows,
      foot: [
        ['', '', '', '', '', '', 'Итого без НДС:', total.toLocaleString('ru-RU', { maximumFractionDigits: 2 })],
        ['', '', '', '', '', '', `НДС ${smeta.nds_stavka}%:`, nds.toLocaleString('ru-RU', { maximumFractionDigits: 2 })],
        ['', '', '', '', '', '', 'ИТОГО с НДС:', (total + nds).toLocaleString('ru-RU', { maximumFractionDigits: 2 })],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 90 },
        2: { cellWidth: 15 },
        3: { cellWidth: 10 },
        4: { cellWidth: 22 },
        5: { cellWidth: 15 },
        6: { cellWidth: 15 },
        7: { cellWidth: 30 }
      }
    })

    const buf = doc.output('datauristring').split(',')[1]
    const res = await api.export.saveDialog(`${smetaName}.pdf`, 'pdf')
    if (!res.canceled && res.filePath) {
      await api.export.writeFile(res.filePath, buf)
    }
  }

  return (
    <div className="flex gap-2">
      <button onClick={exportXlsx} className="btn-secondary text-sm px-3 py-1.5">📥 Excel</button>
      <button onClick={exportPdf} className="btn-secondary text-sm px-3 py-1.5">📄 PDF</button>
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
