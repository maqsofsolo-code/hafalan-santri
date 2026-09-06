import type { createServiceRoleClient } from './serverAuth'

export type KetidakhadiranSantri = {
  hadir_sakit: number
  hadir_izin: number
  hadir_alpha: number
}

type ServiceClient = ReturnType<typeof createServiceRoleClient>

/**
 * Menghitung ketidakhadiran (Sakit, Izin, Alpha) untuk daftar santri dalam rentang tanggal periode akademik.
 * 
 * ATURAN DAN PRESEDENSI AUDIT:
 * 1. Unit yang digunakan adalah "hari" (COUNT DISTINCT tanggal per santri).
 * 2. Jika terdapat lebih dari satu status ketidakhadiran pada tanggal yang sama untuk santri yang sama
 *    (mis. koreksi dari alpha ke izin/sakit yang diinput selang beberapa menit/jam),
 *    baris dengan `created_at` paling akhir (atau id tertinggi) yang menjadi penentu status tanggal tersebut.
 * 3. Satu tanggal TIDAK PERNAH terhitung sekaligus ke dalam lebih dari satu kategori ketidakhadiran.
 * 4. Jika santri memiliki setoran `hadir` pada tanggal tersebut (santri hadir di majelis dan menyetor),
 *    maka tanggal tersebut dianggap hadir (bukan hari tidak hadir penuh).
 */
export async function hitungKetidakhadiranSantri(
  serviceClient: ServiceClient,
  santriIds: string[],
  tanggalMulai: string,
  tanggalSelesai: string
): Promise<Map<string, KetidakhadiranSantri>> {
  const hasil = new Map<string, KetidakhadiranSantri>()
  santriIds.forEach(id => {
    hasil.set(id, { hadir_sakit: 0, hadir_izin: 0, hadir_alpha: 0 })
  })

  if (santriIds.length === 0 || !tanggalMulai || !tanggalSelesai) {
    return hasil
  }

  const { data: setoranRows, error } = await serviceClient
    .from('setoran')
    .select('id, santri_id, tanggal, status_kehadiran, created_at')
    .in('santri_id', santriIds)
    .gte('tanggal', tanggalMulai)
    .lte('tanggal', tanggalSelesai)
    .not('status_kehadiran', 'is', null)
    .order('created_at', { ascending: true })

  if (error || !setoranRows) {
    console.error('[absensiRapot] Gagal memuat setoran absensi:', error?.message)
    return hasil
  }

  // Petakan status per (santri_id + tanggal).
  // Menggunakan map: santri_id -> Map<tanggal, statusFinal>
  const tanggalStatusMap = new Map<string, Map<string, string>>()

  for (const row of setoranRows) {
    const sId = row.santri_id
    const tgl = row.tanggal
    const status = row.status_kehadiran

    if (!tanggalStatusMap.has(sId)) {
      tanggalStatusMap.set(sId, new Map())
    }
    const santriDates = tanggalStatusMap.get(sId)!

    // Presedensi Final Rapot (unit: hari):
    // 1. Jika terdapat 'hadir' atau 'hadir_tidak_setor' pada tanggal tersebut, tanggal itu TIDAK dihitung sebagai sakit/izin/alpha.
    // 2. Jika santri sudah tercatat 'hadir' / 'hadir_tidak_setor' pada hari tersebut, status kehadiran mendominasi.
    // 3. Jika hanya ada status tidak hadir dan terjadi koreksi (mis. alpha -> izin, alpha -> sakit), status terbaru (order asc created_at) menjadi penentu.
    const isPresence = status === 'hadir' || status === 'hadir_tidak_setor'
    const existing = santriDates.get(tgl)

    if (existing === 'hadir' || existing === 'hadir_tidak_setor') {
      // Santri sudah tercatat hadir pada hari tersebut, abaikan status tidak hadir
      continue
    }

    if (isPresence) {
      santriDates.set(tgl, status)
    } else if (status === 'sakit' || status === 'izin' || status === 'alpha') {
      santriDates.set(tgl, status)
    }
  }

  // Agregasi jumlah hari unik per kategori
  tanggalStatusMap.forEach((datesMap, sId) => {
    const current = hasil.get(sId) || { hadir_sakit: 0, hadir_izin: 0, hadir_alpha: 0 }
    datesMap.forEach(status => {
      if (status === 'sakit') current.hadir_sakit += 1
      else if (status === 'izin') current.hadir_izin += 1
      else if (status === 'alpha') current.hadir_alpha += 1
    })
    hasil.set(sId, current)
  })

  return hasil
}
