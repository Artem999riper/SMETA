import { useEffect, useState, ReactNode } from 'react'

const api = window.api

interface Koef { id: number; kod: string; nazvanie: string; znachenie: number; uslovie: string | null; k_chemu: string }
interface Indeks { id: number; period: string; znachenie: number; istochnik: string | null }

export default function Koefficienty() {
  const [koefs, setKoefs] = useState<Koef[]>([])
  const [indeksy, setIndeksy] = useState<Indeks[]>([])
  const [tab, setTab] = useState<'koef' | 'indeks'>('koef')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Koef | Indeks | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})

  useEffect(() => { load() }, [])

  async function load() {
    const [k, i] = await Promise.all([api.koefficienty.list(), api.indeksy.list()])
    setKoefs(k)
    setIndeksy(i)
  }

  function openCreate() {
    setEditItem(null)
    setForm(tab === 'koef'
      ? { kod: '', nazvanie: '', znachenie: '1.0', uslovie: '', k_chemu: 'all' }
      : { period: '', znachenie: '', istochnik: '' }
    )
    setShowModal(true)
  }

  function openEdit(item: Koef | Indeks) {
    setEditItem(item)
    const f: Record<string, string> = {}
    Object.entries(item).forEach(([k, v]) => { f[k] = String(v ?? '') })
    setForm(f)
    setShowModal(true)
  }

  async function save() {
    if (tab === 'koef') {
      const data = { kod: form.kod, nazvanie: form.nazvanie, znachenie: parseFloat(form.znachenie), uslovie: form.uslovie || undefined, k_chemu: form.k_chemu }
      if (editItem) await api.koefficienty.update(editItem.id, data)
      else await api.koefficienty.create(data)
    } else {
      const data = { period: form.period, znachenie: parseFloat(form.znachenie), istochnik: form.istochnik || undefined }
      if (editItem) await api.indeksy.update(editItem.id, data)
      else await api.indeksy.create(data)
    }
    setShowModal(false)
    load()
  }

  async function del(id: number, name: string) {
    if (!confirm(`Удалить «${name}»?`)) return
    if (tab === 'koef') await api.koefficienty.delete(id)
    else await api.indeksy.delete(id)
    load()
  }

  const kChemuLabel = (v: string) => v === 'field' ? 'Полевые' : v === 'office' ? 'Камеральные' : 'Все работы'

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Коэффициенты и индексы</h1>
        <button onClick={openCreate} className="btn-primary px-4 py-2 text-sm">+ Добавить</button>
      </div>

      {/* Табы */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setTab('koef')}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${tab === 'koef' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Коэффициенты ({koefs.length})
        </button>
        <button
          onClick={() => setTab('indeks')}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${tab === 'indeks' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Индексы пересчёта ({indeksy.length})
        </button>
      </div>

      {tab === 'koef' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 text-slate-600 font-medium w-24">Код</th>
                <th className="text-left p-3 text-slate-600 font-medium">Наименование</th>
                <th className="text-center p-3 text-slate-600 font-medium w-20">Значение</th>
                <th className="text-left p-3 text-slate-600 font-medium w-28">К чему</th>
                <th className="text-left p-3 text-slate-600 font-medium">Условие применения</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {koefs.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Нет коэффициентов</td></tr>
              )}
              {koefs.map(k => (
                <tr key={k.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-medium text-blue-700">{k.kod}</td>
                  <td className="p-3 text-slate-800">{k.nazvanie}</td>
                  <td className="p-3 text-center font-semibold">{k.znachenie}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${k.k_chemu === 'field' ? 'bg-green-100 text-green-700' : k.k_chemu === 'office' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                      {kChemuLabel(k.k_chemu)}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500 text-xs">{k.uslovie || '—'}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(k)} className="text-slate-400 hover:text-blue-600 text-sm">✎</button>
                      <button onClick={() => del(k.id, k.nazvanie)} className="text-slate-400 hover:text-red-500 text-sm">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'indeks' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 text-slate-600 font-medium w-36">Период</th>
                <th className="text-center p-3 text-slate-600 font-medium w-24">Значение</th>
                <th className="text-left p-3 text-slate-600 font-medium">Источник</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {indeksy.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Нет индексов</td></tr>
              )}
              {indeksy.map(i => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-800">{i.period}</td>
                  <td className="p-3 text-center font-semibold text-blue-700">{i.znachenie}</td>
                  <td className="p-3 text-slate-500 text-xs">{i.istochnik || '—'}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(i)} className="text-slate-400 hover:text-blue-600 text-sm">✎</button>
                      <button onClick={() => del(i.id, i.period)} className="text-slate-400 hover:text-red-500 text-sm">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editItem ? 'Редактировать' : 'Добавить'} onClose={() => setShowModal(false)}>
          {tab === 'koef' ? (
            <div className="space-y-3">
              <LabelInput label="Код *" value={form.kod || ''} onChange={v => setForm({ ...form, kod: v })} placeholder="K_NBP" />
              <LabelInput label="Наименование *" value={form.nazvanie || ''} onChange={v => setForm({ ...form, nazvanie: v })} placeholder="Неблагоприятный период" />
              <LabelInput label="Значение *" value={form.znachenie || ''} onChange={v => setForm({ ...form, znachenie: v })} placeholder="1.25" />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Применяется к</label>
                <select className="input" value={form.k_chemu || 'all'} onChange={e => setForm({ ...form, k_chemu: e.target.value })}>
                  <option value="field">Полевым работам</option>
                  <option value="office">Камеральным работам</option>
                  <option value="all">Всем работам</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Условие применения</label>
                <textarea className="input h-16 resize-none" value={form.uslovie || ''} onChange={e => setForm({ ...form, uslovie: e.target.value })} placeholder="При производстве работ в..." />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <LabelInput label="Период *" value={form.period || ''} onChange={v => setForm({ ...form, period: v })} placeholder="I кв. 2024" />
              <LabelInput label="Значение индекса *" value={form.znachenie || ''} onChange={v => setForm({ ...form, znachenie: v })} placeholder="8.57" />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Источник</label>
                <input className="input" value={form.istochnik || ''} onChange={e => setForm({ ...form, istochnik: e.target.value })} placeholder="Письмо Минстроя..." />
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setShowModal(false)} className="btn-secondary px-4 py-2">Отмена</button>
            <button onClick={save} className="btn-primary px-4 py-2">Сохранить</button>
          </div>
        </Modal>
      )}
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
