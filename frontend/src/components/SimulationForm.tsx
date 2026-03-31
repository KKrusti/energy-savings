import { useForm } from 'react-hook-form'
import { Play } from 'lucide-react'
import type { SimulationRequest } from '@/types'

interface SimulationFormProps {
  onSubmit: (data: SimulationRequest) => void
  isLoading?: boolean
}

type FormValues = {
  consumption_kwh: number
  contracted_power_kw: number
  surplus_kwh: number
  days_in_period: number
}

export function SimulationForm({ onSubmit, isLoading }: SimulationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      consumption_kwh: 300,
      contracted_power_kw: 3.45,
      surplus_kwh: 0,
      days_in_period: 30,
    },
  })

  const submit = (values: FormValues) => {
    onSubmit({ ...values, offer_id: 0 })
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-glass p-6"
      aria-label="Formulario de simulación"
    >
      <h2 className="text-base font-semibold text-[#F8FAFC] mb-5">Datos de consumo</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SimField
          label="Consumo"
          unit="kWh"
          error={errors.consumption_kwh?.message}
        >
          <input
            {...register('consumption_kwh', {
              required: 'Obligatorio',
              min: { value: 0, message: '≥ 0' },
              valueAsNumber: true,
            })}
            type="number"
            step="0.1"
            className={simInputClass(!!errors.consumption_kwh)}
            aria-label="Consumo en kWh"
          />
        </SimField>

        <SimField label="Potencia contratada" unit="kW" error={errors.contracted_power_kw?.message}>
          <input
            {...register('contracted_power_kw', {
              required: 'Obligatorio',
              min: { value: 0, message: '≥ 0' },
              valueAsNumber: true,
            })}
            type="number"
            step="0.01"
            className={simInputClass(!!errors.contracted_power_kw)}
            aria-label="Potencia contratada en kW"
          />
        </SimField>

        <SimField label="Excedentes volcados" unit="kWh">
          <input
            {...register('surplus_kwh', { min: { value: 0, message: '≥ 0' }, valueAsNumber: true })}
            type="number"
            step="0.1"
            className={simInputClass(false)}
            aria-label="Excedentes solares en kWh"
          />
        </SimField>

        <SimField label="Días del período" unit="días" error={errors.days_in_period?.message}>
          <input
            {...register('days_in_period', {
              required: 'Obligatorio',
              min: { value: 1, message: '≥ 1' },
              max: { value: 365, message: '≤ 365' },
              valueAsNumber: true,
            })}
            type="number"
            className={simInputClass(!!errors.days_in_period)}
            aria-label="Días del período de facturación"
          />
        </SimField>
      </div>

      <div className="flex justify-end mt-5">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold
            bg-cta text-white hover:bg-violet-500
            transition-colors duration-200 cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-cta/50"
        >
          <Play className="w-4 h-4" aria-hidden="true" />
          {isLoading ? 'Calculando...' : 'Simular todas las ofertas'}
        </button>
      </div>
    </form>
  )
}

function SimField({
  label,
  unit,
  error,
  children,
}: {
  label: string
  unit: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">
        {label} <span className="text-slate-600">({unit})</span>
      </label>
      {children}
      {error && <p role="alert" className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

function simInputClass(hasError: boolean) {
  return `w-full px-3 py-2 rounded-xl text-sm text-[#F8FAFC] bg-white/5
    border focus:outline-none focus:ring-2 transition-colors duration-150
    ${hasError
      ? 'border-red-400/50 focus:ring-red-400/30'
      : 'border-white/10 focus:border-primary/50 focus:ring-primary/20 hover:border-white/20'
    }`
}
