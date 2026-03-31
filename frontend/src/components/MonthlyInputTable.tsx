import { useCallback } from 'react'
import type { MonthlyConsumption, AnnualSimulationRequest } from '@/types'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/**
 * Returns the last 12 calendar months in chronological order (oldest → newest).
 * Example: if today is March 2026, returns April 2025 … March 2026.
 * The reference date can be overridden for testing.
 */
export function buildDefaultMonths(now = new Date()): MonthlyConsumption[] {
  return Array.from({ length: 12 }, (_, i) => {
    // Start from 11 months ago and walk forward
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      peak_kwh: 0,
      mid_kwh: 0,
      valley_kwh: 0,
      power_peak_kw: 3.45,
      power_valley_kw: 3.45,
      surplus_kwh: 0,
    }
  })
}

interface Props {
  value: AnnualSimulationRequest
  onChange: (req: AnnualSimulationRequest) => void
  /** Called when the user clicks on a month label. Only wired when simulation data exists. */
  onMonthClick?: (month: number, year: number) => void
}

export function MonthlyInputTable({ value, onChange, onMonthClick }: Props) {
  const update = useCallback(
    (index: number, field: keyof MonthlyConsumption, raw: string) => {
      const parsed = parseFloat(raw)
      const num = isNaN(parsed) ? 0 : parsed
      const updated = value.months.map((m, i) =>
        i === index ? { ...m, [field]: num } : m,
      )
      onChange({ months: updated })
    },
    [value, onChange],
  )

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
      <table className="w-full text-sm text-slate-900 dark:text-[#F8FAFC]">
        <thead>
          <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
            <th className="px-3 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Mes</th>
            <th className="px-3 py-3 text-right font-medium text-amber-400">
              Punta<span className="block text-xs font-normal text-slate-500">kWh</span>
            </th>
            <th className="px-3 py-3 text-right font-medium text-orange-300">
              Llano<span className="block text-xs font-normal text-slate-500">kWh</span>
            </th>
            <th className="px-3 py-3 text-right font-medium text-sky-400">
              Valle<span className="block text-xs font-normal text-slate-500">kWh</span>
            </th>
            <th className="px-3 py-3 text-right font-medium text-violet-400">
              Pot. P1<span className="block text-xs font-normal text-slate-500">kW</span>
            </th>
            <th className="px-3 py-3 text-right font-medium text-slate-400">
              Pot. P2<span className="block text-xs font-normal text-slate-500">kW</span>
            </th>
            <th className="px-3 py-3 text-right font-medium text-emerald-400">
              Excedentes<span className="block text-xs font-normal text-slate-500">kWh</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {value.months.map((m, i) => (
            <tr
              key={`${m.year}-${m.month}`}
              className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              <td className="px-3 py-2 font-medium text-slate-600 dark:text-slate-300">
                {onMonthClick ? (
                  <button
                    type="button"
                    onClick={() => onMonthClick(m.month, m.year)}
                    className="text-left hover:text-primary-light transition-colors group"
                    title="Ver desglose por oferta"
                  >
                    {MONTH_NAMES[m.month - 1]}
                    <span className="ml-1 text-xs font-normal text-slate-500 group-hover:text-slate-400">
                      {m.year}
                    </span>
                    <span className="ml-1.5 text-xs text-slate-600 group-hover:text-primary-light" aria-hidden="true">↗</span>
                  </button>
                ) : (
                  <>
                    {MONTH_NAMES[m.month - 1]}
                    <span className="ml-1 text-xs font-normal text-slate-500">{m.year}</span>
                  </>
                )}
              </td>
              <NumCell
                value={m.peak_kwh}
                onChange={(v) => update(i, 'peak_kwh', v)}
                color="text-amber-400"
                label={`Punta ${MONTH_NAMES[m.month - 1]} ${m.year}`}
              />
              <NumCell
                value={m.mid_kwh}
                onChange={(v) => update(i, 'mid_kwh', v)}
                color="text-orange-300"
                label={`Llano ${MONTH_NAMES[m.month - 1]} ${m.year}`}
              />
              <NumCell
                value={m.valley_kwh}
                onChange={(v) => update(i, 'valley_kwh', v)}
                color="text-sky-400"
                label={`Valle ${MONTH_NAMES[m.month - 1]} ${m.year}`}
              />
              <NumCell
                value={m.power_peak_kw}
                onChange={(v) => update(i, 'power_peak_kw', v)}
                color="text-violet-400"
                label={`Pot. P1 ${MONTH_NAMES[m.month - 1]} ${m.year}`}
                step="0.01"
              />
              <NumCell
                value={m.power_valley_kw}
                onChange={(v) => update(i, 'power_valley_kw', v)}
                color="text-slate-400"
                label={`Pot. P2 ${MONTH_NAMES[m.month - 1]} ${m.year}`}
                step="0.01"
              />
              <NumCell
                value={m.surplus_kwh}
                onChange={(v) => update(i, 'surplus_kwh', v)}
                color="text-emerald-400"
                label={`Excedentes ${MONTH_NAMES[m.month - 1]} ${m.year}`}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface NumCellProps {
  value: number
  onChange: (raw: string) => void
  color: string
  label: string
  step?: string
  min?: string
  max?: string
}

function NumCell({ value, onChange, color, label, step = '0.1', min = '0', max }: NumCellProps) {
  return (
    <td className="px-2 py-1.5 text-right">
      <input
        type="number"
        aria-label={label}
        value={value === 0 ? '' : value}
        placeholder="0"
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className={`w-20 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-1 text-right text-sm ${color}
          focus:outline-none focus:ring-1 focus:ring-primary/60
          [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
      />
    </td>
  )
}
