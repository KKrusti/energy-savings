import { Pencil, Trash2, Zap, Clock } from 'lucide-react'
import type { Offer } from '@/types'

interface OfferCardProps {
  offer: Offer
  onEdit: (offer: Offer) => void
  onDelete: (id: number) => void
}

export function OfferCard({ offer, onEdit, onDelete }: OfferCardProps) {
  return (
    <article
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-glass p-5
        hover:bg-white/10 transition-colors duration-200"
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[#F8FAFC] truncate">{offer.name}</h3>
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
          <p className="text-sm text-slate-400 mt-0.5">{offer.provider}</p>
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
            <span className="text-xs text-slate-600">€/kWh</span>
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
            <span className="text-xs text-slate-600">€/kWh</span>
          </div>
        )}
      </div>

      {/* Compensación excedentes */}
      {offer.surplus_compensation > 0 && (
        <div className="mb-3">
          <p className="text-xs text-slate-500 mb-1">Compensación excedentes</p>
          <span className="text-sm font-medium text-emerald-400">
            {offer.surplus_compensation.toFixed(4)} €/kWh
          </span>
        </div>
      )}

      {offer.notes && (
        <p className="mt-3 text-xs text-slate-500 italic line-clamp-2 border-t border-white/5 pt-2">
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
        : 'bg-white/5 border-white/10 text-slate-300'
      }`}
    >
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  )
}
