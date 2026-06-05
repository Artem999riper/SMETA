import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Proekt {
  id: number
  nazvanie: string
  zakazchik: string | null
  data: string | null
  primechaniya: string | null
  sozdan: string
}

interface Smeta {
  id: number
  nazvanie: string
  indeks_period: string | null
  nds_stavka: number
}

const api = window.api

export default function Proekty() {
  const [proekty, setProekty] = useState<Proekt[]>([])
  const [selected, setSelected] = useState<Proekt | null>(null)
  const [smety, setSmety] = useState<Smeta[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showSmetaForm, setShowSmetaForm] = useState(false)
  const [editProekt, setEditProekt] = useState<Proekt | null>(null)
  const [indeksy, setIndeksy] = useState<Array<{ id: number; period: string; znachenie: number }>>([])
  const navigate = useNavigate()

  const [form, setForm] = useState({ nazvanie: '', zakazchik: '', data: '', primechaniya: '' })
  const [smetaForm, setSmetaForm] = useState({ nazvanie: '', indeks_id: '', nds_stavka: '20' })

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (selected) loadSmety(selected.id)
  }, [selected])

  async function load() {
    const list = await api.proekty.list()
    setProekty(list)
    const idx = await api.indeksy.list()
    setIndeksy(idx)
  }

  async function loadSmety(proektId: number) {
    const list = await api.smety.listByProekt(proektId)
    setSmety(list)
  }

  function openCreate() {
    setEditProekt(null)
    setForm({ nazvanie: '', zakazchik: '', data: new Date().toISOString().slice(0, 10), primechaniya: '' })
    setShowForm(true)
  }

  function openEdit(p: Proekt) {
    setEditProekt(p)
    setForm({ nazvanie: p.nazvanie, zakazchik: p.zakazchik || '', data: p.data || '', primechaniya: p.primechaniya || '' })
    setShowForm(true)
  }

  async function saveProekt() {
    if (!form.nazvanie.trim()) return
    if (editProekt) {
      await api.proekty.update(editProekt.id, form)
    } else {
      await api.proekty.create(form)
    }
    setShowForm(false)
    load()
  }

  async function deleteProekt(p: Proekt) {
    if (!confirm(`Удалить проект «${p.nazvanie}»? Все сметы будут удалены.`)) return
    await api.proekty.delete(p.id)
    if (selected?.id === p.id) setSelected(null)
    load()
  }

  async function createSmeta() {
    if (!smetaForm.nazvanie.trim() || !selected) return
    await api.smety.create({
      proekt_id: selected.id,
      nazvanie: smetaForm.nazvanie,
      indeks_id: smetaForm.indeks_id ? parseInt(smetaForm.indeks_id) : undefined,
      nds_stavka: parseFloat(smetaForm.nds_stavka) || 20
    })
    setShowSmetaForm(false)
    loadSmety(selected.id)
  }

  async function deleteSmeta(s: Smeta) {
    if (!confirm(`Удалить смету «${s.nazvanie}»?`)) return
    await api.smety.delete(s.id)
    if (selected) loadSmety(selected.id)
  }

  return (
    <div className="flex h-full">
      {/* Список проектов */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Проекты</h2>
          <button onClick={openCreate} className="btn-primary text-sm px-3 py-1.5">
            + Новый
          </button>
        </div>
        <div className="flex-1 overflow-auto divide-y divide-slate-100">
          {proekty.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-sm">
              Нет проектов. Создайте первый.
            </div>
          )}
          {proekty.map(p => (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${selected?.id === p.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
            >
              <div className="font-medium text-sm text-slate-800 line-clamp-2">{p.nazvanie}</div>
              {p.zakazchik && <div className="text-xs text-slate-500 mt-0.5 truncate">{p.zakazchik}</div>}
              {p.data && <div className="text-xs text-slate-400 mt-0.5">{p.data}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Правая панель */}
      <div className="flex-1 overflow-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <div className="text-5xl mb-4">📁</div>
              <div>Выберите проект или создайте новый</div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Заголовок проекта */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{selected.nazvanie}</h1>
                {selected.zakazchik && <div className="text-sm text-slate-500 mt-1">Заказчик: {selected.zakazchik}</div>}
                {selected.data && <div className="text-sm text-slate-400">Дата: {selected.data}</div>}
                {selected.primechaniya && <div className="text-sm text-slate-500 mt-1 italic">{selected.primechaniya}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(selected)} className="btn-secondary text-sm px-3 py-1.5">
                  Редактировать
                </button>
                <button onClick={() => deleteProekt(selected)} className="btn-danger text-sm px-3 py-1.5">
                  Удалить
                </button>
              </div>
            </div>

            {/* Сметы */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Сметы проекта</h2>
                <button onClick={() => { setSmetaForm({ nazvanie: '', indeks_id: indeksy[0]?.id?.toString() || '', nds_stavka: '20' }); setShowSmetaForm(true) }} className="btn-primary text-sm px-3 py-1.5">
                  + Новая смета
                </button>
              </div>
              {smety.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Нет смет. Создайте первую.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {smety.map(s => (
                    <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="font-medium text-slate-800">{s.nazvanie}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {s.indeks_period ? `Индекс: ${s.indeks_period}` : 'Индекс не выбран'}
                          {' · '}НДС {s.nds_stavka}%
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => navigate(`/smeta/${s.id}`)} className="btn-primary text-sm px-3 py-1.5">
                          Открыть
                        </button>
                        <button onClick={() => deleteSmeta(s)} className="btn-danger text-sm px-3 py-1.5">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Модалка проекта */}
      {showForm && (
        <Modal title={editProekt ? 'Редактировать проект' : 'Новый проект'} onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            <FormField label="Наименование объекта *">
              <input className="input" value={form.nazvanie} onChange={e => setForm({ ...form, nazvanie: e.target.value })} placeholder="Инженерно-геодезические изыскания..." />
            </FormField>
            <FormField label="Заказчик">
              <input className="input" value={form.zakazchik} onChange={e => setForm({ ...form, zakazchik: e.target.value })} placeholder="ООО «Заказчик»" />
            </FormField>
            <FormField label="Дата">
              <input type="date" className="input" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
            </FormField>
            <FormField label="Примечания">
              <textarea className="input h-20 resize-none" value={form.primechaniya} onChange={e => setForm({ ...form, primechaniya: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary px-4 py-2">Отмена</button>
            <button onClick={saveProekt} className="btn-primary px-4 py-2">Сохранить</button>
          </div>
        </Modal>
      )}

      {/* Модалка сметы */}
      {showSmetaForm && (
        <Modal title="Новая смета" onClose={() => setShowSmetaForm(false)}>
          <div className="space-y-3">
            <FormField label="Наименование сметы *">
              <input className="input" value={smetaForm.nazvanie} onChange={e => setSmetaForm({ ...smetaForm, nazvanie: e.target.value })} placeholder="Смета на ИГИ" />
            </FormField>
            <FormField label="Индекс пересчёта">
              <select className="input" value={smetaForm.indeks_id} onChange={e => setSmetaForm({ ...smetaForm, indeks_id: e.target.value })}>
                <option value="">— не выбран —</option>
                {indeksy.map(i => (
                  <option key={i.id} value={i.id}>{i.period} (×{i.znachenie})</option>
                ))}
              </select>
            </FormField>
            <FormField label="Ставка НДС, %">
              <input type="number" className="input w-32" value={smetaForm.nds_stavka} onChange={e => setSmetaForm({ ...smetaForm, nds_stavka: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setShowSmetaForm(false)} className="btn-secondary px-4 py-2">Отмена</button>
            <button onClick={createSmeta} className="btn-primary px-4 py-2">Создать</button>
          </div>
        </Modal>
      )}
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

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

import { ReactNode } from 'react'
