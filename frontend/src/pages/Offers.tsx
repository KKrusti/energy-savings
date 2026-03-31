import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { OfferCard } from '@/components/OfferCard'
import { OfferForm } from '@/components/OfferForm'
import { useOffers, useCreateOffer, useUpdateOffer, useDeleteOffer } from '@/hooks/useOffers'
import { useLastAnnualSimulation } from '@/hooks/useLastAnnualSimulation'
import type { AnnualSaving } from '@/components/OfferCard'
import type { CreateOfferInput, Offer } from '@/types'

export function OffersPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)

  const { data: offers = [], isLoading, error } = useOffers()
  const createMutation = useCreateOffer()
  const updateMutation = useUpdateOffer()
  const deleteMutation = useDeleteOffer()
  const { data: annualSimulation } = useLastAnnualSimulation()

  // Build a map of offer_id -> AnnualSaving relative to the current tariff's year_total.
  // Also compute the podium rank (1=gold, 2=silver, 3=bronze) for offers cheaper than current.
  const { annualSavingMap, podiumRankMap } = useMemo(() => {
    const savingMap = new Map<number, AnnualSaving>()
    const rankMap = new Map<number, 1 | 2 | 3>()
    if (!annualSimulation) return { annualSavingMap: savingMap, podiumRankMap: rankMap }

    const currentOffer = offers.find((o) => o.is_current)
    if (!currentOffer) return { annualSavingMap: savingMap, podiumRankMap: rankMap }

    const currentResult = annualSimulation.offers.find((r) => r.offer_id === currentOffer.id)
    if (!currentResult || currentResult.year_total === 0) return { annualSavingMap: savingMap, podiumRankMap: rankMap }

    const currentYearTotal = currentResult.year_total
    const cheaper: Array<{ offer_id: number; year_total: number }> = []

    for (const result of annualSimulation.offers) {
      if (result.offer_id === currentOffer.id) continue
      const diff = result.year_total - currentYearTotal
      savingMap.set(result.offer_id, {
        euros: diff,
        percent: (diff / currentYearTotal) * 100,
      })
      if (diff < 0) cheaper.push({ offer_id: result.offer_id, year_total: result.year_total })
    }

    cheaper.sort((a, b) => a.year_total - b.year_total)
    cheaper.slice(0, 3).forEach(({ offer_id }, i) => {
      rankMap.set(offer_id, (i + 1) as 1 | 2 | 3)
    })

    return { annualSavingMap: savingMap, podiumRankMap: rankMap }
  }, [annualSimulation, offers])

  const handleSubmit = async (data: CreateOfferInput) => {
    if (editingOffer) {
      await updateMutation.mutateAsync({ id: editingOffer.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
    setShowForm(false)
    setEditingOffer(null)
  }

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Eliminar esta oferta?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const handleClose = () => {
    setShowForm(false)
    setEditingOffer(null)
  }

  const isMutating = createMutation.isPending || updateMutation.isPending

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC]">Ofertas tarifarias</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Registra las tarifas que encuentres para compararlas
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
            bg-primary text-[#0F172A] hover:bg-primary-light
            transition-colors duration-200 cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Nueva oferta
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20" aria-live="polite" aria-busy="true">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-600 dark:text-red-400 text-sm">
          Error al cargar las ofertas. Comprueba que el servidor esté activo.
        </div>
      )}

      {!isLoading && !error && offers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
          <p className="text-base mb-2">No hay ofertas registradas todavía</p>
          <p className="text-sm">Pulsa «Nueva oferta» para añadir la primera</p>
        </div>
      )}

      {offers.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-label="Lista de ofertas">
          {offers.map((offer) => (
            <li key={offer.id}>
              <OfferCard
                offer={offer}
                onEdit={handleEdit}
                onDelete={handleDelete}
                annualSaving={annualSavingMap.get(offer.id)}
                podiumRank={podiumRankMap.get(offer.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <OfferForm
          offer={editingOffer}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          isLoading={isMutating}
        />
      )}
    </section>
  )
}
