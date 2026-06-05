import { NavLink } from 'react-router-dom'
import { ReactNode } from 'react'

const navItems = [
  { to: '/proekty', label: 'Проекты', icon: '📁' },
  { to: '/spravochniki', label: 'Справочники СБЦ', icon: '📚' },
  { to: '/koefficienty', label: 'Коэффициенты', icon: '⚙️' },
  { to: '/import', label: 'Импорт данных', icon: '📥' },
]

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700">
          <div className="text-lg font-bold text-white">СметаСБЦ</div>
          <div className="text-xs text-slate-400 mt-0.5">Расчёт смет по СБЦ</div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
          v1.0.0
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
