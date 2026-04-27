import { useRef, useState } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { parsePdfInvoice, InvoiceParseError, type InvoiceData } from '@/utils/parsePdfInvoice'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface Props {
  onImport: (data: InvoiceData) => void
  onClose: () => void
}

type State =
  | { status: 'idle' }
  | { status: 'parsing' }
  | { status: 'success'; data: InvoiceData; fileName: string }
  | { status: 'error'; message: string }

export function InvoiceUploadModal({ onImport, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<State>({ status: 'idle' })

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setState({ status: 'error', message: 'El archivo debe ser un PDF.' })
      return
    }
    setState({ status: 'parsing' })
    try {
      const data = await parsePdfInvoice(file)
      setState({ status: 'success', data, fileName: file.name })
    } catch (err) {
      const message =
        err instanceof InvoiceParseError
          ? err.message
          : 'Error inesperado al procesar la factura.'
      setState({ status: 'error', message })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleConfirm = () => {
    if (state.status !== 'success') return
    onImport(state.data)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F172A] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/10">
          <h2
            id="invoice-modal-title"
            className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-amber-400" aria-hidden="true" />
            Importar factura PDF
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          {state.status !== 'success' && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
                border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-white/5
                hover:border-amber-400/60 hover:bg-amber-400/5 transition-colors
                p-8 cursor-pointer"
            >
              {state.status === 'parsing' ? (
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {state.status === 'parsing'
                    ? 'Leyendo factura…'
                    : 'Haz clic o arrastra aquí tu factura PDF'}
                </p>
                {state.status === 'idle' && (
                  <p className="text-xs text-slate-400 mt-1">Facturas de Endesa (2.0TD)</p>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                className="sr-only"
                aria-label="Seleccionar factura PDF"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                  e.target.value = ''
                }}
              />
            </div>
          )}

          {/* Error state */}
          {state.status === 'error' && (
            <div className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  No se pudo leer la factura
                </p>
                <p className="text-xs text-red-500/80 dark:text-red-400/70 mt-0.5">
                  {state.message}
                </p>
                <button
                  onClick={() => {
                    setState({ status: 'idle' })
                    inputRef.current?.click()
                  }}
                  className="mt-2 text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer"
                >
                  Intentar con otro archivo
                </button>
              </div>
            </div>
          )}

          {/* Success preview */}
          {state.status === 'success' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="font-medium truncate" title={state.fileName}>
                  {state.fileName}
                </span>
              </div>

              {/* Billing period */}
              <div className="rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                  Período de facturación
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                  {MONTH_NAMES[state.data.month - 1]} {state.data.year}
                </p>
              </div>

              {/* Data preview */}
              <div className="rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 space-y-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                  Datos extraídos
                </p>
                <DataRow label="Consumo Punta" value={state.data.peak_kwh} unit="kWh" color="text-amber-400" />
                <DataRow label="Consumo Llano" value={state.data.mid_kwh} unit="kWh" color="text-orange-300" />
                <DataRow label="Consumo Valle" value={state.data.valley_kwh} unit="kWh" color="text-sky-400" />
                <div className="my-1 border-t border-slate-200 dark:border-white/10" />
                <DataRow label="Excedentes vertidos" value={state.data.surplus_kwh} unit="kWh" color="text-emerald-400" />
                {state.data.iva_rate !== null && (
                  <DataRow label="IVA detectado" value={Math.round(state.data.iva_rate * 10000) / 100} unit="%" color="text-slate-300 dark:text-slate-400" />
                )}
                <div className="my-1 border-t border-slate-200 dark:border-white/10" />
                <DataRow label="Potencia Punta-Llano" value={state.data.power_peak_kw} unit="kW" color="text-violet-400" />
                <DataRow label="Potencia Valle" value={state.data.power_valley_kw} unit="kW" color="text-slate-400" />
              </div>

              <button
                onClick={() => setState({ status: 'idle' })}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                Cargar otra factura
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400
              hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={state.status !== 'success'}
            className="px-4 py-2 rounded-xl bg-amber-400 text-slate-900 text-sm font-medium
              hover:bg-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Importar datos
          </button>
        </div>
      </div>
    </div>
  )
}

function DataRow({
  label,
  value,
  unit,
  color,
}: {
  label: string
  value: number
  unit: string
  color: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-medium tabular-nums ${color}`}>
        {value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}{' '}
        <span className="text-xs text-slate-400">{unit}</span>
      </span>
    </div>
  )
}
