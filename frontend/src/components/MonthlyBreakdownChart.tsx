import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TooltipContentProps } from 'recharts/types/component/Tooltip'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'
import type { AnnualOfferResult } from '@/types'
import { useTheme } from '@/context/ThemeContext'

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

interface ChartPoint {
  month: string
  Punta: number
  Llano: number
  Valle: number
  Potencia: number
}

function buildChartData(offer: AnnualOfferResult): ChartPoint[] {
  return offer.months.map((m) => ({
    month: MONTH_SHORT[m.month - 1] ?? `M${m.month}`,
    Punta: m.energy_peak_term,
    Llano: m.energy_mid_term,
    Valle: m.energy_valley_term,
    Potencia: m.power_term,
  }))
}

function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((sum: number, e) => sum + (typeof e.value === 'number' ? e.value : 0), 0)
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/15 bg-white/90 dark:bg-slate-900/70 backdrop-blur-md px-3 py-2.5 shadow-xl text-xs">
      <p className="text-slate-500 dark:text-slate-400 mb-1.5 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={String(entry.name)} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ background: entry.color }}
            />
            <span className="text-slate-600 dark:text-slate-300">{String(entry.name)}</span>
          </span>
          <span className="font-semibold tabular-nums text-slate-900 dark:text-[#F8FAFC]">
            {typeof entry.value === 'number' ? `${entry.value.toFixed(2)} €` : '—'}
          </span>
        </div>
      ))}
      <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-white/10 flex justify-between">
        <span className="text-slate-500 dark:text-slate-400">Total</span>
        <span className="font-bold tabular-nums text-slate-900 dark:text-[#F8FAFC]">{total.toFixed(2)} €</span>
      </div>
    </div>
  )
}

interface Props {
  offer: AnnualOfferResult
  onClose: () => void
}

export function MonthlyBreakdownChart({ offer, onClose }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const tickColor = isDark ? '#94a3b8' : '#64748b'
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const axisLineColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'

  const chartData = buildChartData(offer)

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Desglose mensual — {offer.offer_name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{offer.provider}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar desglose"
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors text-lg leading-none px-2"
        >
          ✕
        </button>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="month"
            tick={{ fill: tickColor, fontSize: 12 }}
            axisLine={{ stroke: axisLineColor }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: tickColor, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)}€`}
            width={48}
          />
          <Tooltip content={(props) => <ChartTooltip {...props} />} />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs">{value}</span>
            )}
          />
          <Bar dataKey="Punta"    stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Llano"    stackId="a" fill="#f59e0b" />
          <Bar dataKey="Valle"    stackId="a" fill="#38bdf8" />
          <Bar dataKey="Potencia" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span>Total anual</span>
        <span className="text-slate-900 dark:text-[#F8FAFC] font-semibold">{offer.year_total.toFixed(2)} €</span>
      </div>
    </div>
  )
}
