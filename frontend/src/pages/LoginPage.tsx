import { useState } from 'react'
import { Zap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'
import { useTheme } from '@/context/ThemeContext'

export function LoginPage() {
  const { login } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = tab === 'login'
        ? await authApi.login(username, password)
        : await authApi.register(username, email, password)

      login(res.token, { user_id: res.user_id, username: res.username, is_admin: res.is_admin ?? false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const glass = isDark
    ? 'bg-white/5 border border-white/10'
    : 'bg-white/80 border border-slate-200'

  const inputClass = `w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors
    focus:ring-2 focus:ring-primary/50
    ${isDark
      ? 'bg-white/5 border border-white/10 text-[#F8FAFC] placeholder-slate-500'
      : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400'
    }`

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 font-sans
      ${isDark ? 'bg-[#0F172A] text-[#F8FAFC]' : 'bg-slate-50 text-slate-900'}`}
    >
      {/* Decorative blobs */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl
          ${isDark ? 'bg-primary/20' : 'bg-primary/10'}`} />
        <div className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl
          ${isDark ? 'bg-cta/20' : 'bg-cta/10'}`} />
      </div>

      <div className={`relative w-full max-w-sm rounded-2xl backdrop-blur-glass shadow-lg p-8 ${glass}`}>
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <Zap className="w-6 h-6 text-primary" />
          <span className="font-semibold text-lg text-primary">Energy Savings</span>
        </div>

        {/* Tabs */}
        <div className={`flex rounded-xl mb-6 p-1 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
                ${tab === t
                  ? 'bg-primary text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="tu_usuario"
              required
              autoComplete="username"
              className={inputClass}
            />
          </div>

          {tab === 'register' && (
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-2.5 rounded-xl bg-cta text-white font-medium text-sm
              hover:bg-cta/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading
              ? 'Cargando…'
              : tab === 'login' ? 'Entrar' : 'Crear cuenta'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
