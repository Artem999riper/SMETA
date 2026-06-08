import { useEffect, useState, ReactNode } from 'react'

const api = window.api

interface Spravochnik { id: number; kod: string; nazvanie: string; god: number | null; redakciya: string | null }
interface Glava { id: number; spravochnik_id: number; nomer: string; nazvanie: string }
interface Tablica { id: number; glava_id: number; nomer: string; nazvanie: string; edinica: string }
interface Poziciya { id: number; tablica_id: number; nomer_punkta: string; nazvanie: string; edinica: string; tip_rabot: string; ceny: string }

export default function Spravochniki() {
  const [spravochniki, setSpravochniki] = useState<Spravochnik[]>([])
  const [glavy, setGlavy] = useState<Glava[]>([])
  const [tablicy, setTablicy] = useState<Tablica[]>([])
  const [pozicii, setPozicii] = useState<Poziciya[]>([])

  const [selSpr, setSelSpr] = useState<Spravochnik | null>(null)
  const [selGlava, setSelGlava] = useState<Glava | null>(null)
  const [selTab, setSelTab] = useState<Tablica | null>(null)

  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState<(Poziciya & { tablica_nazvanie: string; glava_nazvanie: string; spravochnik_nazvanie: string })[]>([])

  // Modals
  const [modal, setModal] = useState<'spr' | 'glava' | 'tab' | 'poz' | null>(null)
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => { loadSpr() }, [])
  useEffect(() => { if (selSpr) loadGlavy(selSpr.id) }, [selSpr])
  useEffect(() => { if (selGlava) loadTablicy(selGlava.id) }, [selGlava])
  useEffect(() => { if (selTab) loadPozicii(selTab.id) }, [selTab])

  useEffect(() => {
    if (searchQ.trim().length >= 2) {
      api.pozicii.search(searchQ).then(setSearchRes)
    } else {
      setSearchRes([])
    }
  }, [searchQ])

  async function loadSpr() { setSpravochniki(await api.spravochniki.list()) }
  async function loadGlavy(id: number) { setGlavy(await api.glavy.list(id)); setSelGlava(null); setTablicy([]); setSelTab(null); setPozicii([]) }
  async function loadTablicy(id: number) { setTablicy(await api.tablicy.list(id)); setSelTab(null); setPozicii([]) }
  async function loadPozicii(id: number) { setPozicii(await api.pozicii.list(id)) }

  function openModal(type: 'spr' | 'glava' | 'tab' | 'poz', edit?: Record<string, unknown>) {
    setModal(type)
    setEditItem(edit || null)
    if (edit) {
      const f: Record<string, string> = {}
      Object.entries(edit).forEach(([k, v]) => { f[k] = String(v ?? '') })
      setForm(f)
    } else {
      setForm(type === 'poz' ? { nomer_punkta: '', nazvanie: '', edinica: selTab?.edinica || '', tip_rabot: 'field', ceny_1: '', ceny_2: '', ceny_3: '' } : {})
    }
  }

  async function saveItem() {
    // Validate required fields up front (NOT NULL columns in DB).
    const req = (v: string | undefined) => (v ?? '').trim()
    if (modal === 'spr' && !req(form.nazvanie)) { alert('Укажите наименование справочника'); return }
    if (modal === 'glava' && (!req(form.nomer) || !req(form.nazvanie))) { alert('Укажите номер и наименование главы'); return }
    if (modal === 'tab' && (!req(form.nomer) || !req(form.nazvanie))) { alert('Укажите номер и наименование таблицы'); return }
    if (modal === 'poz' && (!req(form.nomer_punkta) || !req(form.nazvanie))) { alert('Укажите номер пункта и наименование расценки'); return }

    if (modal === 'spr') {
      const sprData = { kod: form.kod || 'NEW', nazvanie: form.nazvanie || '', god: form.god ? parseInt(form.god) : undefined, redakciya: form.redakciya || '' }
      if (editItem) await api.spravochniki.update(editItem.id as number, sprData)
      else await api.spravochniki.create(sprData)
      loadSpr()
    } else if (modal === 'glava' && selSpr) {
      const gData = { nomer: form.nomer || '', nazvanie: form.nazvanie || '' }
      if (editItem) await api.glavy.update(editItem.id as number, gData)
      else await api.glavy.create({ spravochnik_id: selSpr.id, ...gData })
      loadGlavy(selSpr.id)
    } else if (modal === 'tab' && selGlava) {
      const tData = { nomer: form.nomer || '', nazvanie: form.nazvanie || '', edinica: form.edinica || '' }
      if (editItem) await api.tablicy.update(editItem.id as number, tData)
      else await api.tablicy.create({ glava_id: selGlava.id, ...tData })
      loadTablicy(selGlava.id)
    } else if (modal === 'poz' && selTab) {
      const ceny: Record<string, number> = {}
      if (form.ceny_1) ceny['1'] = parseFloat(form.ceny_1)
      if (form.ceny_2) ceny['2'] = parseFloat(form.ceny_2)
      if (form.ceny_3) ceny['3'] = parseFloat(form.ceny_3)
      if (form.ceny_4) ceny['4'] = parseFloat(form.ceny_4)
      if (form.ceny_5) ceny['5'] = parseFloat(form.ceny_5)
      const data = { nomer_punkta: form.nomer_punkta || '', nazvanie: form.nazvanie || '', edinica: form.edinica || '', tip_rabot: form.tip_rabot || 'all', ceny }
      if (editItem) await api.pozicii.update(editItem.id as number, data)
      else await api.pozicii.create({ tablica_id: selTab.id, ...data })
      loadPozicii(selTab.id)
    }
    setModal(null)
  }

  async function deleteItem(type: 'spr' | 'glava' | 'tab' | 'poz', id: number, name: string) {
    if (!confirm(`Удалить «${name}»? Все вложенные данные будут удалены.`)) return
    if (type === 'spr') { await api.spravochniki.delete(id); loadSpr() }
    else if (type === 'glava' && selSpr) { await api.glavy.delete(id); loadGlavy(selSpr.id) }
    else if (type === 'tab' && selGlava) { await api.tablicy.delete(id); loadTablicy(selGlava.id) }
    else if (type === 'poz' && selTab) { await api.pozicii.delete(id); loadPozicii(selTab.id) }
  }

  function parseCeny(cenyStr: string): Record<string, number> {
    try { return JSON.parse(cenyStr) } catch { return {} }
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Справочники СБЦ</h1>
        <div className="flex items-center gap-3">
          <input
            className="input w-72"
            placeholder="Поиск расценок..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
          <button onClick={() => openModal('spr')} className="btn-primary px-4 py-2 text-sm">+ Справочник</button>
        </div>
      </div>

      {/* Результаты поиска */}
      {searchQ.length >= 2 && (
        <div className="mb-6 bg-white rounded-xl border border-slate-200">
          <div className="p-3 border-b border-slate-200 font-semibold text-sm text-slate-700">
            Результаты поиска ({searchRes.length})
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-auto">
            {searchRes.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-sm">Ничего не найдено</div>
            ) : searchRes.map(r => (
              <div key={r.id} className="p-3 text-sm">
                <div className="font-medium text-slate-800">{r.nazvanie}</div>
                <div className="text-xs text-slate-400 mt-0.5">п. {r.nomer_punkta} · {r.tablica_nazvanie} · {r.glava_nazvanie} · {r.spravochnik_nazvanie}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {Object.entries(parseCeny(r.ceny)).map(([k, v]) => `Кат.${k}: ${v}`).join(' | ')} ({r.edinica})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4-колоночная структура */}
      <div className="grid grid-cols-4 gap-4">
        {/* Справочники */}
        <Column
          title="Справочники"
          items={spravochniki}
          selected={selSpr}
          onSelect={s => { setSelSpr(s); setGlavy([]); setTablicy([]); setPozicii([]) }}
          onEdit={s => openModal('spr', s as unknown as Record<string, unknown>)}
          onDelete={s => deleteItem('spr', s.id, s.nazvanie)}
          renderLabel={s => <div><div className="font-medium">{s.nazvanie}</div><div className="text-xs text-slate-400">{s.kod}{s.god ? ` · ${s.god}` : ''}</div></div>}
        />

        {/* Главы */}
        <Column
          title="Главы"
          items={glavy}
          selected={selGlava}
          disabled={!selSpr}
          onSelect={g => { setSelGlava(g); setTablicy([]); setPozicii([]) }}
          onEdit={g => openModal('glava', g as unknown as Record<string, unknown>)}
          onDelete={g => deleteItem('glava', g.id, g.nazvanie)}
          onAdd={() => openModal('glava')}
          renderLabel={g => <div><div className="font-medium">Гл. {g.nomer}</div><div className="text-xs text-slate-500">{g.nazvanie}</div></div>}
        />

        {/* Таблицы */}
        <Column
          title="Таблицы"
          items={tablicy}
          selected={selTab}
          disabled={!selGlava}
          onSelect={t => { setSelTab(t); setPozicii([]) }}
          onEdit={t => openModal('tab', t as unknown as Record<string, unknown>)}
          onDelete={t => deleteItem('tab', t.id, t.nazvanie)}
          onAdd={() => openModal('tab')}
          renderLabel={t => <div><div className="font-medium">Табл. {t.nomer}</div><div className="text-xs text-slate-500">{t.nazvanie}</div><div className="text-xs text-slate-400">{t.edinica}</div></div>}
        />

        {/* Расценки */}
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Расценки</span>
            {selTab && <button onClick={() => openModal('poz')} className="text-xs btn-primary px-2 py-1">+ Добавить</button>}
          </div>
          <div className="flex-1 overflow-auto divide-y divide-slate-100">
            {!selTab && <div className="p-4 text-center text-slate-400 text-xs">Выберите таблицу</div>}
            {selTab && pozicii.length === 0 && <div className="p-4 text-center text-slate-400 text-xs">Нет расценок</div>}
            {pozicii.map(p => {
              const ceny = parseCeny(p.ceny)
              return (
                <div key={p.id} className="p-2 text-xs">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">п. {p.nomer_punkta}</div>
                      <div className="text-slate-600 mt-0.5">{p.nazvanie}</div>
                      <div className="text-slate-400 mt-0.5">
                        {Object.entries(ceny).map(([k, v]) => `К${k}: ${v.toLocaleString('ru-RU')}`).join(' | ')} ({p.edinica})
                      </div>
                      <div className="text-slate-400">{p.tip_rabot === 'field' ? 'полевые' : p.tip_rabot === 'office' ? 'камеральные' : 'все'}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => openModal('poz', p as unknown as Record<string, unknown>)} className="text-slate-400 hover:text-blue-600 text-xs">✎</button>
                      <button onClick={() => deleteItem('poz', p.id, p.nazvanie)} className="text-slate-400 hover:text-red-500 text-xs">✕</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Модальные окна */}
      {modal === 'spr' && (
        <Modal title={editItem ? 'Редактировать справочник' : 'Новый справочник'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <LabelInput label="Код *" value={form.kod || ''} onChange={v => setForm({ ...form, kod: v })} placeholder="IGI-2012" />
            <LabelInput label="Наименование *" value={form.nazvanie || ''} onChange={v => setForm({ ...form, nazvanie: v })} placeholder="Инженерно-геодезические изыскания" />
            <LabelInput label="Год" value={form.god || ''} onChange={v => setForm({ ...form, god: v })} placeholder="2012" />
            <LabelInput label="Редакция" value={form.redakciya || ''} onChange={v => setForm({ ...form, redakciya: v })} placeholder="Ред. 1" />
          </div>
          <ModalButtons onSave={saveItem} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'glava' && (
        <Modal title={editItem ? 'Редактировать главу' : 'Новая глава'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <LabelInput label="Номер *" value={form.nomer || ''} onChange={v => setForm({ ...form, nomer: v })} placeholder="1" />
            <LabelInput label="Наименование *" value={form.nazvanie || ''} onChange={v => setForm({ ...form, nazvanie: v })} placeholder="Топографо-геодезические работы" />
          </div>
          <ModalButtons onSave={saveItem} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'tab' && (
        <Modal title={editItem ? 'Редактировать таблицу' : 'Новая таблица'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <LabelInput label="Номер *" value={form.nomer || ''} onChange={v => setForm({ ...form, nomer: v })} placeholder="1.1" />
            <LabelInput label="Наименование *" value={form.nazvanie || ''} onChange={v => setForm({ ...form, nazvanie: v })} placeholder="Создание обоснования" />
            <LabelInput label="Единица измерения" value={form.edinica || ''} onChange={v => setForm({ ...form, edinica: v })} placeholder="точка, кв.км, км..." />
          </div>
          <ModalButtons onSave={saveItem} onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'poz' && (
        <Modal title={editItem ? 'Редактировать расценку' : 'Новая расценка'} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <LabelInput label="Номер пункта *" value={form.nomer_punkta || ''} onChange={v => setForm({ ...form, nomer_punkta: v })} placeholder="1.1.1" />
            <LabelInput label="Наименование *" value={form.nazvanie || ''} onChange={v => setForm({ ...form, nazvanie: v })} placeholder="Теодолитный ход" />
            <LabelInput label="Единица" value={form.edinica || ''} onChange={v => setForm({ ...form, edinica: v })} placeholder="точка" />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Тип работ</label>
              <select className="input" value={form.tip_rabot || 'all'} onChange={e => setForm({ ...form, tip_rabot: e.target.value })}>
                <option value="field">Полевые</option>
                <option value="office">Камеральные</option>
                <option value="all">Все (без разделения)</option>
              </select>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700 mb-1">Цены по категориям сложности</div>
              <div className="grid grid-cols-5 gap-2">
                {[1,2,3,4,5].map(k => (
                  <div key={k}>
                    <label className="text-xs text-slate-500">Кат. {k}</label>
                    <input
                      type="number"
                      className="input text-sm"
                      value={form[`ceny_${k}`] || ''}
                      onChange={e => setForm({ ...form, [`ceny_${k}`]: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <ModalButtons onSave={saveItem} onClose={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}

function Column<T extends { id: number; nazvanie: string }>({
  title, items, selected, disabled, onSelect, onEdit, onDelete, onAdd, renderLabel
}: {
  title: string
  items: T[]
  selected: T | null
  disabled?: boolean
  onSelect: (item: T) => void
  onEdit: (item: T) => void
  onDelete: (item: T) => void
  onAdd?: () => void
  renderLabel: (item: T) => ReactNode
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 flex flex-col ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="p-3 border-b border-slate-200 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        {onAdd && <button onClick={onAdd} className="text-xs btn-primary px-2 py-1">+ Добавить</button>}
      </div>
      <div className="flex-1 overflow-auto divide-y divide-slate-100">
        {items.length === 0 && <div className="p-4 text-center text-slate-400 text-xs">Нет данных</div>}
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className={`group p-2.5 cursor-pointer flex items-start justify-between gap-1 hover:bg-slate-50 transition-colors ${selected?.id === item.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
          >
            <div className="flex-1 text-sm">{renderLabel(item)}</div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={e => { e.stopPropagation(); onEdit(item) }} title="Редактировать" className="text-slate-400 hover:text-blue-600 text-sm px-1">✎</button>
              <button onClick={e => { e.stopPropagation(); onDelete(item) }} title="Удалить" className="text-slate-400 hover:text-red-500 text-sm px-1">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

function LabelInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function ModalButtons({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  return (
    <div className="flex gap-2 mt-4 justify-end">
      <button onClick={onClose} className="btn-secondary px-4 py-2">Отмена</button>
      <button onClick={onSave} className="btn-primary px-4 py-2">Сохранить</button>
    </div>
  )
}
