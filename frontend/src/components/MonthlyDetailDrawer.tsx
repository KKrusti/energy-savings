import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { AnnualSimulationResponse, MonthlyBillBreakdown } from '@/types'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface Props {
  /** Month number (1–12) and year to display. Null = drawer closed. */
  month: { month: number; year: number } | null
  /** Full annual simulation result to extract per-offer data from. */
  data: AnnualSimulationResponse | undefined
  onClose: () => void
}

/** Finds the MonthlyBillBreakdown for a given month+year from one offer's results. */
function findMonthBreakdown(
  months: MonthlyBillBreakdown[],
  month: number,
  year: number,
): MonthlyBillBreakdown | undefined {
  return months.find((m) => m.month === month && m.year === year)
}

export function MonthlyDetailDrawer({ month, data, onClose }: Props) {
  const isOpen = month !== null

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Prevent background scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen || !data) return null

  const label = `${MONTH_NAMES[(month.month - 1) % 12]} ${month.year}`
  const offers = data.offers
    .map((o) => ({ offer: o, bd: findMonthBreakdown(o.months, month.month, month.year) }))
    .filter((x): x is { offer: typeof x.offer; bd: MonthlyBillBreakdown } => x.bd !== undefined)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Desglose de ${label}`}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl flex flex-col
          bg-[#0F172A] border-l border-white/10 shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4
          bg-[#0F172A]/95 backdrop-blur border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-[#F8FAFC]">
              Desglose — {label}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Coste por oferta para este mes
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar desglose"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200
              hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-5 space-y-6">
          {offers.length === 0 && (
            <p className="text-sm text-slate-400">
              No hay datos de simulación para este mes. Pulsa "Calcular año completo" primero.
            </p>
          )}

          {offers.map(({ offer, bd }) => (
            <OfferBreakdownCard key={offer.offer_id} offerName={offer.offer_name} provider={offer.provider} bd={bd} />
          ))}
        </div>
      </aside>
    </>
  )
}

// ---------------------------------------------------------------------------
// Single-offer itemised receipt card
// ---------------------------------------------------------------------------

interface OfferBreakdownCardProps {
  offerName: string
  provider: string
  bd: MonthlyBillBreakdown
}

function OfferBreakdownCard({ offerName, provider, bd }: OfferBreakdownCardProps) {
  const energyFlat =
    bd.price_peak_kwh === bd.price_mid_kwh && bd.price_mid_kwh === bd.price_valley_kwh

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#F8FAFC]">{offerName}</p>
          <p className="text-xs text-slate-500">{provider}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Total mes</p>
          <p className="text-lg font-bold text-[#F8FAFC]">{fmt(bd.total)} €</p>
        </div>
      </div>

      {/* Itemised lines */}
      <div className="divide-y divide-white/5">
        {/* ── Energía ── */}
        <Section label="Energía" total={bd.energy_term} color="amber">
          {energyFlat ? (
            <Line
              label={`${fmtKWh(bd.peak_kwh + bd.mid_kwh + bd.valley_kwh)} kWh × ${fmtPrice(bd.price_peak_kwh)} €/kWh`}
              value={bd.energy_term}
            />
          ) : (
            <>
              <Line
                label={`Punta: ${fmtKWh(bd.peak_kwh)} kWh × ${fmtPrice(bd.price_peak_kwh)} €/kWh`}
                value={bd.energy_peak_term}
                dot="amber"
              />
              <Line
                label={`Llano: ${fmtKWh(bd.mid_kwh)} kWh × ${fmtPrice(bd.price_mid_kwh)} €/kWh`}
                value={bd.energy_mid_term}
                dot="orange"
              />
              <Line
                label={`Valle: ${fmtKWh(bd.valley_kwh)} kWh × ${fmtPrice(bd.price_valley_kwh)} €/kWh`}
                value={bd.energy_valley_term}
                dot="sky"
              />
            </>
          )}
        </Section>

        {/* ── Potencia ── */}
        <Section label="Potencia" total={bd.power_term} color="violet">
          <Line
            label={`P1: ${fmtKWh(bd.power_peak_kw)} kW × ${fmtPrice(bd.price_power_peak)} €/kW/día × ${bd.days} días`}
            value={bd.power_peak_kw * bd.price_power_peak * bd.days}
            dot="violet"
          />
          <Line
            label={`P2: ${fmtKWh(bd.power_valley_kw)} kW × ${fmtPrice(bd.price_power_valley)} €/kW/día × ${bd.days} días`}
            value={bd.power_valley_kw * bd.price_power_valley * bd.days}
            dot="slate"
          />
        </Section>

        {/* ── Excedentes ── */}
        {bd.surplus_kwh > 0 && (
          <Section label="Excedentes" total={-bd.surplus_credit} color="emerald" negative>
            <Line
              label={`${fmtKWh(bd.surplus_kwh)} kWh × ${fmtPrice(bd.price_surplus)} €/kWh`}
              value={bd.surplus_credit}
              negative
            />
          </Section>
        )}

        {/* ── Otros ── */}
        <Section label="Otros cargos" total={bd.electricity_tax + bd.meter_rental} color="slate">
          <Line label={`Imp. electricidad (${(5.11269).toFixed(5)}%)`} value={bd.electricity_tax} />
          <Line label={`Alquiler contador (${bd.days} días)`} value={bd.meter_rental} />
        </Section>

        {/* ── IVA + Total ── */}
        <div className="px-5 py-3 space-y-2">
          <Line label="IVA (21%)" value={bd.iva} />
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-sm font-semibold text-[#F8FAFC]">Total</span>
            <span className="text-sm font-bold text-[#F8FAFC]">{fmt(bd.total)} €</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DotColor = 'amber' | 'orange' | 'sky' | 'violet' | 'slate' | 'emerald'

const DOT_CLASS: Record<DotColor, string> = {
  amber:   'bg-amber-400',
  orange:  'bg-orange-400',
  sky:     'bg-sky-400',
  violet:  'bg-violet-400',
  slate:   'bg-slate-400',
  emerald: 'bg-emerald-400',
}

function Section({
  label,
  total,
  color,
  negative = false,
  children,
}: {
  label: string
  total: number
  color: DotColor
  negative?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wide text-${color}-400`}>
          {label}
        </span>
        <span className={`text-xs font-semibold ${negative ? 'text-emerald-400' : 'text-slate-300'}`}>
          {negative ? '−' : ''}{fmt(Math.abs(total))} €
        </span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Line({
  label,
  value,
  dot,
  negative = false,
}: {
  label: string
  value: number
  dot?: DotColor
  negative?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {dot && (
          <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_CLASS[dot]}`} aria-hidden="true" />
        )}
        <span className="text-xs text-slate-400 truncate">{label}</span>
      </div>
      <span className={`text-xs tabular-nums shrink-0 ${negative ? 'text-emerald-400' : 'text-slate-300'}`}>
        {negative ? '−' : ''}{fmt(Math.abs(value))} €
      </span>
    </div>
  )
}

const fmt = (n: number) => n.toFixed(2)
const fmtKWh = (n: number) => n % 1 === 0 ? String(n) : n.toFixed(3).replace(/\.?0+$/, '')
const fmtPrice = (n: number) => n.toFixed(5).replace(/0+$/, '').replace(/\.$/, '')
