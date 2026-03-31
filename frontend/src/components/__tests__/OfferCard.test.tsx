import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { OfferCard } from '../OfferCard'
import type { Offer } from '@/types'

const baseOffer: Offer = {
  id: 1,
  name: 'Tarifa Plana',
  provider: 'Endesa',
  energy_price_flat: true,
  energy_price_peak_kwh: 0.15,
  energy_price_mid_kwh: 0.15,
  energy_price_valley_kwh: 0.15,
  power_term_same_price: true,
  power_term_price_peak: 38.04,
  power_term_price_valley: 38.04,
  surplus_compensation: 0,
  has_permanence: false,
  permanence_months: 0,
  is_green_energy: false,
  notes: '',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('OfferCard', () => {
  it('shows name and provider', () => {
    render(<OfferCard offer={baseOffer} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Tarifa Plana')).toBeInTheDocument()
    expect(screen.getByText('Endesa')).toBeInTheDocument()
  })

  it('shows flat energy badge when energy_price_flat is true', () => {
    render(<OfferCard offer={baseOffer} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Fijo 24h')).toBeInTheDocument()
  })

  it('shows punta/llano/valle badges when energy_price_flat is false', () => {
    render(
      <OfferCard
        offer={{
          ...baseOffer,
          energy_price_flat: false,
          energy_price_peak_kwh: 0.22,
          energy_price_mid_kwh: 0.16,
          energy_price_valley_kwh: 0.09,
        }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getAllByText('Punta').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Llano')).toBeInTheDocument()
    expect(screen.getAllByText('Valle').length).toBeGreaterThanOrEqual(1)
  })

  it('shows split power badges when power_term_same_price is false', () => {
    render(
      <OfferCard
        offer={{ ...baseOffer, power_term_same_price: false, power_term_price_peak: 45, power_term_price_valley: 10 }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    // Power section shows Punta and Valle badges when split pricing
    const puntaLabels = screen.getAllByText('Punta')
    expect(puntaLabels.length).toBeGreaterThanOrEqual(1)
    const valleLabels = screen.getAllByText('Valle')
    expect(valleLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('shows permanence badge with months when has_permanence is true', () => {
    render(
      <OfferCard
        offer={{ ...baseOffer, has_permanence: true, permanence_months: 12 }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText('12 meses')).toBeInTheDocument()
  })

  it('shows surplus compensation when greater than 0', () => {
    render(
      <OfferCard offer={{ ...baseOffer, surplus_compensation: 0.06 }} onEdit={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(screen.getByText(/0\.0600/)).toBeInTheDocument()
  })

  it('hides surplus section when surplus_compensation is 0', () => {
    render(<OfferCard offer={baseOffer} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByText('Surplus compensation')).not.toBeInTheDocument()
  })

  it('calls onEdit with the offer when edit button is clicked', async () => {
    const onEdit = vi.fn()
    render(<OfferCard offer={baseOffer} onEdit={onEdit} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(onEdit).toHaveBeenCalledWith(baseOffer)
  })

  it('calls onDelete with the id when delete button is clicked', async () => {
    const onDelete = vi.fn()
    render(<OfferCard offer={baseOffer} onEdit={vi.fn()} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /eliminar/i }))
    expect(onDelete).toHaveBeenCalledWith(1)
  })
})
