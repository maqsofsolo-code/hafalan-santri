/**
 * Domain types, constants, and helper functions for Rapot Digital.
 * Dirancang JENJANG-AGNOSTIC dengan konfigurasi RAPOT_SUBJECT_CONFIG.
 */

export type JenjangKey = 'ula' | 'wustha' | 'ulya'

export interface SubjectItem {
  id: string
  label: string
}

export interface SubjectGroup {
  id: string
  name: string
  code: string // 'B', 'C', dsb.
  subjects: SubjectItem[]
}

export interface JenjangSubjectConfig {
  jenjang: JenjangKey
  label: string
  enabled: boolean
  groups: SubjectGroup[]
}

export const RAPOT_SUBJECT_CONFIG: Record<JenjangKey, JenjangSubjectConfig> = {
  ula: {
    jenjang: 'ula',
    label: 'Ula',
    enabled: true,
    groups: [
      {
        id: 'diniyyah',
        name: 'MATERI DINIYYAH',
        code: 'B',
        subjects: [
          { id: 'aqidah', label: 'AQIDAH' },
          { id: 'akhlak', label: 'ADAB / AKHLAK' },
          { id: 'fiqh', label: 'FIQH' },
          { id: 'bhs_arab', label: 'BAHASA ARAB' },
          { id: 'siroh', label: 'SIROH' },
          { id: 'khoth', label: 'KHOTH' },
        ],
      },
      {
        id: 'umum',
        name: 'MATERI UMUM',
        code: 'C',
        subjects: [
          { id: 'bhs_indonesia', label: 'BAHASA INDONESIA' },
          { id: 'berhitung', label: 'BERHITUNG' },
          { id: 'ipa', label: 'IPA' },
          { id: 'ips', label: 'IPS' },
        ],
      },
    ],
  },
  wustha: {
    jenjang: 'wustha',
    label: 'Wustha',
    enabled: false,
    groups: [],
  },
  ulya: {
    jenjang: 'ulya',
    label: 'Ulya',
    enabled: false,
    groups: [],
  },
}

/**
 * Mengambil daftar seluruh mapel aktif untuk suatu jenjang.
 */
export function getActiveSubjects(jenjang: JenjangKey): SubjectItem[] {
  const cfg = RAPOT_SUBJECT_CONFIG[jenjang]
  if (!cfg || !cfg.enabled) return []
  return cfg.groups.flatMap(g => g.subjects)
}

export const MATA_PELAJARAN_ULA_DINIYYAH = RAPOT_SUBJECT_CONFIG.ula.groups[0].subjects
export const MATA_PELAJARAN_ULA_UMUM = RAPOT_SUBJECT_CONFIG.ula.groups[1].subjects
export const ALL_MAPEL_ULA_KEYS = getActiveSubjects('ula').map(s => s.id)

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

  if (!/^\d+$/.test(str)) {
    return { valid: false, value: null, error: 'Nilai harus berupa angka bulat 0-100' }
  }

  const num = parseInt(str, 10)
  if (num < 0 || num > 100) {
    return { valid: false, value: null, error: 'Nilai harus berada dalam rentang 0-100' }
  }

  return { valid: true, value: num }
}

/**
 * Mengonversi angka nilai (dibulatkan) ke kata bilangan dalam Bahasa Indonesia.
 */
export function angkaKeHuruf(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n) || n <= 0) return '-'
  const satuan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
    'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas', 'Enam Belas',
    'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'
  ]
  const puluhan = [
    '', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
    'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh'
  ]
  const num = Math.round(n)
  if (num < 20) return satuan[num]
  return puluhan[Math.floor(num / 10)] + (num % 10 ? ' ' + satuan[num % 10] : '')
}

export type AcademicGroupProgress = {
  id: string
  label: string
  filled: number
  total: number
}

export type AcademicProgress = {
  groups: AcademicGroupProgress[]
  filled: number
  total: number
  hasAny: boolean
  lengkap: boolean
}

/**
 * Menghitung progress pengisian nilai akademik santri secara dinamis
 * berdasarkan RAPOT_SUBJECT_CONFIG jenjang aktif (tanpa hardcode jumlah mapel).
 */
export function getAcademicProgress(
  nilai: Record<string, any> | null | undefined,
  jenjang: JenjangKey = 'ula'
): AcademicProgress {
  const cfg = RAPOT_SUBJECT_CONFIG[jenjang]
  if (!cfg || !cfg.enabled) {
    return {
      groups: [],
      filled: 0,
      total: 0,
      hasAny: false,
      lengkap: false,
    }
  }

  let overallFilled = 0
  let overallTotal = 0

  const groups: AcademicGroupProgress[] = cfg.groups.map(group => {
    let groupFilled = 0
    for (const sub of group.subjects) {
      const val = nilai ? nilai[sub.id] : null
      if (val !== null && val !== undefined && val !== '') {
        const num = Number(val)
        if (Number.isFinite(num) && num >= 0 && num <= 100) {
          groupFilled++
        }
      }
    }
    const groupTotal = group.subjects.length
    overallFilled += groupFilled
    overallTotal += groupTotal

    const label = group.id === 'diniyyah'
      ? 'Diniyyah'
      : group.id === 'umum'
      ? 'Umum'
      : (group.name
          ? group.name
              .replace(/^MATERI\s+/i, '')
              .split(' ')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ')
          : group.id)

    return {
      id: group.id,
      label,
      filled: groupFilled,
      total: groupTotal,
    }
  })

  const lengkap = overallTotal > 0 && overallFilled === overallTotal
  const hasAny = overallFilled > 0

  return {
    groups,
    filled: overallFilled,
    total: overallTotal,
    hasAny,
    lengkap,
  }
}

export type HasilRataRataSantri = {
  lengkap: boolean
  rataAkhir: number | null
  rataDiniyyah: number | null
  rataUmum: number | null
  nilaiEfektifMap: Record<string, number | null>
  progress?: AcademicProgress
}

/**
 * Menghitung kelengkapan dan rata-rata nilai akademik santri secara jenjang-agnostic.
 * 
 * Ketentuan:
 * 1. Hanya mapel aktif dalam konfigurasi jenjang yang dihitung.
 * 2. Seluruh mapel aktif berbobot sama.
 * 3. Pembagi = jumlah mapel aktif dalam konfigurasi (untuk Ula = 10).
 * 4. Lengkap jika SELURUH mapel aktif memiliki nilai valid != null.
 * 5. Jika tidak lengkap, `rataAkhir = null` dan santri tidak eligible ranking.
 */
export function hitungRataRataAkademik(
  nilaiRaw: Record<string, any> | null | undefined,
  jenjang: JenjangKey = 'ula'
): HasilRataRataSantri {
  const cfg = RAPOT_SUBJECT_CONFIG[jenjang]
  if (!cfg || !cfg.enabled) {
    return {
      lengkap: false,
      rataAkhir: null,
      rataDiniyyah: null,
      rataUmum: null,
      nilaiEfektifMap: {},
      progress: getAcademicProgress(nilaiRaw, jenjang),
    }
  }

  const progress = getAcademicProgress(nilaiRaw, jenjang)
  const activeSubjects = getActiveSubjects(jenjang)
  const nilaiEfektifMap: Record<string, number | null> = {}
  let sumTotal = 0

  for (const sub of activeSubjects) {
    const rawVal = nilaiRaw ? nilaiRaw[sub.id] : null
    const valNum = (rawVal !== null && rawVal !== undefined && rawVal !== '')
      ? Number(rawVal)
      : null

    if (valNum === null || !Number.isFinite(valNum)) {
      nilaiEfektifMap[sub.id] = null
    } else {
      const efektif = nilaiEfektifRapot(valNum)
      nilaiEfektifMap[sub.id] = efektif
      if (efektif !== null) sumTotal += efektif
    }
  }

  // Rata-rata per grup
  let rataDiniyyah: number | null = null
  let rataUmum: number | null = null

  const diniyyahGroup = cfg.groups.find(g => g.id === 'diniyyah')
  if (diniyyahGroup && diniyyahGroup.subjects.length > 0) {
    const vals = diniyyahGroup.subjects
      .map(s => nilaiEfektifMap[s.id])
      .filter((v): v is number => v !== null)
    if (vals.length === diniyyahGroup.subjects.length) {
      rataDiniyyah = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
    }
  }

  const umumGroup = cfg.groups.find(g => g.id === 'umum')
  if (umumGroup && umumGroup.subjects.length > 0) {
    const vals = umumGroup.subjects
      .map(s => nilaiEfektifMap[s.id])
      .filter((v): v is number => v !== null)
    if (vals.length === umumGroup.subjects.length) {
      rataUmum = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
    }
  }

  const totalSubjects = activeSubjects.length
  const rataAkhir = progress.lengkap && totalSubjects > 0
    ? Math.round((sumTotal / totalSubjects) * 10) / 10
    : null

  return {
    lengkap: progress.lengkap,
    rataAkhir,
    rataDiniyyah,
    rataUmum,
    nilaiEfektifMap,
    progress,
  }
}

export type SantriRankingItem = {
  id: string
  nama: string
}

export type SantriRankingResult = SantriRankingItem & {
  lengkap: boolean
  rataAkhir: number | null
  rataDiniyyah: number | null
  rataUmum: number | null
  peringkat: number | null
  nilaiEfektifMap: Record<string, number | null>
  progress?: AcademicProgress
}

/**
 * Menghitung ranking akademik kelas dengan ATURAN FINAL:
 * 1. Hanya santri yang lengkap seluruh mapel aktif yang mendapat peringkat.
 * 2. Incomplete = no rank (peringkat = null).
 * 3. Competition ranking: Jika nilai rata-rata sama persis, santri mendapatkan PERINGKAT YANG SAMA (1, 2, 2, 4).
 * 4. Nama / ID hanya digunakan untuk kestabilan urutan tampilan.
 */
export function hitungRankingRapotKelas<T extends SantriRankingItem>(
  santriList: T[],
  nilaiMap: Map<string, any> | Record<string, any>,
  jenjang: JenjangKey = 'ula'
): {
  hasilList: (T & SantriRankingResult)[]
  rankingMap: Map<string, number | null>
  totalSantri: number
  totalLengkap: number
} {
  const evaluasiList = santriList.map(s => {
    const rawNilai = nilaiMap instanceof Map ? nilaiMap.get(s.id) : (nilaiMap as any)[s.id]
    const rata = hitungRataRataAkademik(rawNilai, jenjang)
    return {
      ...s,
      lengkap: rata.lengkap,
      rataAkhir: rata.rataAkhir,
      rataDiniyyah: rata.rataDiniyyah,
      rataUmum: rata.rataUmum,
      nilaiEfektifMap: rata.nilaiEfektifMap,
      progress: rata.progress,
      peringkat: null as number | null,
    }
  })

  const lengkapList = evaluasiList.filter(s => s.lengkap && s.rataAkhir !== null)
  const belumLengkapList = evaluasiList.filter(s => !s.lengkap || s.rataAkhir === null)

  // Sort lengkap: rataAkhir desc, nama asc ('id' locale), id asc
  lengkapList.sort((a, b) => {
    const diff = (b.rataAkhir ?? 0) - (a.rataAkhir ?? 0)
    if (diff !== 0) return diff
    const namaComp = (a.nama || '').localeCompare(b.nama || '', 'id')
    if (namaComp !== 0) return namaComp
    return String(a.id).localeCompare(String(b.id))
  })

  // Competition ranking: 1, 2, 2, 4
  for (let i = 0; i < lengkapList.length; i++) {
    if (i > 0 && lengkapList[i].rataAkhir === lengkapList[i - 1].rataAkhir) {
      lengkapList[i].peringkat = lengkapList[i - 1].peringkat
    } else {
      lengkapList[i].peringkat = i + 1
    }
  }

  const rankingMap = new Map<string, number | null>()
  lengkapList.forEach(s => rankingMap.set(s.id, s.peringkat))
  belumLengkapList.forEach(s => rankingMap.set(s.id, null))

  // Hasil gabungan terurut: santri lengkap terurut peringkat, disusul santri belum lengkap (urut nama)
  belumLengkapList.sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id'))
  const hasilList = [...lengkapList, ...belumLengkapList]

  return {
    hasilList,
    rankingMap,
    totalSantri: santriList.length,
    totalLengkap: lengkapList.length,
  }
}
