import { useState, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TooltipContentProps } from 'recharts/types/component/Tooltip'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'
import type { AnnualSimulationResponse, AnnualOfferResult, Offer } from '@/types'
import { useTheme } from '@/context/ThemeContext'

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/**
 * Returns the last 12 calendar months in chronological order (oldest → newest),
 * pivoting on the current month — matching the same window used by MonthlyInputTable.
 * Example: today = March 2026 → [Apr 2025, May 2025, …, Mar 2026]
 */
function buildRollingMonths(now = new Date()): Array<{ month: number; year: number; label: string }> {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const m = d.getMonth() + 1
    const y = d.getFullYear()
    // Show the 2-digit year only when it differs from the previous entry to keep labels compact,
    // but always include it to avoid ambiguity on year boundaries.
    return { month: m, year: y, label: `${MONTH_SHORT[m - 1]} ${String(y).slice(2)}` }
  })
}

// Distinct palette for up to 10 offers
const LINE_COLORS = [
  '#6366f1', // indigo
  '#22d3ee', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#f43f5e', // rose
  '#a78bfa', // violet
  '#fb923c', // orange
  '#34d399', // green
  '#60a5fa', // blue
  '#e879f9', // fuchsia
]

interface ChartPoint {
  month: string
  [offerName: string]: number | string
}

function buildChartData(offers: AnnualOfferResult[], now = new Date()): ChartPoint[] {
  const rollingMonths = buildRollingMonths(now)

  // Pre-index simulation data: offer_name → Map<"month-year" → total>
  const offerIndex = new Map<string, Map<string, number>>()
  for (const offer of offers) {
    const byMonthYear = new Map<string, number>()
    for (const mb of offer.months) {
      byMonthYear.set(`${mb.month}-${mb.year}`, mb.total)
    }
    offerIndex.set(offer.offer_name, byMonthYear)
  }

  return rollingMonths.map(({ month, year, label }) => {
    const point: ChartPoint = { month: label }
    for (const offer of offers) {
      const key = `${month}-${year}`
      const total = offerIndex.get(offer.offer_name)?.get(key)
      if (total !== undefined) {
        point[offer.offer_name] = total
      }
    }
    return point
  })
}

// Fixed color for the current-tariff line so it stands out regardless of palette position
const CURRENT_TARIFF_COLOR = '#22d3ee' // cyan-400

// Custom tooltip with glass background so underlying lines remain visible
function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
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
    </div>
  )
}

interface Props {
  data: AnnualSimulationResponse
  offers: Offer[]
  onSelectOffer: (offer: AnnualOfferResult | null) => void
  selectedOfferId: number | null
}

export function AnnualCostChart({ data, offers, onSelectOffer, selectedOfferId }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const tickColor = isDark ? '#94a3b8' : '#64748b'
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const axisLineColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'

  const [hiddenOffers, setHiddenOffers] = useState<Set<string>>(new Set())

  // Build a lookup: offer_id → is_current
  const currentOfferIds = new Set(offers.filter((o) => o.is_current).map((o) => o.id))

  const toggleOffer = useCallback((offerName: string) => {
    setHiddenOffers((prev) => {
      const next = new Set(prev)
      if (next.has(offerName)) {
        next.delete(offerName)
      } else {
        next.add(offerName)
      }
      return next
    })
  }, [])

  const handleLineClick = useCallback(
    (offerName: string) => {
      const offer = data.offers.find((o) => o.offer_name === offerName) ?? null
      onSelectOffer(offer)
    },
    [data.offers, onSelectOffer],
  )

  const chartData = buildChartData(data.offers)

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 p-5">
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">Coste mensual por oferta (€)</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
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
            width={52}
          />
          <Tooltip content={(props) => <ChartTooltip {...props} />} />
          <Legend
            onClick={(e) => {
              if (e.value) toggleOffer(String(e.value))
            }}
            formatter={(value: string) => {
              const offerResult = data.offers.find((o) => o.offer_name === value)
              const isCurrent = offerResult ? currentOfferIds.has(offerResult.offer_id) : false
              return (
                <span
                  className="cursor-pointer text-xs"
                  style={{ opacity: hiddenOffers.has(value) ? 0.35 : 1 }}
                >
                  {isCurrent ? `★ ${value} (actual)` : value}
                </span>
              )
            }}
          />
          {data.offers.map((offer, i) => {
            const isCurrent = currentOfferIds.has(offer.offer_id)
            const color = isCurrent
              ? CURRENT_TARIFF_COLOR
              : LINE_COLORS[i % LINE_COLORS.length]
            const isSelected = selectedOfferId === offer.offer_id
            return (
              <Line
                key={offer.offer_id}
                type="monotone"
                dataKey={offer.offer_name}
                stroke={color}
                strokeWidth={isCurrent || isSelected ? 3 : 1.5}
                strokeDasharray={isCurrent ? '6 3' : undefined}
                dot={false}
                activeDot={{ r: 5, cursor: 'pointer', onClick: () => handleLineClick(offer.offer_name) }}
                hide={hiddenOffers.has(offer.offer_name)}
                strokeOpacity={selectedOfferId === null || isSelected ? 1 : 0.3}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
      {data.offers.length > 0 && (
        <p className="mt-2 text-xs text-slate-500 text-center">
          Haz clic en un punto de la línea para ver el desglose mensual de esa oferta
        </p>
      )}
    </div>
  )
}
