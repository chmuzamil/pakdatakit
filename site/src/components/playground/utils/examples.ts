export const examples = {
  cnic: '35202-1234567-1',
  phone: '03001234567',
  city: 'Lahore',
  district: 'Lahore',
  province: 'Punjab',
  amount: 2500000,
  iban: 'PK36SCBL0000001123456702',
  postalCode: '54000',
  address: 'House 12, Gulberg III, Lahore, Punjab 54660',
  romanUrdu: 'ap kia ker rhe ho',
  text: '  Hello   World  ',
  whatsappMessage: 'Assalamualaikum',
  hijriDate: '2024-03-11',
} as const

export function formatCNIC(cnic: string): string {
  const digits = cnic.replace(/[\s-]/g, '')
  if (digits.length !== 13 || !/^\d+$/.test(digits)) {
    return cnic
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function escapeForCode(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function parseDateInput(value: string): Date | null {
  if (!value.trim()) return null
  const parts = value.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null
  const [year, month, day] = parts
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

export const inputClassName =
  'w-full rounded-md border border-border-strong/60 bg-surface px-3 py-2.5 text-base text-text-heading transition-colors placeholder:text-text-muted hover:border-border-strong focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:text-sm'

export const monoInputClassName = `${inputClassName} font-mono`

export const textareaClassName = `${inputClassName} min-h-24 resize-y font-mono leading-relaxed`
