import { useState, useCallback, useEffect } from 'react'
import { Tag, TrendingDown, Clock } from 'lucide-react'
import { MonthlyInputTable, buildDefaultMonths } from '@/components/MonthlyInputTable'
import { AnnualCostChart } from '@/components/AnnualCostChart'
import { MonthlyBreakdownChart } from '@/components/MonthlyBreakdownChart'
import { useOffers } from '@/hooks/useOffers'
import { useAnnualSimulation } from '@/hooks/useAnnualSimulation'
import { useConsumptionHistory, useSaveConsumptionHistory } from '@/hooks/useConsumptionHistory'
import type { AnnualSimulationRequest, AnnualOfferResult } from '@/types'

export function DashboardPage() {
  const { data: offers = [] } = useOffers()
  const annualSimulation = useAnnualSimulation()
  const { data: savedHistory, isSuccess: historyLoaded } = useConsumptionHistory()
  const saveHistory = useSaveConsumptionHistory()

  const [annualReq, setAnnualReq] = useState<AnnualSimulationRequest>(() => ({
    months: buildDefaultMonths(),
  }))
  const [selectedOffer, setSelectedOffer] = useState<AnnualOfferResult | null>(null)

  // Populate the table with saved history once it loads.
  // Only replace if the server returned at least one entry.
  useEffect(() => {
    if (historyLoaded && savedHistory && savedHistory.months.length > 0) {
      setAnnualReq({ months: savedHistory.months })
    }
  }, [historyLoaded, savedHistory])

  const handleAnnualSimulate = () => {
    setSelectedOffer(null)
    // Persist current table data before simulating
    saveHistory.mutate({ months: annualReq.months })
    annualSimulation.mutate(annualReq)
  }

  const handleSelectOffer = useCallback((offer: AnnualOfferResult | null) => {
    setSelectedOffer(offer)
  }, [])

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

      {/* Comparación anual */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#F8FAFC]">Comparación anual</h2>
        <p className="text-slate-400 text-sm mt-1">
          Introduce el consumo mensual por franjas y compara el coste con todas las ofertas a lo largo del año.
          Los datos se guardan automáticamente al calcular.
        </p>
      </div>

      <div className="mb-4">
        <MonthlyInputTable value={annualReq} onChange={setAnnualReq} />
      </div>

      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={handleAnnualSimulate}
          disabled={annualSimulation.isPending || offers.length === 0}
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium
            hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {annualSimulation.isPending ? 'Calculando…' : 'Calcular año completo'}
        </button>
        {saveHistory.isSuccess && (
          <span className="text-xs text-emerald-400">Datos guardados</span>
        )}
        {saveHistory.isError && (
          <span className="text-xs text-red-400">Error al guardar</span>
        )}
      </div>

      {annualSimulation.isError && (
        <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-400 text-sm mb-6">
          {annualSimulation.error instanceof Error ? annualSimulation.error.message : 'Error al calcular'}
        </div>
      )}

      {annualSimulation.data && annualSimulation.data.offers.length > 0 && (
        <div className="space-y-6">
          <AnnualCostChart
            data={annualSimulation.data}
            onSelectOffer={handleSelectOffer}
            selectedOfferId={selectedOffer?.offer_id ?? null}
          />

          {selectedOffer && (
            <MonthlyBreakdownChart
              offer={selectedOffer}
              onClose={() => setSelectedOffer(null)}
            />
          )}
        </div>
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
