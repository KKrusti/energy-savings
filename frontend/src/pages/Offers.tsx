import { useState } from 'react'
import { Plus } from 'lucide-react'
import { OfferCard } from '@/components/OfferCard'
import { OfferForm } from '@/components/OfferForm'
import { useOffers, useCreateOffer, useUpdateOffer, useDeleteOffer } from '@/hooks/useOffers'
import type { CreateOfferInput, Offer } from '@/types'

export function OffersPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)

  const { data: offers = [], isLoading, error } = useOffers()
  const createMutation = useCreateOffer()
  const updateMutation = useUpdateOffer()
  const deleteMutation = useDeleteOffer()

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
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Ofertas tarifarias</h1>
          <p className="text-slate-400 text-sm mt-1">
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
        <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-400 text-sm">
          Error al cargar las ofertas. Comprueba que el servidor esté activo.
        </div>
      )}

      {!isLoading && !error && offers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
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
