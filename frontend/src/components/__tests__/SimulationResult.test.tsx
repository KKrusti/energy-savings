import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SimulationResult } from '../SimulationResult'
import type { BillBreakdown } from '@/types'

const makeBreakdown = (overrides: Partial<BillBreakdown>): BillBreakdown => ({
  offer_id: 1,
  offer_name: 'Oferta A',
  provider: 'Endesa',
  energy_term: 45.0,
  power_term: 10.79,
  surplus_credit: 0,
  electricity_tax: 2.86,
  meter_rental: 0.8,
  iva: 12.48,
  total: 71.93,
  ...overrides,
})

describe('SimulationResult', () => {
  it('no renderiza nada con lista vacía', () => {
    const { container } = render(<SimulationResult breakdowns={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('muestra la oferta más económica como ganadora', () => {
    const breakdowns = [
      makeBreakdown({ offer_id: 1, offer_name: 'Cara', total: 100 }),
      makeBreakdown({ offer_id: 2, offer_name: 'Barata', total: 60 }),
    ]
    render(<SimulationResult breakdowns={breakdowns} />)
    expect(screen.getByText('Oferta más económica')).toBeInTheDocument()
    expect(screen.getAllByText('Barata').length).toBeGreaterThan(0)
  })

  it('muestra todos los breakdowns en la tabla', () => {
    const breakdowns = [
      makeBreakdown({ offer_id: 1, offer_name: 'A', total: 80 }),
      makeBreakdown({ offer_id: 2, offer_name: 'B', total: 70 }),
      makeBreakdown({ offer_id: 3, offer_name: 'C', total: 90 }),
    ]
    render(<SimulationResult breakdowns={breakdowns} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(4) // 1 header + 3 data
  })

  it('muestra la compensación en verde con signo negativo', () => {
    const breakdown = makeBreakdown({ surplus_credit: 12.5 })
    render(<SimulationResult breakdowns={[breakdown]} />)
    expect(screen.getByText('-12.50 €')).toBeInTheDocument()
  })

  it('muestra guion cuando no hay compensación', () => {
    const breakdown = makeBreakdown({ surplus_credit: 0 })
    render(<SimulationResult breakdowns={[breakdown]} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('ordena por total de menor a mayor', () => {
    const breakdowns = [
      makeBreakdown({ offer_id: 1, offer_name: 'Costosa', total: 100 }),
      makeBreakdown({ offer_id: 2, offer_name: 'Barata', total: 50 }),
    ]
    render(<SimulationResult breakdowns={breakdowns} />)
    const rows = screen.getAllByRole('row').slice(1) // quitar header
    expect(rows[0]).toHaveTextContent('Barata')
    expect(rows[1]).toHaveTextContent('Costosa')
  })
})
