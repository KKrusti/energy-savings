import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SimulationForm } from '../SimulationForm'

describe('SimulationForm', () => {
  it('renderiza los cuatro campos de entrada', () => {
    render(<SimulationForm onSubmit={vi.fn()} />)
    expect(screen.getByLabelText(/consumo en kwh/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/potencia contratada/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/excedentes solares/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/días del período/i)).toBeInTheDocument()
  })

  it('llama onSubmit con los valores del formulario', async () => {
    const onSubmit = vi.fn()
    render(<SimulationForm onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: /simular/i }))

    expect(onSubmit).toHaveBeenCalledOnce()
    const arg = onSubmit.mock.calls[0][0]
    expect(arg.consumption_kwh).toBe(300)
    expect(arg.contracted_power_kw).toBe(3.45)
    expect(arg.days_in_period).toBe(30)
  })

  it('muestra error cuando days_in_period es 0', async () => {
    render(<SimulationForm onSubmit={vi.fn()} />)
    const input = screen.getByLabelText(/días del período/i)
    await userEvent.clear(input)
    await userEvent.type(input, '0')
    await userEvent.click(screen.getByRole('button', { name: /simular/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('deshabilita el botón mientras isLoading', () => {
    render(<SimulationForm onSubmit={vi.fn()} isLoading />)
    expect(screen.getByRole('button', { name: /calculando/i })).toBeDisabled()
  })
})
