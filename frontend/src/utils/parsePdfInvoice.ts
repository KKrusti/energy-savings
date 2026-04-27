import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

export interface InvoiceData {
  month: number
  year: number
  peak_kwh: number
  mid_kwh: number
  valley_kwh: number
  power_peak_kw: number
  power_valley_kw: number
  surplus_kwh: number
  /** VAT rate as a fraction, e.g. 0.10. null if not found in the PDF. */
  iva_rate: number | null
}

export class InvoiceParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvoiceParseError'
  }
}

function parseSpanishNumber(s: string): number {
  const cleaned = s.trim()
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // "14.644,00" → 14644.00 (period = thousands separator, comma = decimal)
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  } else if (cleaned.includes(',')) {
    // "5,750" → 5.750 or "67,00" → 67.00
    return parseFloat(cleaned.replace(',', '.'))
  }
  return parseFloat(cleaned)
}

async function extractFullText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const parts: string[] = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    parts.push(pageText)
  }

  // Some PDFs (older Endesa invoices) render each digit as a separate glyph,
  // producing "1 0" instead of "10". Collapse single spaces between adjacent
  // digits. Run three times to handle chains like "2 0 2 5" → "2025".
  let text = parts.join(' ')
  for (let i = 0; i < 3; i++) {
    text = text.replace(/(\d) (\d)/g, '$1$2')
  }
  return text
}

function extractBillingPeriod(text: string): { month: number; year: number } | null {
  // "del 28/02/2026 a 31/03/2026" — use the end date for the billing month
  const match = text.match(/del\s+\d{2}\/\d{2}\/\d{4}\s+a\s+(\d{2})\/(\d{2})\/(\d{4})/i)
  if (match) {
    return { month: parseInt(match[2], 10), year: parseInt(match[3], 10) }
  }
  return null
}

function extractContractedPower(text: string): { peak: number; valley: number } | null {
  // Format A (newer): "Potencias contratadas: punta-llano 5,750 kW; valle 5,750 kW"
  const matchA = text.match(
    /[Pp]otencias?\s+contratadas?:?\s*punta[- ]?llano\s+([\d.,]+)\s*k[Ww][;,]?\s*valle\s+([\d.,]+)/i,
  )
  if (matchA) {
    return { peak: parseSpanishNumber(matchA[1]), valley: parseSpanishNumber(matchA[2]) }
  }

  // Format B (older): power table row "Punta-Llano  3,271  1  3,271  Valle  3,202  1  3,202"
  // inside the "Potencia kW" section of the detail table
  const num = '[\\d.,]+'
  const matchB = text.match(
    new RegExp(
      `[Pp]otencia\\s+k[Ww][\\s\\S]{0,50}?[Pp]unta-[Ll]lano\\s+(${num})\\s+${num}\\s+${num}\\s+[Vv]alle\\s+(${num})`,
    ),
  )
  if (matchB) {
    return { peak: parseSpanishNumber(matchB[1]), valley: parseSpanishNumber(matchB[2]) }
  }

  return null
}

function extractIVARate(text: string): number | null {
  // "IVA normal 10 %" or "IVA reducido 5 %" or "IVA 21 %"
  const m = text.match(/\bIVA\b[^%\d]*(\d+(?:[.,]\d+)?)\s*%/i)
  if (!m) return null
  return parseSpanishNumber(m[1]) / 100
}

function extractSurplus(text: string): number {
  // "Energía vertida a la red 348,521 kWh" (summary section, page 1)
  // or "Compensación excedente 348,521 kWh" (detail section, page 2)
  const m =
    text.match(/[Ee]nerg[ií]a\s+vertida\s+a\s+la\s+red\s+([\d.,]+)\s*kWh/i) ??
    text.match(/[Cc]ompensaci[oó]n\s+excedente\s+([\d.,]+)\s*kWh/i)
  return m ? parseSpanishNumber(m[1]) : 0
}

function extractConsumption(text: string): { peak: number; mid: number; valley: number } | null {
  // The consumption table lives between "Energía kWh" and "Potencia kW"
  // Row format: "[Label] [reading1] [reading2] [multiplier] [adjustment] [consumption]"
  const sectionMatch = text.match(/[Ee]nerg[ií]a\s+kWh\s+([\s\S]*?)[Pp]otencia\s+kW/i)
  if (!sectionMatch) return null

  const section = sectionMatch[1]
  const num = '(-?[\\d.]+,[\\d]+)'
  const sp = '\\s+'
  const rowRe = (label: string) =>
    new RegExp(`\\b${label}\\s+${num}${sp}${num}${sp}${num}${sp}${num}${sp}${num}`)

  const pm = section.match(rowRe('Punta'))
  const mm = section.match(rowRe('Llano'))
  const vm = section.match(rowRe('Valle'))

  if (!pm || !mm || !vm) return null

  return {
    peak: parseSpanishNumber(pm[5]),
    mid: parseSpanishNumber(mm[5]),
    valley: parseSpanishNumber(vm[5]),
  }
}

export async function parsePdfInvoice(file: File): Promise<InvoiceData> {
  let text: string
  try {
    text = await extractFullText(file)
  } catch {
    throw new InvoiceParseError('No se pudo leer el PDF. Comprueba que el archivo no está dañado.')
  }

  const period = extractBillingPeriod(text)
  if (!period) {
    throw new InvoiceParseError(
      'No se encontró el período de facturación. Asegúrate de que es una factura de Endesa.',
    )
  }

  const power = extractContractedPower(text)
  if (!power) {
    throw new InvoiceParseError(
      'No se encontraron las potencias contratadas en la factura.',
    )
  }

  const consumption = extractConsumption(text)
  if (!consumption) {
    throw new InvoiceParseError(
      'No se encontraron los datos de consumo (Punta/Llano/Valle) en la factura.',
    )
  }

  return {
    month: period.month,
    year: period.year,
    peak_kwh: consumption.peak,
    mid_kwh: consumption.mid,
    valley_kwh: consumption.valley,
    power_peak_kw: power.peak,
    power_valley_kw: power.valley,
    surplus_kwh: extractSurplus(text),
    iva_rate: extractIVARate(text),
  }
}
