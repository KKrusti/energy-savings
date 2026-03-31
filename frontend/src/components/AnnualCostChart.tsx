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
import type { AnnualSimulationResponse, AnnualOfferResult } from '@/types'

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

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

function buildChartData(offers: AnnualOfferResult[]): ChartPoint[] {
  // Build a map month-index → point
  const points: ChartPoint[] = MONTH_SHORT.map((m) => ({ month: m }))

  for (const offer of offers) {
    for (const mb of offer.months) {
      const idx = mb.month - 1
      if (idx >= 0 && idx < 12) {
        points[idx][offer.offer_name] = mb.total
      }
    }
  }
  return points
}

interface Props {
  data: AnnualSimulationResponse
  onSelectOffer: (offer: AnnualOfferResult | null) => void
  selectedOfferId: number | null
}

export function AnnualCostChart({ data, onSelectOffer, selectedOfferId }: Props) {
  const [hiddenOffers, setHiddenOffers] = useState<Set<string>>(new Set())

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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">Coste mensual por oferta (€)</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
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
            width={52}
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
            onClick={(e) => {
              if (e.value) toggleOffer(String(e.value))
            }}
            formatter={(value: string) => (
              <span
                className="cursor-pointer text-xs"
                style={{ opacity: hiddenOffers.has(value) ? 0.35 : 1 }}
              >
                {value}
              </span>
            )}
          />
          {data.offers.map((offer, i) => (
            <Line
              key={offer.offer_id}
              type="monotone"
              dataKey={offer.offer_name}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={selectedOfferId === offer.offer_id ? 3 : 1.5}
              dot={false}
              activeDot={{ r: 5, cursor: 'pointer', onClick: () => handleLineClick(offer.offer_name) }}
              hide={hiddenOffers.has(offer.offer_name)}
              strokeOpacity={selectedOfferId === null || selectedOfferId === offer.offer_id ? 1 : 0.3}
            />
          ))}
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
