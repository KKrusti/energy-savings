import { NavLink } from 'react-router-dom'
import { Zap, LayoutDashboard, Tag } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans">
      {/* Fondo decorativo */}
      <div
        aria-hidden="true"
        className="fixed inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-cta/20 blur-3xl" />
      </div>

      {/* Navbar flotante */}
      <header className="fixed top-4 left-4 right-4 z-50">
        <nav
          className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3 rounded-2xl
            bg-white/5 backdrop-blur-glass border border-white/10 shadow-lg"
          aria-label="Navegación principal"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" aria-hidden="true" />
            <span className="font-semibold text-primary">Energy Savings</span>
          </div>
          <div className="flex items-center gap-1">
            <NavItem to="/" icon={<LayoutDashboard className="w-4 h-4" aria-hidden="true" />} label="Dashboard" />
            <NavItem to="/offers" icon={<Tag className="w-4 h-4" aria-hidden="true" />} label="Ofertas" />
          </div>
        </nav>
      </header>

      {/* Contenido principal */}
      <main className="relative pt-28 pb-16 px-4 max-w-5xl mx-auto">
        {children}
      </main>
    </div>
  )
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
         transition-colors duration-200 cursor-pointer
         ${isActive
           ? 'bg-primary/20 text-primary'
           : 'text-slate-400 hover:text-[#F8FAFC] hover:bg-white/5'
         }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}
