import { useState, useCallback, useEffect, useMemo } from 'react'
import { Tag, TrendingDown, FileUp } from 'lucide-react'
import { MonthlyInputTable, buildDefaultMonths, monthKey, type MonthSourceMap } from '@/components/MonthlyInputTable'
import { MonthlyDetailDrawer } from '@/components/MonthlyDetailDrawer'
import { AnnualCostChart } from '@/components/AnnualCostChart'
import { MonthlyBreakdownChart } from '@/components/MonthlyBreakdownChart'
import { InvoiceUploadModal } from '@/components/InvoiceUploadModal'
import { useOffers } from '@/hooks/useOffers'
import { useAnnualSimulation } from '@/hooks/useAnnualSimulation'
import { useLastAnnualSimulation } from '@/hooks/useLastAnnualSimulation'
import { useConsumptionHistory, useSaveConsumptionHistory } from '@/hooks/useConsumptionHistory'
import type { AnnualSimulationRequest, AnnualOfferResult } from '@/types'
import type { InvoiceData } from '@/utils/parsePdfInvoice'

export function DashboardPage() {
  const { data: offers = [] } = useOffers()
  const annualSimulation = useAnnualSimulation()
  const { data: lastSimulation } = useLastAnnualSimulation()
  const { data: savedHistory, isSuccess: historyLoaded } = useConsumptionHistory()
  const saveHistory = useSaveConsumptionHistory()

  // Top 3 offers cheaper than the current tariff, sorted by year_total ascending.
  const top3 = useMemo(() => {
    if (!lastSimulation) return []
    const currentOffer = offers.find((o) => o.is_current)
    if (!currentOffer) return []
    const currentResult = lastSimulation.offers.find((r) => r.offer_id === currentOffer.id)
    if (!currentResult) return []
    const currentYearTotal = currentResult.year_total
    return lastSimulation.offers
      .filter((r) => r.offer_id !== currentOffer.id && r.year_total < currentYearTotal)
      .sort((a, b) => a.year_total - b.year_total)
      .slice(0, 3)
      .map((r) => ({
        offerName: r.offer_name,
        provider: r.provider,
        savings: currentYearTotal - r.year_total,
        savingsPct: ((currentYearTotal - r.year_total) / currentYearTotal) * 100,
      }))
  }, [lastSimulation, offers])

  const [annualReq, setAnnualReq] = useState<AnnualSimulationRequest>(() => ({
    months: buildDefaultMonths(),
  }))
  const [selectedOffer, setSelectedOffer] = useState<AnnualOfferResult | null>(null)
  const [detailMonth, setDetailMonth] = useState<{ month: number; year: number } | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [importWarning, setImportWarning] = useState<string | null>(null)
  const [monthSources, setMonthSources] = useState<MonthSourceMap>(new Map())

  // Populate the table with saved history once it loads.
  // Only replace if the server returned at least one entry.
  useEffect(() => {
    if (historyLoaded && savedHistory && savedHistory.months.length > 0) {
      setAnnualReq({ months: savedHistory.months })
      setMonthSources(new Map())
    }
  }, [historyLoaded, savedHistory])

  const handleAnnualSimulate = () => {
    setSelectedOffer(null)
    saveHistory.mutate({ months: annualReq.months })
    annualSimulation.mutate(annualReq)
  }

  const handleSelectOffer = useCallback((offer: AnnualOfferResult | null) => {
    setSelectedOffer(offer)
  }, [])

  const handleMonthClick = useCallback((month: number, year: number) => {
    setDetailMonth({ month, year })
  }, [])

  const handleCellEdit = useCallback(
    (index: number) => {
      const m = annualReq.months[index]
      setMonthSources((prev) => new Map(prev).set(monthKey(m.month, m.year), 'manual'))
    },
    [annualReq.months],
  )

  const handleInvoiceImport = useCallback(
    (data: InvoiceData) => {
      setImportWarning(null)
      const idx = annualReq.months.findIndex(
        (m) => m.month === data.month && m.year === data.year,
      )
      if (idx === -1) {
        setImportWarning(
          `La factura corresponde a ${data.month}/${data.year}, que está fuera del rango mostrado en la tabla.`,
        )
        return
      }
      const updated = annualReq.months.map((m, i) =>
        i === idx
          ? {
              ...m,
              peak_kwh: data.peak_kwh,
              mid_kwh: data.mid_kwh,
              valley_kwh: data.valley_kwh,
              power_peak_kw: data.power_peak_kw,
              power_valley_kw: data.power_valley_kw,
              surplus_kwh: data.surplus_kwh,
              iva_rate: data.iva_rate ?? 0,
            }
          : m,
      )
      setAnnualReq({ months: updated })
      setMonthSources((prev) => new Map(prev).set(monthKey(data.month, data.year), 'pdf'))
    },
    [annualReq.months],
  )

  // Use the cached result as fallback so charts survive navigation away and back
  const simulationData = annualSimulation.data ?? lastSimulation ?? undefined

  return (
    <section>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC]">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Simula tu factura eléctrica y compara todas las ofertas de un vistazo
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <KpiCard
          icon={<Tag className="w-5 h-5 text-primary" aria-hidden="true" />}
          label="Ofertas registradas"
          value={String(offers.length)}
        />
        {Array.from({ length: 3 }, (_, i) => {
          const entry = top3[i]
          return entry ? (
            <KpiCard
              key={entry.offerName}
              icon={<TrendingDown className="w-5 h-5 text-emerald-400" aria-hidden="true" />}
              label={`#${i + 1} ${entry.offerName}`}
              sublabel={entry.provider}
              value={`−${entry.savings.toFixed(0)} €/año`}
              badge={`−${entry.savingsPct.toFixed(1)}%`}
            />
          ) : (
            <KpiCardEmpty
              key={i}
              rank={i + 1}
              hasSimulation={!!lastSimulation}
              hasCurrentOffer={offers.some((o) => o.is_current)}
            />
          )
        })}
      </div>

      {offers.length === 0 && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-amber-700 dark:text-amber-400 text-sm mb-6">
          Todavía no hay ofertas registradas. Ve a la sección{' '}
          <strong>Ofertas</strong> para añadir la primera.
        </div>
      )}

      {/* Comparación anual */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-[#F8FAFC]">Comparación anual</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Introduce el consumo mensual por franjas y compara el coste con todas las ofertas a lo largo del año.
            Los datos se guardan automáticamente al calcular.
          </p>
        </div>
        <button
          onClick={() => { setImportWarning(null); setShowInvoiceModal(true) }}
          className="flex items-center gap-2 shrink-0 px-3.5 py-2 rounded-xl
            border border-slate-200 dark:border-white/10
            bg-white/80 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10
            text-sm text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          title="Importar datos desde una factura PDF de Endesa"
        >
          <FileUp className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <span className="hidden sm:inline">Importar factura</span>
        </button>
      </div>

      {importWarning && (
        <div
          role="alert"
          className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-amber-700 dark:text-amber-400 text-sm mb-4"
        >
          {importWarning}
        </div>
      )}

      <div className="mb-4">
        <MonthlyInputTable
          value={annualReq}
          onChange={setAnnualReq}
          onMonthClick={simulationData ? handleMonthClick : undefined}
          sources={monthSources}
          onCellEdit={handleCellEdit}
        />
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <button
          onClick={handleAnnualSimulate}
          disabled={annualSimulation.isPending || offers.length === 0}
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium
            hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {annualSimulation.isPending ? 'Calculando…' : 'Calcular año completo'}
        </button>

        {saveHistory.isSuccess && (
          <span className="text-xs text-emerald-500 dark:text-emerald-400">Datos guardados</span>
        )}
        {saveHistory.isError && (
          <span className="text-xs text-red-500 dark:text-red-400">Error al guardar</span>
        )}
      </div>

      {annualSimulation.isError && (
        <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-600 dark:text-red-400 text-sm mb-6">
          {annualSimulation.error instanceof Error ? annualSimulation.error.message : 'Error al calcular'}
        </div>
      )}

      {simulationData && simulationData.offers.length > 0 && (
        <div className="space-y-6">
          <AnnualCostChart
            data={simulationData}
            offers={offers}
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

      <MonthlyDetailDrawer
        month={detailMonth}
        data={simulationData}
        offers={offers}
        onClose={() => setDetailMonth(null)}
      />

      {showInvoiceModal && (
        <InvoiceUploadModal
          onImport={handleInvoiceImport}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </section>
  )
}

function KpiCard({
  icon,
  label,
  sublabel,
  value,
  badge,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  value: string
  badge?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10
      bg-white/80 dark:bg-white/5 backdrop-blur-glass p-5
      flex items-center gap-4">
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{label}</p>
        {sublabel && <p className="text-[11px] text-slate-400 dark:text-slate-600 truncate">{sublabel}</p>}
        <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
          <p className="text-xl font-bold text-emerald-500 dark:text-emerald-400">{value}</p>
          {badge && (
            <span className="text-xs font-semibold text-emerald-500">{badge}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCardEmpty({
  rank,
  hasSimulation,
  hasCurrentOffer,
}: {
  rank: number
  hasSimulation: boolean
  hasCurrentOffer: boolean
}) {
  const hint = !hasCurrentOffer
    ? 'Marca una tarifa actual en Ofertas'
    : !hasSimulation
      ? 'Calcula el año completo para ver'
      : `No hay ${rank === 1 ? 'ninguna oferta' : 'más ofertas'} más baratas`

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10
      bg-white/80 dark:bg-white/5 backdrop-blur-glass p-5
      flex items-center gap-4">
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 shrink-0">
        <TrendingDown className="w-5 h-5 text-slate-400 dark:text-slate-600" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">#{rank} mejor oferta</p>
        <p className="text-sm text-slate-400 dark:text-slate-600 mt-0.5 truncate">{hint}</p>
      </div>
    </div>
  )
}
