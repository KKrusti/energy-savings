import { Zap, Tag, TrendingDown, Clock } from 'lucide-react'
import { SimulationForm } from '@/components/SimulationForm'
import { SimulationResult } from '@/components/SimulationResult'
import { useOffers } from '@/hooks/useOffers'
import { useSimulation } from '@/hooks/useSimulation'
import type { SimulationRequest } from '@/types'

export function DashboardPage() {
  const { data: offers = [] } = useOffers()
  const simulation = useSimulation()

  const handleSimulate = (data: SimulationRequest) => {
    simulation.mutate(data)
  }

  return (
    <section>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Simula tu factura eléctrica y compara todas las ofertas de un vistazo
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <KpiCard
          icon={<Tag className="w-5 h-5 text-primary" aria-hidden="true" />}
          label="Ofertas registradas"
          value={String(offers.length)}
        />
        <KpiCard
          icon={<Clock className="w-5 h-5 text-primary-light" aria-hidden="true" />}
          label="Con permanencia"
          value={String(offers.filter((o) => o.has_permanence).length)}
        />
        <KpiCard
          icon={<TrendingDown className="w-5 h-5 text-cta" aria-hidden="true" />}
          label="Precio mín. energía"
          value={
            offers.length > 0
              ? `${Math.min(...offers.map((o) => o.energy_price_peak_kwh)).toFixed(4)} €/kWh`
              : '—'
          }
        />
      </div>

      {offers.length === 0 && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-amber-400 text-sm mb-6">
          Todavía no hay ofertas registradas. Ve a la sección{' '}
          <strong>Ofertas</strong> para añadir la primera.
        </div>
      )}

      {/* Formulario simulación */}
      <div className="mb-6">
        <SimulationForm onSubmit={handleSimulate} isLoading={simulation.isPending} />
      </div>

      {/* Error de simulación */}
      {simulation.isError && (
        <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-400 text-sm mb-6">
          {simulation.error instanceof Error ? simulation.error.message : 'Error al simular'}
        </div>
      )}

      {/* Resultados */}
      {simulation.data && (
        <SimulationResult breakdowns={simulation.data.breakdowns} />
      )}
    </section>
  )
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-glass p-5
      flex items-center gap-4">
      <div className="p-3 rounded-xl bg-white/5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-xl font-bold text-[#F8FAFC] mt-0.5">{value}</p>
      </div>
    </div>
  )
}
