import { NavLink } from 'react-router-dom'
import { Zap, LayoutDashboard, Tag, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300
      ${isDark ? 'bg-[#0F172A] text-[#F8FAFC]' : 'bg-slate-50 text-slate-900'}`}
    >
      {/* Decorative blobs */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl
          ${isDark ? 'bg-primary/20' : 'bg-primary/10'}`} />
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl
          ${isDark ? 'bg-cta/20' : 'bg-cta/10'}`} />
      </div>

      {/* Floating navbar */}
      <header className="fixed top-4 left-4 right-4 z-50">
        <nav
          className={`max-w-5xl mx-auto flex items-center justify-between px-6 py-3 rounded-2xl
            backdrop-blur-glass shadow-lg transition-colors duration-300
            ${isDark
              ? 'bg-white/5 border border-white/10'
              : 'bg-white/80 border border-slate-200'
            }`}
          aria-label="Navegación principal"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" aria-hidden="true" />
            <span className="font-semibold text-primary">Energy Savings</span>
          </div>
          <div className="flex items-center gap-1">
            <NavItem to="/" icon={<LayoutDashboard className="w-4 h-4" aria-hidden="true" />} label="Dashboard" isDark={isDark} />
            <NavItem to="/offers" icon={<Tag className="w-4 h-4" aria-hidden="true" />} label="Ofertas" isDark={isDark} />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className={`ml-2 p-2 rounded-xl transition-colors duration-200 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-primary/50
                ${isDark
                  ? 'text-slate-400 hover:text-amber-300 hover:bg-white/5'
                  : 'text-slate-500 hover:text-amber-500 hover:bg-slate-100'
                }`}
            >
              {isDark
                ? <Sun className="w-4 h-4" aria-hidden="true" />
                : <Moon className="w-4 h-4" aria-hidden="true" />
              }
            </button>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="relative pt-28 pb-16 px-4 max-w-5xl mx-auto">
        {children}
      </main>
    </div>
  )
}

function NavItem({ to, icon, label, isDark }: { to: string; icon: React.ReactNode; label: string; isDark: boolean }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
         transition-colors duration-200 cursor-pointer
         ${isActive
           ? 'bg-primary/20 text-primary'
           : isDark
             ? 'text-slate-400 hover:text-[#F8FAFC] hover:bg-white/5'
             : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
         }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}
