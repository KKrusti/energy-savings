import { Pencil, Trash2, Zap, Clock, Star, TrendingDown, TrendingUp, Medal } from 'lucide-react'
import type { Offer } from '@/types'

export interface AnnualSaving {
  /** Difference in euros vs. the current tariff (negative = cheaper). */
  euros: number
  /** Percentage difference vs. the current tariff (negative = cheaper). */
  percent: number
}

// Podium styling — gold / silver / bronze
const PODIUM: Record<1 | 2 | 3, {
  border: string
  ring: string
  bg: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  medalColor: string
  label: string
}> = {
  1: {
    border: 'border-amber-400/50',
    ring: 'ring-1 ring-amber-400/25',
    bg: 'bg-amber-400/5 dark:bg-amber-400/5',
    badgeBg: 'bg-amber-400/15',
    badgeText: 'text-amber-600 dark:text-amber-300',
    badgeBorder: 'border-amber-400/40',
    medalColor: 'text-amber-500 dark:text-amber-400',
    label: 'Mejor oferta',
  },
  2: {
    border: 'border-slate-400/50',
    ring: 'ring-1 ring-slate-400/20',
    bg: 'bg-slate-400/5',
    badgeBg: 'bg-slate-400/15',
    badgeText: 'text-slate-600 dark:text-slate-300',
    badgeBorder: 'border-slate-400/40',
    medalColor: 'text-slate-500 dark:text-slate-400',
    label: '2ª mejor oferta',
  },
  3: {
    border: 'border-orange-700/50',
    ring: 'ring-1 ring-orange-700/20',
    bg: 'bg-orange-700/5',
    badgeBg: 'bg-orange-700/15',
    badgeText: 'text-orange-700 dark:text-orange-400',
    badgeBorder: 'border-orange-700/40',
    medalColor: 'text-orange-700 dark:text-orange-600',
    label: '3ª mejor oferta',
  },
}

interface OfferCardProps {
  offer: Offer
  onEdit: (offer: Offer) => void
  onDelete: (id: number) => void
  /** Annual saving vs. the current tariff. Only shown when provided and the offer is not itself current. */
  annualSaving?: AnnualSaving
  /** Podium rank (1=gold, 2=silver, 3=bronze) among offers cheaper than the current tariff. */
  podiumRank?: 1 | 2 | 3
}

export function OfferCard({ offer, onEdit, onDelete, annualSaving, podiumRank }: OfferCardProps) {
  const showSaving = annualSaving !== undefined && !offer.is_current
  const isCheaper = showSaving && annualSaving.euros < 0
  const podium = podiumRank ? PODIUM[podiumRank] : null

  const borderClass = offer.is_current
    ? 'border-cyan-400/40 ring-1 ring-cyan-400/20'
    : podium
      ? `${podium.border} ${podium.ring} ${podium.bg}`
      : 'border-slate-200 dark:border-white/10'

  return (
    <article
      className={`rounded-2xl border backdrop-blur-glass p-5
        hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-200
        ${offer.is_current || podium ? '' : 'bg-white/80 dark:bg-white/5'}
        ${borderClass}`}
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">{offer.name}</h3>
            {offer.is_current && (
              <span
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                  bg-cyan-400/15 text-cyan-300 border border-cyan-400/30"
                aria-label="Tarifa actual"
              >
                <Star className="w-3 h-3 fill-cyan-300" aria-hidden="true" />
                Tarifa actual
              </span>
            )}
            {podium && (
              <span
                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                  ${podium.badgeBg} ${podium.badgeText} border ${podium.badgeBorder}`}
                aria-label={podium.label}
              >
                <Medal className={`w-3 h-3 ${podium.medalColor}`} aria-hidden="true" />
                {podium.label}
              </span>
            )}
            {offer.has_permanence && (
              <span
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                  bg-amber-500/20 text-amber-400 border border-amber-500/30"
                aria-label={`Permanencia: ${offer.permanence_months} meses`}
              >
                <Clock className="w-3 h-3" aria-hidden="true" />
                {offer.permanence_months} meses
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{offer.provider}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(offer)}
            className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10
              transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label={`Editar oferta ${offer.name}`}
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => onDelete(offer.id)}
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10
              transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400/50"
            aria-label={`Eliminar oferta ${offer.name}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Precio energía */}
      <div className="mb-3">
        <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1">
          <Zap className="w-3 h-3" aria-hidden="true" />
          Precio energía
        </p>
        {offer.energy_price_flat ? (
          <PriceBadge label="Fijo 24h" value={`${offer.energy_price_peak_kwh.toFixed(4)} €/kWh`} highlight />
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <PriceBadge label="Punta" value={`${offer.energy_price_peak_kwh.toFixed(4)}`} />
            <PriceBadge label="Llano" value={`${offer.energy_price_mid_kwh.toFixed(4)}`} />
            <PriceBadge label="Valle" value={`${offer.energy_price_valley_kwh.toFixed(4)}`} />
            <span className="text-xs text-slate-400 dark:text-slate-600">€/kWh</span>
          </div>
        )}
      </div>

      {/* Término de potencia */}
      <div className="mb-3">
        <p className="text-xs text-slate-500 mb-1.5">Término de potencia</p>
        {offer.power_term_same_price ? (
          <PriceBadge label="Único" value={`${offer.power_term_price_peak.toFixed(4)} €/kWh`} highlight />
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <PriceBadge label="Punta" value={`${offer.power_term_price_peak.toFixed(4)}`} />
            <PriceBadge label="Valle" value={`${offer.power_term_price_valley.toFixed(4)}`} />
            <span className="text-xs text-slate-400 dark:text-slate-600">€/kWh</span>
          </div>
        )}
      </div>

      {/* Compensación excedentes */}
      {offer.surplus_compensation > 0 && (
        <div className="mb-3">
          <p className="text-xs text-slate-500 mb-1">Compensación excedentes</p>
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {offer.surplus_compensation.toFixed(4)} €/kWh
          </span>
        </div>
      )}

      {showSaving && annualSaving && (
        <div className={`mb-3 flex items-center justify-between rounded-xl px-3 py-2 border
          ${isCheaper
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-400/10 dark:border-emerald-400/20'
            : 'bg-red-50 border-red-200 dark:bg-red-400/10 dark:border-red-400/20'
          }`}
        >
          <span className="text-xs text-slate-500 dark:text-slate-400">Ahorro anual vs. actual</span>
          <span className={`flex items-center gap-1 text-sm font-semibold tabular-nums
            ${isCheaper ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {isCheaper
              ? <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
              : <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            }
            {isCheaper ? '−' : '+'}{Math.abs(annualSaving.euros).toFixed(2)} €
            {' '}({isCheaper ? '−' : '+'}{Math.abs(annualSaving.percent).toFixed(1)}%)
          </span>
        </div>
      )}

      {offer.notes && (
        <p className="mt-3 text-xs text-slate-500 italic line-clamp-2 border-t border-slate-100 dark:border-white/5 pt-2">
          {offer.notes}
        </p>
      )}
    </article>
  )
}

function PriceBadge({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border
      ${highlight
        ? 'bg-primary/10 border-primary/30 text-primary'
        : 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
      }`}
    >
      <span className="text-slate-400 dark:text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  )
}
