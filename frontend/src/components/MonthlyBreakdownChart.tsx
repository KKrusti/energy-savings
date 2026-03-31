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
import type { AnnualOfferResult } from '@/types'

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

interface Props {
  offer: AnnualOfferResult
  onClose: () => void
}

export function MonthlyBreakdownChart({ offer, onClose }: Props) {
  const chartData = buildChartData(offer)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-300">
            Desglose mensual — {offer.offer_name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{offer.provider}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar desglose"
          className="text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none px-2"
        >
          ✕
        </button>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)}€`}
            width={48}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.75rem',
              color: '#f8fafc',
              fontSize: 13,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [
              typeof value === 'number' ? `${value.toFixed(2)} €` : '—',
            ]}
          />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs">{value}</span>
            )}
          />
          <Bar dataKey="Punta" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Llano" stackId="a" fill="#fb923c" />
          <Bar dataKey="Valle" stackId="a" fill="#38bdf8" />
          <Bar dataKey="Potencia" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span>Total anual</span>
        <span className="text-[#F8FAFC] font-semibold">{offer.year_total.toFixed(2)} €</span>
      </div>
    </div>
  )
}
