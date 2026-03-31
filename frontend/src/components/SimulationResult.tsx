import { Trophy } from 'lucide-react'
import type { BillBreakdown } from '@/types'

interface SimulationResultProps {
  breakdowns: BillBreakdown[]
}

export function SimulationResult({ breakdowns }: SimulationResultProps) {
  if (breakdowns.length === 0) return null

  const sorted = [...breakdowns].sort((a, b) => a.total - b.total)
  const cheapest = sorted[0]

  return (
    <section aria-label="Resultados de simulación">
      <h2 className="text-base font-semibold text-[#F8FAFC] mb-4">Comparativa de ofertas</h2>

      {/* Tarjeta ganadora */}
      <div className="rounded-2xl border border-primary/40 bg-primary/10 backdrop-blur-glass p-4 mb-4
        flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
          <div>
            <p className="text-xs text-slate-400">Oferta más económica</p>
            <p className="font-semibold text-[#F8FAFC]">{cheapest.offer_name}</p>
            <p className="text-xs text-slate-400">{cheapest.provider}</p>
          </div>
        </div>
        <p className="text-2xl font-bold text-primary shrink-0">
          {cheapest.total.toFixed(2)} €
        </p>
      </div>

      {/* Tabla comparativa */}
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm" aria-label="Tabla comparativa de facturas">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th scope="col" className="text-left px-4 py-3 text-slate-400 font-medium">Oferta</th>
              <th scope="col" className="text-right px-4 py-3 text-slate-400 font-medium">Energía</th>
              <th scope="col" className="text-right px-4 py-3 text-slate-400 font-medium">Potencia</th>
              <th scope="col" className="text-right px-4 py-3 text-slate-400 font-medium">Compensación</th>
              <th scope="col" className="text-right px-4 py-3 text-slate-400 font-medium">Impuesto elec.</th>
              <th scope="col" className="text-right px-4 py-3 text-slate-400 font-medium">Contador</th>
              <th scope="col" className="text-right px-4 py-3 text-slate-400 font-medium">IVA</th>
              <th scope="col" className="text-right px-4 py-3 text-primary font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b, i) => (
              <tr
                key={b.offer_id}
                className={`border-b border-white/5 transition-colors duration-150
                  ${i === 0 ? 'bg-primary/5' : 'hover:bg-white/5'}`}
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-[#F8FAFC]">{b.offer_name}</p>
                  <p className="text-xs text-slate-500">{b.provider}</p>
                </td>
                <td className="px-4 py-3 text-right text-slate-300">{b.energy_term.toFixed(2)} €</td>
                <td className="px-4 py-3 text-right text-slate-300">{b.power_term.toFixed(2)} €</td>
                <td className="px-4 py-3 text-right text-emerald-400">
                  {b.surplus_credit > 0 ? `-${b.surplus_credit.toFixed(2)} €` : '—'}
                </td>
                <td className="px-4 py-3 text-right text-slate-300">{b.electricity_tax.toFixed(2)} €</td>
                <td className="px-4 py-3 text-right text-slate-300">{b.meter_rental.toFixed(2)} €</td>
                <td className="px-4 py-3 text-right text-slate-300">{b.iva.toFixed(2)} €</td>
                <td className="px-4 py-3 text-right font-semibold text-primary">{b.total.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
