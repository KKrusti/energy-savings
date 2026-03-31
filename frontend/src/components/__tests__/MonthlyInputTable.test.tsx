import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { MonthlyInputTable, buildDefaultMonths } from '../MonthlyInputTable'
import type { AnnualSimulationRequest } from '@/types'

// Fixed reference date: March 2026 → last 12 months = April 2025 … March 2026
const REF_DATE = new Date(2026, 2, 15) // month is 0-indexed

function makeRequest(): AnnualSimulationRequest {
  return { months: buildDefaultMonths(REF_DATE) }
}

// Stateful wrapper so input changes propagate back through value prop
function ControlledWrapper({ onChange }: { onChange: (r: AnnualSimulationRequest) => void }) {
  const [req, setReq] = useState<AnnualSimulationRequest>(makeRequest())
  return (
    <MonthlyInputTable
      value={req}
      onChange={(r) => {
        setReq(r)
        onChange(r)
      }}
    />
  )
}

describe('MonthlyInputTable', () => {
  it('renders 12 month rows', () => {
    render(<MonthlyInputTable value={makeRequest()} onChange={vi.fn()} />)
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    for (const name of monthNames) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('renders column headers', () => {
    render(<MonthlyInputTable value={makeRequest()} onChange={vi.fn()} />)
    expect(screen.getByText('Punta')).toBeInTheDocument()
    expect(screen.getByText('Llano')).toBeInTheDocument()
    expect(screen.getByText('Valle')).toBeInTheDocument()
    expect(screen.getByText('Pot. P1')).toBeInTheDocument()
    expect(screen.getByText('Pot. P2')).toBeInTheDocument()
    expect(screen.getByText('Excedentes')).toBeInTheDocument()
  })

  it('calls onChange with updated peak_kwh when input changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ControlledWrapper onChange={onChange} />)

    // First row = April 2025 (oldest of the 12 months)
    const peakInput = screen.getByLabelText('Punta Abril 2025')
    await user.clear(peakInput)
    await user.type(peakInput, '150')

    expect(onChange).toHaveBeenCalled()
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as AnnualSimulationRequest
    expect(lastCall.months[0].peak_kwh).toBe(150)
  })

  it('calls onChange with updated surplus_kwh when excedentes input changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ControlledWrapper onChange={onChange} />)

    // First row = April 2025
    const surplusInput = screen.getByLabelText('Excedentes Abril 2025')
    await user.clear(surplusInput)
    await user.type(surplusInput, '30')

    expect(onChange).toHaveBeenCalled()
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as AnnualSimulationRequest
    expect(lastCall.months[0].surplus_kwh).toBe(30)
  })

  it('calls onChange with updated power_peak_kw when P1 input changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ControlledWrapper onChange={onChange} />)

    const p1Input = screen.getByLabelText('Pot. P1 Abril 2025')
    await user.clear(p1Input)
    await user.type(p1Input, '4.6')

    expect(onChange).toHaveBeenCalled()
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as AnnualSimulationRequest
    expect(lastCall.months[0].power_peak_kw).toBeCloseTo(4.6)
  })

  it('buildDefaultMonths returns 12 months in chronological order', () => {
    const months = buildDefaultMonths(REF_DATE)
    expect(months).toHaveLength(12)
    // Oldest: April 2025
    expect(months[0].month).toBe(4)
    expect(months[0].year).toBe(2025)
    // Newest: March 2026
    expect(months[11].month).toBe(3)
    expect(months[11].year).toBe(2026)
  })

  it('buildDefaultMonths initialises surplus_kwh and power fields', () => {
    const months = buildDefaultMonths(REF_DATE)
    expect(months[0].surplus_kwh).toBe(0)
    expect(months[0].power_peak_kw).toBe(3.45)
    expect(months[0].power_valley_kw).toBe(3.45)
  })

  it('buildDefaultMonths handles year boundary correctly', () => {
    // Reference: January 2026 → last 12 months = Feb 2025 … Jan 2026
    const ref = new Date(2026, 0, 1)
    const months = buildDefaultMonths(ref)
    expect(months[0].month).toBe(2)
    expect(months[0].year).toBe(2025)
    expect(months[11].month).toBe(1)
    expect(months[11].year).toBe(2026)
  })
})
