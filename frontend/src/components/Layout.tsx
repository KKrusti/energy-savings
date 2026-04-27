import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Zap, LayoutDashboard, Tag, Sun, Moon, LogOut, User, KeyRound, SunMedium } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'
import { getStoredToken } from '@/api/client'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const isDark = theme === 'dark'

  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()

  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwLoading(true)
    try {
      const token = getStoredToken()!
      await authApi.changePassword(token, pwCurrent, pwNew)
      setShowChangePassword(false)
      setPwCurrent('')
      setPwNew('')
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Error')
    } finally {
      setPwLoading(false)
    }
  }

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
            <span className="font-semibold text-primary">Ahorraluz</span>
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

            {/* User menu */}
            <div className="relative ml-1">
              <button
                onClick={() => setShowUserMenu(v => !v)}
                aria-label="Menú de usuario"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                  transition-colors duration-200 cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-primary/50
                  ${isDark
                    ? 'text-slate-400 hover:text-[#F8FAFC] hover:bg-white/5'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <User className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">{user?.username}</span>
              </button>

              {showUserMenu && (
                <div
                  className={`absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-lg overflow-hidden
                    ${isDark ? 'bg-[#1E293B] border border-white/10' : 'bg-white border border-slate-200'}`}
                >
                  <button
                    onClick={() => { setShowChangePassword(true); setShowUserMenu(false) }}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors cursor-pointer
                      ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <KeyRound className="w-4 h-4" />
                    Cambiar contraseña
                  </button>
                  <label
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm cursor-pointer select-none
                      ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <span className="flex items-center gap-2">
                      <SunMedium className="w-4 h-4 text-amber-400" aria-hidden="true" />
                      Tengo placas solares
                    </span>
                    <input
                      type="checkbox"
                      checked={profile?.has_solar_panels ?? false}
                      onChange={(e) => updateProfile.mutate({ has_solar_panels: e.target.checked })}
                      className="w-4 h-4 rounded accent-primary cursor-pointer"
                      aria-label="Tengo placas solares"
                    />
                  </label>
                  <button
                    onClick={() => { setShowUserMenu(false); logout() }}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors cursor-pointer
                      ${isDark ? 'text-red-400 hover:bg-white/5' : 'text-red-500 hover:bg-slate-50'}`}
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Change password modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl
            ${isDark ? 'bg-[#1E293B] border border-white/10' : 'bg-white border border-slate-200'}`}
          >
            <h2 className="text-base font-semibold mb-4">Cambiar contraseña</h2>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
              <input
                type="password"
                value={pwCurrent}
                onChange={e => setPwCurrent(e.target.value)}
                placeholder="Contraseña actual"
                required
                autoComplete="current-password"
                className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50
                  ${isDark ? 'bg-white/5 border border-white/10 text-[#F8FAFC]' : 'bg-slate-50 border border-slate-200 text-slate-900'}`}
              />
              <input
                type="password"
                value={pwNew}
                onChange={e => setPwNew(e.target.value)}
                placeholder="Nueva contraseña (mín. 8 caracteres)"
                required
                minLength={8}
                autoComplete="new-password"
                className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50
                  ${isDark ? 'bg-white/5 border border-white/10 text-[#F8FAFC]' : 'bg-slate-50 border border-slate-200 text-slate-900'}`}
              />
              {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => { setShowChangePassword(false); setPwError('') }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer
                    ${isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="flex-1 py-2 rounded-xl bg-cta text-white text-sm font-medium
                    hover:bg-cta/90 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {pwLoading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
