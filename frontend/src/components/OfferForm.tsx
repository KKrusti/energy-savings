import { forwardRef, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { X } from 'lucide-react'
import type { CreateOfferInput, Offer } from '@/types'

interface OfferFormProps {
  offer?: Offer | null
  onSubmit: (data: CreateOfferInput) => void
  onCancel: () => void
  isLoading?: boolean
}

type FormValues = CreateOfferInput

const defaultValues: FormValues = {
  name: '',
  provider: '',
  energy_price_flat: false,
  energy_price_peak_kwh: 0,
  energy_price_mid_kwh: 0,
  energy_price_valley_kwh: 0,
  power_term_same_price: false,
  power_term_price_peak: 0,
  power_term_price_valley: 0,
  surplus_compensation: 0,
  has_permanence: false,
  permanence_months: 0,
  is_green_energy: false,
  notes: '',
  is_current: false,
}

export function OfferForm({ offer, onSubmit, onCancel, isLoading }: OfferFormProps) {
  const { register, handleSubmit, reset, setValue, control, formState: { errors } } =
    useForm<FormValues>({ defaultValues })

  const energyFlat = useWatch({ control, name: 'energy_price_flat' })
  const powerSame = useWatch({ control, name: 'power_term_same_price' })
  const hasPermanence = useWatch({ control, name: 'has_permanence' })

  useEffect(() => {
    reset(offer ? {
      name: offer.name,
      provider: offer.provider,
      energy_price_flat: offer.energy_price_flat,
      energy_price_peak_kwh: offer.energy_price_peak_kwh,
      energy_price_mid_kwh: offer.energy_price_mid_kwh,
      energy_price_valley_kwh: offer.energy_price_valley_kwh,
      power_term_same_price: offer.power_term_same_price,
      power_term_price_peak: offer.power_term_price_peak,
      power_term_price_valley: offer.power_term_price_valley,
      surplus_compensation: offer.surplus_compensation,
      has_permanence: offer.has_permanence,
      permanence_months: offer.permanence_months,
      is_green_energy: offer.is_green_energy,
      notes: offer.notes,
      is_current: offer.is_current,
    } : defaultValues)
  }, [offer, reset])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      <div className="relative w-full max-w-xl rounded-2xl border
        border-slate-200 dark:border-white/10
        bg-white dark:bg-[#0F172A]/95
        backdrop-blur-glass shadow-2xl p-6 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-6">
          <h2 id="offer-form-title" className="text-lg font-semibold text-slate-900 dark:text-[#F8FAFC]">
            {offer ? 'Editar oferta' : 'Nueva oferta'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-[#F8FAFC]
              hover:bg-slate-100 dark:hover:bg-white/5
              transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20"
            aria-label="Cerrar formulario"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

          {/* ── General ── */}
          <Section title="General">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre de la oferta" required error={errors.name?.message}>
                <input
                  {...register('name', { required: 'El nombre es obligatorio' })}
                  type="text"
                  placeholder="Ej. Tarifa Noche Activa"
                  className={inputClass(!!errors.name)}
                  aria-required="true"
                />
              </Field>
              <Field label="Comercializadora" required error={errors.provider?.message}>
                <input
                  {...register('provider', { required: 'La comercializadora es obligatoria' })}
                  type="text"
                  placeholder="Ej. Endesa, Iberdrola…"
                  className={inputClass(!!errors.provider)}
                  aria-required="true"
                />
              </Field>
            </div>
          </Section>

          {/* ── Precio energía ── */}
          <Section title="Precio energía (€/kWh)">
            <CheckboxToggle
              id="energy_price_flat"
              label="Precio fijo 24h (mismo precio todo el día)"
              {...register('energy_price_flat')}
            />
            {energyFlat ? (
              <Field label="Precio único" required error={errors.energy_price_peak_kwh?.message}>
                <input
                  {...register('energy_price_peak_kwh', {
                    required: 'Obligatorio',
                    min: { value: 0, message: '≥ 0' },
                    valueAsNumber: true,
                  })}
                  type="number" step="0.0001" placeholder="0.1500"
                  className={inputClass(!!errors.energy_price_peak_kwh)}
                  aria-required="true"
                />
              </Field>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <Field label="Punta" required error={errors.energy_price_peak_kwh?.message}>
                  <input
                    {...register('energy_price_peak_kwh', {
                      required: 'Obligatorio',
                      min: { value: 0, message: '≥ 0' },
                      valueAsNumber: true,
                    })}
                    type="number" step="0.0001" placeholder="0.2200"
                    className={inputClass(!!errors.energy_price_peak_kwh)}
                    aria-required="true"
                  />
                </Field>
                <Field label="Llano" required error={errors.energy_price_mid_kwh?.message}>
                  <input
                    {...register('energy_price_mid_kwh', {
                      required: 'Obligatorio',
                      min: { value: 0, message: '≥ 0' },
                      valueAsNumber: true,
                    })}
                    type="number" step="0.0001" placeholder="0.1600"
                    className={inputClass(!!errors.energy_price_mid_kwh)}
                    aria-required="true"
                  />
                </Field>
                <Field label="Valle" required error={errors.energy_price_valley_kwh?.message}>
                  <input
                    {...register('energy_price_valley_kwh', {
                      required: 'Obligatorio',
                      min: { value: 0, message: '≥ 0' },
                      valueAsNumber: true,
                    })}
                    type="number" step="0.0001" placeholder="0.0900"
                    className={inputClass(!!errors.energy_price_valley_kwh)}
                    aria-required="true"
                  />
                </Field>
              </div>
            )}
          </Section>

          {/* ── Término de potencia ── */}
          <Section title="Término de potencia (€/kWh)">
            <CheckboxToggle
              id="power_term_same_price"
              label="Mismo precio en punta y valle"
              {...register('power_term_same_price')}
            />
            {powerSame ? (
              <Field label="Precio único" required error={errors.power_term_price_peak?.message}>
                <input
                  {...register('power_term_price_peak', {
                    required: 'Obligatorio',
                    min: { value: 0, message: '≥ 0' },
                    valueAsNumber: true,
                  })}
                  type="number" step="0.0001" placeholder="0.1045"
                  className={inputClass(!!errors.power_term_price_peak)}
                  aria-required="true"
                />
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Punta" required error={errors.power_term_price_peak?.message}>
                  <input
                    {...register('power_term_price_peak', {
                      required: 'Obligatorio',
                      min: { value: 0, message: '≥ 0' },
                      valueAsNumber: true,
                    })}
                    type="number" step="0.0001" placeholder="0.1500"
                    className={inputClass(!!errors.power_term_price_peak)}
                    aria-required="true"
                  />
                </Field>
                <Field label="Valle" required error={errors.power_term_price_valley?.message}>
                  <input
                    {...register('power_term_price_valley', {
                      required: 'Obligatorio',
                      min: { value: 0, message: '≥ 0' },
                      valueAsNumber: true,
                    })}
                    type="number" step="0.0001" placeholder="0.0500"
                    className={inputClass(!!errors.power_term_price_valley)}
                    aria-required="true"
                  />
                </Field>
              </div>
            )}
          </Section>

          {/* ── Otros ── */}
          <Section title="Otros">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Compensación excedentes (€/kWh)">
                <input
                  {...register('surplus_compensation', {
                    min: { value: 0, message: '≥ 0' },
                    valueAsNumber: true,
                  })}
                  type="number" step="0.0001" placeholder="0.0600"
                  className={inputClass(false)}
                />
                <p className="text-xs text-slate-500 mt-1">Dejar en 0 si no hay compensación solar</p>
              </Field>

              {/* Permanencia */}
              <div>
                <fieldset>
                  <legend className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    Permanencia
                  </legend>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-300">
                      <input
                        type="radio"
                        name="permanence_radio"
                        className="accent-primary cursor-pointer"
                        checked={!hasPermanence}
                        onChange={() => {
                          setValue('has_permanence', false)
                          setValue('permanence_months', 0)
                        }}
                      />
                      No
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-300">
                      <input
                        type="radio"
                        name="permanence_radio"
                        className="accent-primary cursor-pointer"
                        checked={hasPermanence}
                        onChange={() => setValue('has_permanence', true)}
                      />
                      Sí
                    </label>
                  </div>
                </fieldset>
                {hasPermanence && (
                  <div className="mt-3">
                    <Field label="Meses" required error={errors.permanence_months?.message}>
                      <input
                        {...register('permanence_months', {
                          required: 'Obligatorio',
                          min: { value: 1, message: '≥ 1' },
                          max: { value: 60, message: '≤ 60' },
                          valueAsNumber: true,
                        })}
                        type="number" placeholder="12"
                        className={inputClass(!!errors.permanence_months)}
                        aria-required="true"
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>

            <Field label="Notas">
              <textarea
                {...register('notes')}
                rows={2}
                placeholder="Condiciones especiales, vigencia, enlace…"
                className={`${inputClass(false)} resize-none`}
              />
            </Field>

            <CheckboxToggle
              id="is_current"
              label="Esta es mi tarifa actual (referencia de comparación)"
              {...register('is_current')}
            />
          </Section>

          {/* ── Acciones ── */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-sm font-medium
                text-slate-500 dark:text-slate-400
                hover:text-slate-800 dark:hover:text-[#F8FAFC]
                hover:bg-slate-100 dark:hover:bg-white/5
                transition-colors duration-200 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-[#0F172A]
                hover:bg-primary-light transition-colors duration-200 cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {isLoading ? 'Guardando…' : offer ? 'Guardar cambios' : 'Crear oferta'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08]
      bg-slate-50 dark:bg-white/[0.03] p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
      {children}
    </div>
  )
}

function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-primary ml-0.5" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && <p role="alert" className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
    </div>
  )
}

const CheckboxToggle = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string }
>(({ label, id, ...props }, ref) => (
  <label htmlFor={id} className="flex items-center gap-2 cursor-pointer group mb-1">
    <input
      ref={ref}
      id={id}
      type="checkbox"
      className="w-4 h-4 rounded border-slate-300 dark:border-white/20
        bg-white dark:bg-white/5 accent-primary cursor-pointer"
      {...props}
    />
    <span className="text-sm text-slate-500 dark:text-slate-400
      group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors duration-150">
      {label}
    </span>
  </label>
))
CheckboxToggle.displayName = 'CheckboxToggle'

function inputClass(hasError: boolean) {
  return `w-full px-3 py-2 rounded-xl text-sm
    text-slate-900 dark:text-[#F8FAFC]
    bg-white dark:bg-white/5
    border placeholder-slate-400 dark:placeholder-slate-600
    focus:outline-none focus:ring-2 transition-colors duration-150
    ${hasError
      ? 'border-red-400/50 focus:ring-red-400/30'
      : 'border-slate-300 dark:border-white/10 focus:border-primary/50 focus:ring-primary/20 hover:border-slate-400 dark:hover:border-white/20'
    }`
}
