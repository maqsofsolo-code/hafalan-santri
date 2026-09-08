/**
 * Domain types, constants, and helper functions for Rapot Digital.
 * Dirancang JENJANG-AGNOSTIC dengan konfigurasi RAPOT_SUBJECT_CONFIG.
 */

export type JenjangKey = 'ula' | 'wustha' | 'ulya'

export interface SubjectItem {
  id: string
  label: string
  labelArab?: string
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

export const RAPOT_CONFIG_ULA_1_3: JenjangSubjectConfig = {
  jenjang: 'ula',
  label: 'Ula (Kelas 1–3)',
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
      ],
    },
  ],
}

export const RAPOT_CONFIG_ULA_4_6: JenjangSubjectConfig = {
  jenjang: 'ula',
  label: 'Ula (Kelas 4–6)',
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
}

export const RAPOT_CONFIG_ULA: JenjangSubjectConfig = RAPOT_CONFIG_ULA_4_6

export const RAPOT_CONFIG_WUSTHA: JenjangSubjectConfig = {
  jenjang: 'wustha',
  label: 'Wustha',
  enabled: true,
  groups: [
    {
      id: 'diniyyah',
      name: 'MATERI DINIYYAH',
      code: 'B',
      subjects: [
        { id: 'aqidah', label: 'Aqidah' },
        { id: 'akhlak', label: 'Adab / Akhlak' },
        { id: 'fiqh', label: 'Fiqh' },
        { id: 'bhs_arab', label: 'Bahasa Arab' },
        { id: 'siroh', label: 'Siroh' },
        { id: 'khoth', label: 'Khoth' },
        { id: 'tahsin', label: 'Tahsin' },
      ],
    },
    {
      id: 'umum',
      name: 'MATERI UMUM',
      code: 'C',
      subjects: [
        { id: 'bhs_indonesia', label: 'Bahasa Indonesia' },
        { id: 'berhitung', label: 'Berhitung' },
      ],
    },
  ],
}

export const RAPOT_CONFIG_ULYA_10: JenjangSubjectConfig = {
  jenjang: 'ulya',
  label: 'Ulya (Kelas 10)',
  enabled: true,
  groups: [
    {
      id: 'diniyyah',
      name: 'MATERI DINIYYAH',
      code: 'B',
      subjects: [
        { id: 'aqidah', label: 'Aqidah', labelArab: 'العَقِيدَةُ' },
        { id: 'akhlak', label: 'Adab / Akhlak', labelArab: 'الآدَابُ / الأَخْلَاقُ' },
        { id: 'fiqh', label: 'Fiqh', labelArab: 'الفِقْهُ' },
        { id: 'bhs_arab', label: 'Bahasa Arab', labelArab: 'اللُّغَةُ العَرَبِيَّةُ' },
        { id: 'nahwu', label: 'Nahwu', labelArab: 'النَّحْوُ' },
        { id: 'shorof', label: 'Shorof', labelArab: 'الصَّرْفُ' },
        { id: 'siroh', label: 'Siroh', labelArab: 'السِّيرَةُ' },
        { id: 'khoth', label: 'Khoth', labelArab: 'الخَطُّ' },
        { id: 'tahsin', label: 'Tahsin', labelArab: 'التَّحْسِينُ' },
        { id: 'imla', label: 'Imla', labelArab: 'الإِمْلَاءُ' },
      ],
    },
    {
      id: 'umum',
      name: 'MATERI UMUM',
      code: 'C',
      subjects: [
        { id: 'berhitung', label: 'Berhitung', labelArab: 'الحِسَابُ' },
        { id: 'bhs_indonesia', label: 'Bahasa Indonesia', labelArab: 'اللُّغَةُ الإِنْدُونِيسِيَّةُ' },
      ],
    },
  ],
}

export const RAPOT_CONFIG_ULYA_11: JenjangSubjectConfig = {
  jenjang: 'ulya',
  label: 'Ulya (Kelas 11)',
  enabled: true,
  groups: [
    {
      id: 'diniyyah',
      name: 'MATERI DINIYYAH',
      code: 'B',
      subjects: [
        { id: 'aqidah', label: 'Aqidah', labelArab: 'العَقِيدَةُ' },
        { id: 'akhlak', label: 'Adab / Akhlak', labelArab: 'الآدَابُ / الأَخْلَاقُ' },
        { id: 'fiqh', label: 'Fiqh', labelArab: 'الفِقْهُ' },
        { id: 'bhs_arab', label: 'Bahasa Arab', labelArab: 'اللُّغَةُ العَرَبِيَّةُ' },
        { id: 'nahwu', label: 'Nahwu', labelArab: 'النَّحْوُ' },
        { id: 'shorof', label: 'Shorof', labelArab: 'الصَّرْفُ' },
        { id: 'siroh', label: 'Siroh', labelArab: 'السِّيرَةُ' },
        { id: 'usul_fiqih', label: 'Usul Fiqih', labelArab: 'أُصُولُ الفِقْهِ' },
        { id: 'mustholah', label: 'Mustholah', labelArab: 'مُصْطَلَحُ الحَدِيثِ' },
        { id: 'tahsin', label: 'Tahsin', labelArab: 'التَّحْسِينُ' },
        { id: 'imla', label: 'Imla', labelArab: 'الإِمْلَاءُ' },
      ],
    },
    {
      id: 'umum',
      name: 'MATERI UMUM',
      code: 'C',
      subjects: [
        { id: 'berhitung', label: 'Berhitung', labelArab: 'الحِسَابُ' },
        { id: 'bhs_indonesia', label: 'Bahasa Indonesia', labelArab: 'اللُّغَةُ الإِنْدُونِيسِيَّةُ' },
      ],
    },
  ],
}

export const RAPOT_CONFIG_ULYA_12: JenjangSubjectConfig = {
  jenjang: 'ulya',
  label: 'Ulya (Kelas 12)',
  enabled: true,
  groups: [
    {
      id: 'diniyyah',
      name: 'MATERI DINIYYAH',
      code: 'B',
      subjects: [
        // Kelas 12: TIDAK ada Shorof, TIDAK ada Imla, TIDAK ada Khoth
        { id: 'aqidah', label: 'Aqidah', labelArab: 'العَقِيدَةُ' },
        { id: 'akhlak', label: 'Adab / Akhlak', labelArab: 'الآدَابُ / الأَخْلَاقُ' },
        { id: 'fiqh', label: 'Fiqh', labelArab: 'الفِقْهُ' },
        { id: 'bhs_arab', label: 'Bahasa Arab', labelArab: 'اللُّغَةُ العَرَبِيَّةُ' },
        { id: 'nahwu', label: 'Nahwu', labelArab: 'النَّحْوُ' },
        { id: 'siroh', label: 'Siroh', labelArab: 'السِّيرَةُ' },
        { id: 'usul_fiqih', label: 'Usul Fiqih', labelArab: 'أُصُولُ الفِقْهِ' },
        { id: 'mustholah', label: 'Mustholah', labelArab: 'مُصْطَلَحُ الحَدِيثِ' },
        { id: 'tahsin', label: 'Tahsin', labelArab: 'التَّحْسِينُ' },
      ],
    },
    {
      id: 'umum',
      name: 'MATERI UMUM',
      code: 'C',
      subjects: [
        { id: 'berhitung', label: 'Berhitung', labelArab: 'الحِسَابُ' },
        { id: 'bhs_indonesia', label: 'Bahasa Indonesia', labelArab: 'اللُّغَةُ الإِنْدُونِيسِيَّةُ' },
      ],
    },
  ],
}

export const RAPOT_SUBJECT_CONFIG: Record<JenjangKey, JenjangSubjectConfig> = {
  ula: RAPOT_CONFIG_ULA,
  wustha: RAPOT_CONFIG_WUSTHA,
  ulya: RAPOT_CONFIG_ULYA_10,
}

export const RAPOT_CONFIG_UNAVAILABLE: JenjangSubjectConfig = {
  jenjang: 'ula',
  label: 'Belum Tersedia',
  enabled: false,
  groups: [],
}

/**
 * Resolver konfigurasi mapel rapot digital berdasarkan jenjang dan nomor kelas.
 * - Ula Kelas 1..3   => RAPOT_CONFIG_ULA_1_3 (8 mapel: 6 Diniyyah + 2 Umum)
 * - Ula Kelas 4..6   => RAPOT_CONFIG_ULA_4_6 (10 mapel: 6 Diniyyah + 4 Umum)
 * - Wustha (7..9)    => RAPOT_CONFIG_WUSTHA (9 mapel)
 * - Ulya Kelas 10    => RAPOT_CONFIG_ULYA_10 (12 mapel)
 * - Ulya Kelas 11    => RAPOT_CONFIG_ULYA_11 (13 mapel)
 * - Ulya Kelas 12    => RAPOT_CONFIG_ULYA_12 (11 mapel: no shorof, imla, khoth)
 * 
 * Mengembalikan RAPOT_CONFIG_UNAVAILABLE (enabled: false) jika kombinasi jenjang & kelas tidak valid
 * atau jika kelasNum tidak disediakan pada jenjang yang komposisinya spesifik per kelas (Ula & Ulya).
 */
export function getRapotSubjectConfig(
  jenjang: JenjangKey | string | null | undefined,
  kelasNum?: number | string | null
): JenjangSubjectConfig {
  if (!jenjang) return RAPOT_CONFIG_UNAVAILABLE
  const j = String(jenjang).toLowerCase() as JenjangKey
  let kNum: number | null = null
  if (kelasNum !== undefined && kelasNum !== null && String(kelasNum).trim() !== '') {
    const rawStr = String(kelasNum).trim()
    const parsed = parseInt(rawStr, 10)
    if (!isNaN(parsed)) {
      kNum = parsed
    } else {
      const match = rawStr.match(/\d+/)
      if (match) kNum = parseInt(match[0], 10)
    }
  }

  if (j === 'ula') {
    if (kNum === 1 || kNum === 2 || kNum === 3) {
      return RAPOT_CONFIG_ULA_1_3
    }
    if (kNum === 4 || kNum === 5 || kNum === 6) {
      return RAPOT_CONFIG_ULA_4_6
    }
    // Ula wajib memiliki kelasNum valid (1..6) karena komposisi mapel kelas 1–3 (8 mapel) berbeda dari kelas 4–6 (10 mapel)
    return RAPOT_CONFIG_UNAVAILABLE
  }

  if (j === 'wustha') {
    if (kNum !== null && (isNaN(kNum) || kNum < 7 || kNum > 9)) {
      return RAPOT_CONFIG_UNAVAILABLE
    }
    return RAPOT_CONFIG_WUSTHA
  }

  if (j === 'ulya') {
    if (kNum === 10) return RAPOT_CONFIG_ULYA_10
    if (kNum === 11) return RAPOT_CONFIG_ULYA_11
    if (kNum === 12) return RAPOT_CONFIG_ULYA_12
    // Ulya wajib memiliki kelasNum (10, 11, atau 12) karena komposisi mapel berbeda tiap kelas
    return RAPOT_CONFIG_UNAVAILABLE
  }

  return RAPOT_CONFIG_UNAVAILABLE
}

/**
 * Helper availability: mengecek apakah kombinasi jenjang dan kelas memiliki konfigurasi mapel aktif.
 */
export function isRapotConfigAvailable(
  jenjang: JenjangKey | string | null | undefined,
  kelasNum?: number | string | null
): boolean {
  const config = getRapotSubjectConfig(jenjang, kelasNum)
  return !!config && config.enabled && config.groups.length > 0
}

/**
 * Seluruh kunci mata pelajaran akademik di tabel public.nilai_rapot lintas jenjang.
 */
export const ALL_POSSIBLE_MAPEL_KEYS = [
  'aqidah',
  'akhlak',
  'fiqh',
  'bhs_arab',
  'siroh',
  'khoth',
  'bhs_indonesia',
  'berhitung',
  'ipa',
  'ips',
  'tahsin',
  'nahwu',
  'shorof',
  'imla',
  'usul_fiqih',
  'mustholah',
] as const

export type PossibleMapelKey = typeof ALL_POSSIBLE_MAPEL_KEYS[number]

/**
 * Mengambil daftar seluruh mapel aktif untuk suatu jenjang dan kelas.
 */
export function getActiveSubjects(
  jenjang: JenjangKey | string | null | undefined,
  kelasNum?: number | string | null
): SubjectItem[] {
  const cfg = getRapotSubjectConfig(jenjang as JenjangKey, kelasNum)
  if (!cfg || !cfg.enabled) return []
  return cfg.groups.flatMap(g => g.subjects)
}

export const MATA_PELAJARAN_ULA_DINIYYAH = RAPOT_CONFIG_ULA.groups[0].subjects
export const MATA_PELAJARAN_ULA_UMUM = RAPOT_CONFIG_ULA.groups[1].subjects
export const ALL_MAPEL_ULA_KEYS = RAPOT_CONFIG_ULA_4_6.groups.flatMap(g => g.subjects).map(s => s.id)

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
 * berdasarkan konfigurasi jenjang dan kelas aktif (tanpa hardcode jumlah mapel).
 */
export function getAcademicProgress(
  nilai: Record<string, any> | null | undefined,
  jenjang: JenjangKey | string = 'ula',
  kelasNum?: number | string | null
): AcademicProgress {
  const cfg = getRapotSubjectConfig(jenjang as JenjangKey, kelasNum)
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
 * Menghitung kelengkapan dan rata-rata nilai akademik santri secara jenjang & kelas spesifik.
 * 
 * Ketentuan:
 * 1. Hanya mapel aktif dalam konfigurasi jenjang + kelas yang dihitung.
 * 2. Seluruh mapel aktif berbobot sama.
 * 3. Pembagi = jumlah mapel aktif dalam konfigurasi (Ula = 10, Wustha = 9, Ulya 10 = 12, Ulya 11 = 13, Ulya 12 = 11).
 * 4. Lengkap jika SELURUH mapel aktif memiliki nilai valid != null.
 * 5. Jika tidak lengkap, `rataAkhir = null` dan santri tidak eligible ranking.
 */
export function hitungRataRataAkademik(
  nilaiRaw: Record<string, any> | null | undefined,
  jenjang: JenjangKey | string = 'ula',
  kelasNum?: number | string | null
): HasilRataRataSantri {
  const cfg = getRapotSubjectConfig(jenjang as JenjangKey, kelasNum)
  if (!cfg || !cfg.enabled) {
    return {
      lengkap: false,
      rataAkhir: null,
      rataDiniyyah: null,
      rataUmum: null,
      nilaiEfektifMap: {},
      progress: getAcademicProgress(nilaiRaw, jenjang, kelasNum),
    }
  }

  const progress = getAcademicProgress(nilaiRaw, jenjang, kelasNum)
  const activeSubjects = getActiveSubjects(jenjang, kelasNum)
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
  kelas_num?: number | string | null
  jenjang?: string | null
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
 * 5. Divisor dinamis sesuai jumlah mapel aktif kelas bersangkutan.
 */
export function hitungRankingRapotKelas<T extends SantriRankingItem>(
  santriList: T[],
  nilaiMap: Map<string, any> | Record<string, any>,
  jenjang: JenjangKey | string = 'ula',
  kelasNum?: number | string | null
): {
  hasilList: (T & SantriRankingResult)[]
  rankingMap: Map<string, number | null>
  totalSantri: number
  totalLengkap: number
} {
  const evaluasiList = santriList.map(s => {
    const rawNilai = nilaiMap instanceof Map ? nilaiMap.get(s.id) : (nilaiMap as any)[s.id]
    const sKelasNum = s.kelas_num ?? kelasNum ?? null
    const sJenjang = s.jenjang ?? jenjang ?? 'ula'
    const rata = hitungRataRataAkademik(rawNilai, sJenjang as JenjangKey, sKelasNum)
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

export type RataKelasMapelItem = {
  angka: number
  huruf: string
}

export type HasilRataKelasMapel = Record<string, RataKelasMapelItem | null>

/**
 * Menghitung Rata Kelas per mata pelajaran akademik untuk suatu kelas.
 * 
 * Aturan Bisnis Resmi:
 * 1. Dihitung HANYA dari nilai mata pelajaran tersebut dari seluruh santri aktif dalam exact class.
 * 2. Formula: Rata Kelas Mapel = sum(nilai rapot mapel santri aktif) / count(santri aktif).
 * 3. Setiap mapel dihitung secara independen.
 * 4. Nilai menggunakan nilai efektif (clamp 50..95 via nilaiEfektifRapot).
 * 5. Complete subject only: jika ada 1 saja santri aktif yang nilainya null / belum diisi / missing row,
 *    maka Rata Kelas untuk mapel tersebut adalah null ('-').
 * 6. Hasil angka dibulatkan dengan Math.round, dan huruf terbilang dihasilkan dari angka bulat tersebut via angkaKeHuruf.
 * 7. Hanya mapel akademik aktif sesuai konfigurasi jenjang + kelas (tidak termasuk Hifzh & summary rows).
 */
export function hitungRataKelasMapel<T extends { id: string }>(
  santriList: T[],
  nilaiMap: Map<string, any> | Record<string, any>,
  jenjang: JenjangKey | string = 'ula',
  kelasNum?: number | string | null
): HasilRataKelasMapel {
  const result: HasilRataKelasMapel = {}
  if (!santriList || santriList.length === 0) {
    return result
  }

  const activeSubjects = getActiveSubjects(jenjang, kelasNum)
  if (activeSubjects.length === 0) {
    return result
  }

  const totalSantri = santriList.length

  for (const sub of activeSubjects) {
    let isComplete = true
    let sumEffective = 0

    for (const s of santriList) {
      const rawRow = nilaiMap instanceof Map ? nilaiMap.get(s.id) : (nilaiMap as any)?.[s.id]
      if (!rawRow) {
        isComplete = false
        break
      }

      const rawVal = rawRow[sub.id]
      if (rawVal === null || rawVal === undefined || rawVal === '') {
        isComplete = false
        break
      }

      const num = Number(rawVal)
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        isComplete = false
        break
      }

      const efektif = nilaiEfektifRapot(num)
      if (efektif === null) {
        isComplete = false
        break
      }

      sumEffective += efektif
    }

    if (isComplete) {
      const rata = Math.round(sumEffective / totalSantri)
      result[sub.id] = {
        angka: rata,
        huruf: angkaKeHuruf(rata),
      }
    } else {
      result[sub.id] = null
    }
  }

  return result
}

/**
 * Mengembalikan tanggal resmi penerbitan Rapot Digital.
 * 
 * Aturan Bisnis Resmi:
 * 1. Khusus Tahun Ajaran 2026/2027 Semester 1 (Gasal), tanggal penerbitan resmi adalah
 *    PERMANEN: "12 September 2026" (tidak dinamis mengikuti tanggal download/selesai/sistem).
 * 2. Periode lainnya: gunakan tanggal_rapot bila tersedia, atau fallback ke tanggal_selesai,
 *    atau '-' jika keduanya tidak ada.
 */
export function formatTanggalPenerbitanRapot(periode?: {
  tahun_ajaran?: string | null
  semester?: number | string | null
  tanggal_rapot?: string | null
  tanggal_selesai?: string | null
} | null): string {
  if (!periode) return '-'
  const thn = String(periode.tahun_ajaran || '').trim()
  const smt = Number(periode.semester)
  if (thn === '2026/2027' && smt === 1) {
    return '12 September 2026'
  }
  if (periode.tanggal_rapot) {
    return new Date(periode.tanggal_rapot).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
  if (periode.tanggal_selesai) {
    return new Date(periode.tanggal_selesai).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
  return '-'
}
