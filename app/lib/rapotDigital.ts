/**
 * Domain types, constants, and helper functions for Rapot Digital (Phase 1).
 */

export interface MapelItem {
  id: string
  label: string
}

export const MATA_PELAJARAN_ULA_DINIYYAH: MapelItem[] = [
  { id: 'aqidah', label: 'Aqidah' },
  { id: 'akhlak', label: 'Adab / Akhlak' },
  { id: 'fiqh', label: 'Fiqh' },
  { id: 'bhs_arab', label: 'Bahasa Arab' },
  { id: 'siroh', label: 'Siroh' },
  { id: 'khoth', label: 'Khoth' },
]

export const MATA_PELAJARAN_ULA_UMUM: MapelItem[] = [
  { id: 'bhs_indonesia', label: 'Bahasa Indonesia' },
  { id: 'berhitung', label: 'Berhitung' },
  { id: 'ipa', label: 'IPA' },
  { id: 'ips', label: 'IPS' },
]

export const ALL_MAPEL_ULA_KEYS = [
  ...MATA_PELAJARAN_ULA_DINIYYAH.map(m => m.id),
  ...MATA_PELAJARAN_ULA_UMUM.map(m => m.id),
] as const

export type MapelUlaKey = typeof ALL_MAPEL_ULA_KEYS[number]

/**
 * Business rule cap 50-95 untuk display Rapot / rata-rata / ranking / Excel.
 * PENTING: Nilai di database tetap nilai RAW integer 0-100 (tidak diclamp di DB).
 */
export function nilaiEfektifRapot(raw: number | null | undefined): number | null {
  if (raw == null || Number.isNaN(raw)) return null
  if (raw < 50) return 50
  if (raw > 95) return 95
  return raw
}

/**
 * Validasi nilai input raw: harus integer 0-100 atau null jika belum diisi.
 */
export function validateNilaiRaw(val: unknown): { valid: boolean; value: number | null; error?: string } {
  if (val === null || val === undefined || val === '') {
    return { valid: true, value: null }
  }

  const str = String(val).trim()
  if (str === '') {
    return { valid: true, value: null }
  }

  // Harus integer positif/nol tanpa desimal
  if (!/^\d+$/.test(str)) {
    return { valid: false, value: null, error: 'Nilai harus berupa angka bulat 0-100' }
  }

  const num = parseInt(str, 10)
  if (num < 0 || num > 100) {
    return { valid: false, value: null, error: 'Nilai harus berada dalam rentang 0-100' }
  }

  return { valid: true, value: num }
}
