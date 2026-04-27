import { useEffect } from 'react'
import { X, Download, Zap, Leaf, Lock } from 'lucide-react'
import { usePublicOffers, useImportOffer } from '@/hooks/useOffers'
import type { Offer } from '@/types'

interface PublicOffersModalProps {
  onClose: () => void
}

export function PublicOffersModal({ onClose }: PublicOffersModalProps) {
  const { data: offers = [], isLoading, error, refetch } = usePublicOffers()
  const importMutation = useImportOffer()

  // Trigger fetch when the modal opens
  useEffect(() => {
    refetch()
  }, [refetch])

  const handleImport = async (offer: Offer) => {
    if (importMutation.isPending) return
    await importMutation.mutateAsync(offer.id)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-offers-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl rounded-2xl border
        border-slate-200 dark:border-white/10
        bg-white dark:bg-[#0F172A]/95
        backdrop-blur-glass shadow-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/[0.08]">
          <div>
            <h2 id="public-offers-title" className="text-lg font-semibold text-slate-900 dark:text-[#F8FAFC]">
              Ofertas compartidas por usuarios
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Importa cualquier oferta para añadirla a tu perfil privado
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-[#F8FAFC]
              hover:bg-slate-100 dark:hover:bg-white/5
              transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-16" aria-live="polite" aria-busy="true">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-600 dark:text-red-400 text-sm">
              Error al cargar las ofertas públicas. Inténtalo de nuevo.
            </div>
          )}

          {!isLoading && !error && offers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <p className="text-base mb-1">No hay ofertas públicas todavía</p>
              <p className="text-sm">Sé el primero en compartir una oferta desde el formulario de edición</p>
            </div>
          )}

          {offers.length > 0 && (
            <ul className="space-y-3" aria-label="Ofertas públicas">
              {offers.map((offer) => (
                <li key={offer.id}>
                  <PublicOfferRow
                    offer={offer}
                    onImport={handleImport}
                    isImporting={importMutation.isPending && importMutation.variables === offer.id}
                    importedId={importMutation.isSuccess ? importMutation.data?.id : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

interface PublicOfferRowProps {
  offer: Offer
  onImport: (offer: Offer) => void
  isImporting: boolean
  importedId?: number
}

function PublicOfferRow({ offer, onImport, isImporting }: PublicOfferRowProps) {
  const peakPrice = offer.energy_price_flat
    ? offer.energy_price_peak_kwh
    : offer.energy_price_peak_kwh

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08]
      bg-slate-50 dark:bg-white/[0.03] p-4
      hover:border-primary/40 transition-colors duration-150">

      <div className="flex items-start justify-between gap-4">
        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
              {offer.name}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">·</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {offer.provider}
            </span>

            {offer.is_green_energy && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium
                bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border border-emerald-400/20">
                <Leaf className="w-3 h-3" aria-hidden="true" />
                Verde
              </span>
            )}
            {offer.has_permanence && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium
                bg-amber-400/10 text-amber-600 dark:text-amber-400 border border-amber-400/20">
                <Lock className="w-3 h-3" aria-hidden="true" />
                {offer.permanence_months}m
              </span>
            )}
          </div>

          {/* Prices */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {offer.energy_price_flat ? (
              <PriceBadge label="Energía" value={peakPrice} unit="€/kWh" color="blue" />
            ) : (
              <>
                <PriceBadge label="Punta" value={offer.energy_price_peak_kwh} unit="€/kWh" color="orange" />
                <PriceBadge label="Llano" value={offer.energy_price_mid_kwh} unit="€/kWh" color="yellow" />
                <PriceBadge label="Valle" value={offer.energy_price_valley_kwh} unit="€/kWh" color="blue" />
              </>
            )}
            <PriceBadge label="Potencia" value={offer.power_term_price_peak} unit="€/kW/día" color="violet" />
            {offer.surplus_compensation > 0 && (
              <PriceBadge label="Excedente" value={offer.surplus_compensation} unit="€/kWh" color="emerald" />
            )}
          </div>

          {offer.notes && (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-2 line-clamp-2">
              {offer.notes}
            </p>
          )}
        </div>

        {/* Import button */}
        <button
          type="button"
          onClick={() => onImport(offer)}
          disabled={isImporting}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-400/20
            hover:bg-violet-500/20 transition-colors duration-150 cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-violet-400/30"
          aria-label={`Importar oferta ${offer.name}`}
        >
          {isImporting ? (
            <span className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin" aria-hidden="true" />
          ) : (
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          Importar
        </button>
      </div>
    </div>
  )
}

type BadgeColor = 'blue' | 'orange' | 'yellow' | 'violet' | 'emerald'

const badgeColors: Record<BadgeColor, string> = {
  blue:    'bg-blue-400/10 text-blue-600 dark:text-blue-400 border-blue-400/20',
  orange:  'bg-orange-400/10 text-orange-600 dark:text-orange-400 border-orange-400/20',
  yellow:  'bg-yellow-400/10 text-yellow-600 dark:text-yellow-500 border-yellow-400/20',
  violet:  'bg-violet-400/10 text-violet-600 dark:text-violet-400 border-violet-400/20',
  emerald: 'bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/20',
}

function PriceBadge({ label, value, unit, color }: { label: string; value: number; unit: string; color: BadgeColor }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${badgeColors[color]}`}>
      <Zap className="w-2.5 h-2.5" aria-hidden="true" />
      {label} {value.toFixed(4)} {unit}
    </span>
  )
}
