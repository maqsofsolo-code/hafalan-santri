// Fungsi murni (tanpa state/fetch) yang dipakai bersama oleh beberapa bagian
// halaman Guru (Input Setoran & Santri Saya) -- dipisah dari app/guru/page.tsx
// pada Modularisasi Tahap 5A. Logic TIDAK diubah dari implementasi lama,
// hanya dipindah dan dijadikan murni (closure atas surahList diganti jadi
// parameter eksplisit).

// halaman_selesai pada Surah memang nullable (lihat app/guru/types.ts) --
// tsconfig.json halaman ini pakai "strict": false, jadi aritmetika di bawah
// TIDAK dipaksa null-check oleh TypeScript, sama seperti perilaku asli
// (nullish akan tetap menghasilkan NaN, bukan diam-diam di-fallback ke 0).
import type { Santri, Surah } from './types'

/** Hitung penambahan juz dari satu rentang ayat pada satu surah. */
export function hitungPenambahanJuz(surahList: Surah[], surahNomor: number, ayatMulai: number, ayatSelesai: number): number {
  const surah = surahList.find(s => s.nomor === surahNomor)
  if (!surah) return 0
  const proporsi = (ayatSelesai - ayatMulai + 1) / surah.jumlah_ayat
  const halamanSurah = (surah.halaman_selesai || surah.halaman_mulai) - surah.halaman_mulai + 1
  return Math.max(0, (proporsi * halamanSurah) / 20)
}

/** Target murojaah harian santri, berdasarkan total_hafalan_juz saat ini. */
export function hitungTargetMurojaah(santri: Santri | null | undefined): { targetHalaman: string, targetLembar: string } | null {
  if (!santri?.total_hafalan_juz) return null
  const targetHalaman = santri.total_hafalan_juz
  const targetLembar = targetHalaman / 2
  return { targetHalaman: targetHalaman.toFixed(1), targetLembar: targetLembar.toFixed(2) }
}

/** Target ujian semester (1/10 dari total hafalan). */
export function hitungTargetUjianSemester(santri: Santri | null | undefined): { targetJuz: string, targetHalaman: string, targetLembar: string } | null {
  if (!santri?.total_hafalan_juz) return null
  const targetJuz = santri.total_hafalan_juz / 10
  const targetHalaman = targetJuz * 20
  const targetLembar = targetHalaman / 2
  return { targetJuz: targetJuz.toFixed(3), targetHalaman: targetHalaman.toFixed(1), targetLembar: targetLembar.toFixed(2) }
}

/** Jadwal setoran per jenjang (label tampilan, bukan validasi). */
export function getJadwalJenjang(jenjang: string): { baru: string, lama: string, adaLama: boolean } {
  if (jenjang === 'ula') return { baru: '08.00 - 09.00', lama: '09.00 - 10.00', adaLama: true }
  if (jenjang === 'wustha') return { baru: '04.30', lama: '08.00 - 09.45', adaLama: true }
  if (jenjang === 'ulya') return { baru: '-', lama: '04.30', adaLama: true }
  return { baru: '-', lama: '-', adaLama: true }
}

/** Sesi absensi yang sedang berjalan berdasarkan jam lokal saat ini. */
export function getSesiAktif(): 'subuh' | 'pagi' | null {
  const total = new Date().getHours() * 60 + new Date().getMinutes()
  if (total >= 240 && total <= 330) return 'subuh'
  if (total >= 480 && total <= 585) return 'pagi'
  return null
}

/** Filter santri untuk mode Guru Pengganti: hanya sesuai wing jenis_kelas guru. */
export function filterSantriGuruPengganti(allSantriList: Santri[], searchSantri: string, guruJenisKelas: string | undefined | null): Santri[] {
  return allSantriList.filter(s => {
    if (!s.nama.toLowerCase().includes(searchSantri.toLowerCase())) return false
    if (!guruJenisKelas) return true
    if (guruJenisKelas === 'banin') return s.jenis_kelas === 'banin'
    if (guruJenisKelas === 'banat') return s.jenis_kelas === 'banat' || s.jenis_kelas === 'tn_a' || s.jenis_kelas === 'tn_b'
    if (guruJenisKelas === 'tn') return s.jenis_kelas === 'tn_a' || s.jenis_kelas === 'tn_b'
    return true
  })
}
