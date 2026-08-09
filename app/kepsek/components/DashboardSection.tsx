'use client'
import { useState } from 'react'
import Image from 'next/image'
import {
  filterSantriMonitoring, groupBelumDiinputByGuru, buildClipboardBelumDiinput,
  ringkasAbsensiGuru, buildClipboardAbsensiGuru, getKelompokSantri, getKelompokGuru,
} from '../utils'
import type { Santri, Guru, SetoranRow, AbsensiGuru, KalenderAkademik } from '../types'

// Tab "Dashboard" -- didesain ulang jadi ACTION BOARD pada Modularisasi
// Tahap 7B (sebelumnya halaman statistik panjang, Tahap 7A hanya memindah
// tanpa mengubah tampilan). Prioritas info: Belum Diinput > Hadir Tidak
// Setor > Alpha > (Sakit/Izin/Sudah Setor sebagai info saja). Semua angka
// dihitung dari data existing (santriList/setoranHariIni/absensiGuru) lewat
// kategoriSetoranSantri yang SUDAH ADA di utils.ts -- rumus kategori TIDAK
// diubah, hanya pengelompokan & penyajian yang baru.
//
// Koreksi Tahap 7B: Belum Diinput/Hadir Tidak Setor/Alpha dipisah per
// kelompok santri (Banin/Banat, getKelompokSantri) dan Absensi Guru dipisah
// per kelompok guru (Putra/Putri, getKelompokGuru) -- dua mapping BERBEDA,
// lihat komentar di utils.ts. Santri/Guru yang tidak dapat diklasifikasikan
// ditampilkan terpisah ("Belum Terklasifikasi"), tidak digabung diam-diam.
//
// "Total Santri"/"Total Guru" (dulu 2 dari 4 kartu ringkasan) sengaja tidak
// lagi ditampilkan sebagai kartu terpisah -- total santri tetap terlihat
// lewat penyebut progress bar di bawah, sesuai struktur target Tahap 7B
// yang action-first (bukan lagi statistik umum).
export function DashboardSection(props: {
  santriList: Santri[]
  guruList: Guru[]
  setoranHariIni: SetoranRow[]
  absensiGuru: AbsensiGuru[]
  tanggal: string
  isLibur: boolean
  isLiburMingguan: boolean
  hariMinggu: number
  kalenderAktif: KalenderAkademik | null
  isUjian: boolean | null
}) {
  const { santriList, guruList, setoranHariIni, absensiGuru, tanggal, isLibur, isLiburMingguan, hariMinggu, kalenderAktif, isUjian } = props
  const [copyState, setCopyState] = useState<Record<string, 'copied' | 'error'>>({})
  const salin = async (key: string, teks: string) => {
    try {
      await navigator.clipboard.writeText(teks)
      setCopyState(prev => ({ ...prev, [key]: 'copied' }))
    } catch {
      setCopyState(prev => ({ ...prev, [key]: 'error' }))
    }
    setTimeout(() => setCopyState(prev => { const next = { ...prev }; delete next[key]; return next }), 2500)
  }
  const labelTombol = (key: string, defaultLabel: string) =>
    copyState[key] === 'copied' ? '✓ Tersalin' : copyState[key] === 'error' ? 'Gagal menyalin' : defaultLabel

  const kategoriHariIni = filterSantriMonitoring(santriList, setoranHariIni, {
    filterMonitoringJenjang: 'semua', filterMonitoringKelas: 'semua', searchMonitoring: '',
  })
  const belumDiinput = kategoriHariIni.filter(s => s.kategoriSetor === 'belum_diinput')
  const hadirTidakSetor = kategoriHariIni.filter(s => s.kategoriSetor === 'hadir_tidak_setor')
  const alpha = kategoriHariIni.filter(s => s.kategoriSetor === 'alpha')
  const sakit = kategoriHariIni.filter(s => s.kategoriSetor === 'sakit')
  const izin = kategoriHariIni.filter(s => s.kategoriSetor === 'izin')
  const sudahDiproses = santriList.length - belumDiinput.length

  // Pemisahan Banin/Banat (santri) -- helper central getKelompokSantri (utils.ts)
  const belumDiinputBanin = belumDiinput.filter(s => getKelompokSantri(s.jenis_kelas) === 'banin')
  const belumDiinputBanat = belumDiinput.filter(s => getKelompokSantri(s.jenis_kelas) === 'banat')
  const belumDiinputTak = belumDiinput.filter(s => getKelompokSantri(s.jenis_kelas) === 'belum_terklasifikasi')
  const groupsBanin = groupBelumDiinputByGuru(belumDiinputBanin)
  const groupsBanat = groupBelumDiinputByGuru(belumDiinputBanat)
  const groupsTak = groupBelumDiinputByGuru(belumDiinputTak)

  const hadirTidakSetorBanin = hadirTidakSetor.filter(s => getKelompokSantri(s.jenis_kelas) === 'banin')
  const hadirTidakSetorBanat = hadirTidakSetor.filter(s => getKelompokSantri(s.jenis_kelas) === 'banat')
  const alphaBanin = alpha.filter(s => getKelompokSantri(s.jenis_kelas) === 'banin')
  const alphaBanat = alpha.filter(s => getKelompokSantri(s.jenis_kelas) === 'banat')

  const handleSalinBelumDiinput = (kelompok: 'banin' | 'banat') => {
    const groups = kelompok === 'banin' ? groupsBanin : groupsBanat
    const judul = `MONITORING SETORAN ${kelompok === 'banin' ? 'BANIN' : 'BANAT'}`
    salin(`belum-diinput-${kelompok}`, buildClipboardBelumDiinput(judul, groups, tanggal))
  }

  // Pemisahan Putra/Putri (guru) -- helper central getKelompokGuru (utils.ts), BEDA mapping dari santri
  const guruPutra = guruList.filter(g => getKelompokGuru(g.jenis_kelas) === 'putra')
  const guruPutri = guruList.filter(g => getKelompokGuru(g.jenis_kelas) === 'putri')
  const guruTakTerklasifikasi = guruList.filter(g => getKelompokGuru(g.jenis_kelas) === 'belum_terklasifikasi')

  const guruAbsenSubuh = absensiGuru.filter(a => a.sesi === 'subuh').map(a => a.guru_id)
  const guruAbsenPagi = absensiGuru.filter(a => a.sesi === 'pagi').map(a => a.guru_id)
  const ringkasSubuhPutra = ringkasAbsensiGuru(guruPutra, guruAbsenSubuh)
  const ringkasPagiPutra = ringkasAbsensiGuru(guruPutra, guruAbsenPagi)
  const ringkasSubuhPutri = ringkasAbsensiGuru(guruPutri, guruAbsenSubuh)
  const ringkasPagiPutri = ringkasAbsensiGuru(guruPutri, guruAbsenPagi)

  const handleSalinAbsensi = (kelompok: 'putra' | 'putri') => {
    const judul = `ABSENSI GURU ${kelompok === 'putra' ? 'PUTRA' : 'PUTRI'}`
    const label = kelompok === 'putra' ? 'Guru Putra' : 'Guru Putri'
    const subuh = kelompok === 'putra' ? ringkasSubuhPutra.belumAbsen : ringkasSubuhPutri.belumAbsen
    const pagi = kelompok === 'putra' ? ringkasPagiPutra.belumAbsen : ringkasPagiPutri.belumAbsen
    salin(`absensi-${kelompok}`, buildClipboardAbsensiGuru(judul, label, tanggal, subuh, pagi))
  }

  const alasanLibur = isLiburMingguan
    ? (hariMinggu === 0 ? 'Libur mingguan (Ahad).' : 'Libur mingguan (Jumat).')
    : `${kalenderAktif?.nama || 'Libur akademik'}.`

  return (
    <div>
      <div className="rounded-2xl p-6 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-10 -right-4 w-48 h-48 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white bg-opacity-20 rounded-xl p-2">
              <Image src="/logo.png" alt="Logo" width={36} height={36} className="object-contain" />
            </div>
            <div>
              <p className="text-blue-200 text-sm">Selamat datang,</p>
              <h2 className="text-white font-bold text-xl">Kepala Sekolah</h2>
            </div>
          </div>
          <p className="text-blue-200 text-sm mt-2">📅 {tanggal}</p>
          <p className="text-blue-100 text-xs mt-1">Pondok Pesantren Daarus Salaf Sukoharjo</p>
        </div>
      </div>

      {isUjian && (
        <div className="mb-5 p-4 rounded-2xl border-2 border-red-300 bg-red-50 flex items-center gap-3">
          <span className="text-2xl">📝</span>
          <div>
            <div className="font-bold text-red-800 text-sm">{kalenderAktif?.nama}</div>
            <div className="text-red-600 text-xs">{kalenderAktif?.tipe === 'semester' ? 'Ujian akhir semester' : 'Ujian mid semester aktif'}</div>
          </div>
        </div>
      )}

      {isLibur ? (
        <div className="rounded-2xl p-6 mb-5 border-2 border-orange-200 bg-orange-50 text-center">
          <div className="text-4xl mb-2">🏖</div>
          <h2 className="font-bold text-orange-800 text-lg">Hari Ini Libur</h2>
          <p className="text-orange-700 text-sm mt-1">{tanggal}</p>
          <p className="text-orange-600 text-xs mt-3">Kegiatan setoran reguler tidak berlangsung hari ini. {alasanLibur}</p>
          <p className="text-orange-500 text-xs mt-1">Monitoring setoran harian tidak aktif. Buka tab Monitoring Harian untuk melihat & menyalin laporan tanggal aktif sebelumnya.</p>
        </div>
      ) : (
        <>
          {/* PERLU TINDAKAN HARI INI */}
          <p className="text-xs font-bold text-gray-500 tracking-wide mb-2 mt-1">PERLU TINDAKAN HARI INI</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <div className="rounded-2xl p-4 shadow-lg text-white relative overflow-hidden bg-gradient-to-br from-red-600 to-red-800">
              <div className="absolute -bottom-2 -right-2 text-5xl opacity-10">◆</div>
              <div className="text-3xl font-bold">{belumDiinput.length}</div>
              <div className="font-bold text-sm mt-1">Belum Diinput</div>
              <div className="text-white text-opacity-80 text-xs mt-0.5">Guru belum mengisi hasil setoran</div>
            </div>
            <div className="rounded-2xl p-4 shadow-lg text-white relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700">
              <div className="absolute -bottom-2 -right-2 text-5xl opacity-10">◆</div>
              <div className="text-3xl font-bold">{hadirTidakSetor.length}</div>
              <div className="font-bold text-sm mt-1">Hadir, Tidak Setor</div>
              <div className="text-white text-opacity-80 text-xs mt-0.5">Perlu diketahui penyebabnya</div>
            </div>
            <div className="rounded-2xl p-4 shadow-lg text-white relative overflow-hidden bg-gradient-to-br from-rose-700 to-rose-900">
              <div className="absolute -bottom-2 -right-2 text-5xl opacity-10">◆</div>
              <div className="text-3xl font-bold">{alpha.length}</div>
              <div className="font-bold text-sm mt-1">Alpha</div>
              <div className="text-white text-opacity-80 text-xs mt-0.5">Tidak hadir tanpa keterangan</div>
            </div>
          </div>

          {/* DETAIL BELUM DIINPUT -- dipisah Banin/Banat */}
          <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden mb-5">
            <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #b91c1c, #dc2626)' }}>
              <h3 className="text-white font-bold">Belum Diinput Guru</h3>
              <p className="text-red-100 text-xs mt-0.5">{belumDiinput.length} santri</p>
            </div>
            <div className="p-4 space-y-4">
              {[
                { label: 'BANIN', groups: groupsBanin, key: 'banin' as const },
                { label: 'BANAT', groups: groupsBanat, key: 'banat' as const },
              ].map(grp => (
                <div key={grp.key}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-bold text-gray-500 tracking-wide">{grp.label}</p>
                    <button onClick={() => handleSalinBelumDiinput(grp.key)}
                      className="bg-red-50 text-red-700 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0">
                      {labelTombol(`belum-diinput-${grp.key}`, `📋 Salin ${grp.label === 'BANIN' ? 'Banin' : 'Banat'}`)}
                    </button>
                  </div>
                  {grp.groups.length === 0 ? (
                    <p className="text-green-600 text-sm py-2 font-medium">✓ Semua data {grp.label === 'BANIN' ? 'Banin' : 'Banat'} sudah diinput</p>
                  ) : (
                    <div className="space-y-2">
                      {grp.groups.map(g => (
                        <details key={g.guruId} className="border border-gray-100 rounded-xl overflow-hidden" open>
                          <summary className="cursor-pointer select-none px-4 py-3 bg-gray-50 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-gray-800 truncate">{g.guruNama}</div>
                              <div className="text-xs text-gray-400 truncate">{g.kelasRingkas}</div>
                            </div>
                            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full flex-shrink-0">{g.santriList.length} santri</span>
                          </summary>
                          <div className="px-4 py-3 space-y-1">
                            {g.santriList.map(s => (
                              <div key={s.id} className="text-sm text-gray-600 py-1 border-b last:border-0 border-gray-50">{s.nama}</div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {groupsTak.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-500 tracking-wide mb-2">BELUM TERKLASIFIKASI</p>
                  <p className="text-[11px] text-gray-400 mb-2">Santri berikut belum punya jenis_kelas yang dikenali (banin/banat/tn_a/tn_b) -- perlu dilengkapi di Data Santri.</p>
                  <div className="space-y-2">
                    {groupsTak.map(g => (
                      <details key={g.guruId} className="border border-gray-100 rounded-xl overflow-hidden">
                        <summary className="cursor-pointer select-none px-4 py-3 bg-gray-50 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-gray-800 truncate">{g.guruNama}</div>
                            <div className="text-xs text-gray-400 truncate">{g.kelasRingkas}</div>
                          </div>
                          <span className="text-xs font-bold text-gray-600 bg-gray-200 px-2 py-1 rounded-full flex-shrink-0">{g.santriList.length} santri</span>
                        </summary>
                        <div className="px-4 py-3 space-y-1">
                          {g.santriList.map(s => (
                            <div key={s.id} className="text-sm text-gray-600 py-1 border-b last:border-0 border-gray-50">{s.nama}</div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* HADIR TAPI TIDAK SETOR -- dipisah Banin/Banat */}
          <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden mb-5">
            <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #c2410c, #ea580c)' }}>
              <h3 className="text-white font-bold">Hadir Tapi Tidak Setor — {hadirTidakSetor.length} Santri</h3>
              <p className="text-orange-100 text-xs mt-0.5">Perlu ditindaklanjuti</p>
            </div>
            <div className="p-4 space-y-4">
              {[
                { label: 'Banin', list: hadirTidakSetorBanin },
                { label: 'Banat', list: hadirTidakSetorBanat },
              ].map(grp => (
                <div key={grp.label}>
                  <p className="text-xs font-bold text-gray-500 tracking-wide mb-2">{grp.label.toUpperCase()} ({grp.list.length})</p>
                  {grp.list.length === 0 ? (
                    <p className="text-gray-400 text-sm py-1">Tidak ada</p>
                  ) : (
                    <div className="space-y-2">
                      {grp.list.map(s => (
                        <div key={s.id} className="text-sm border-b last:border-0 py-1.5">
                          <div className="font-medium text-gray-800">{s.nama}</div>
                          <div className="text-xs text-gray-400">{s.kelas || '-'} • Guru: {s.guru?.nama || '-'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ALPHA / SAKIT / IZIN */}
          <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">Kehadiran Lainnya</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-red-50 border border-red-100">
                <div className="text-2xl font-bold text-red-600">{alpha.length}</div>
                <div className="text-xs text-red-500 font-semibold mt-0.5">Alpha</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-yellow-50 border border-yellow-100">
                <div className="text-2xl font-bold text-yellow-600">{sakit.length}</div>
                <div className="text-xs text-yellow-600 font-semibold mt-0.5">Sakit</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="text-2xl font-bold text-blue-600">{izin.length}</div>
                <div className="text-xs text-blue-600 font-semibold mt-0.5">Izin</div>
              </div>
            </div>
            {alpha.length > 0 && (
              <div className="pt-3 mt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: 'Alpha Banin', list: alphaBanin },
                  { label: 'Alpha Banat', list: alphaBanat },
                ].map(grp => (
                  <div key={grp.label}>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">{grp.label}:</p>
                    {grp.list.length === 0 ? (
                      <p className="text-xs text-gray-400">Tidak ada</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {grp.list.map(s => (
                          <span key={s.id} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">{s.nama}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PROGRESS */}
          <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Progress Input Setoran</span>
              <span className="text-sm font-bold" style={{ color: '#2563a8' }}>
                {santriList.length > 0 ? Math.round((sudahDiproses / santriList.length) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-1">
              <div className="h-4 rounded-full" style={{ width: `${santriList.length > 0 ? (sudahDiproses / santriList.length) * 100 : 0}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
            </div>
            <p className="text-xs text-gray-400">Sudah diproses {sudahDiproses} dari {santriList.length} santri</p>
          </div>

          {/* ABSENSI GURU -- dipisah Putra/Putri (exception-first) */}
          <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Absensi Guru</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Guru Putra', kelompok: 'putra' as const, subuh: ringkasSubuhPutra, pagi: ringkasPagiPutra, bg: 'linear-gradient(135deg, #1a3a5c, #2563a8)' },
                { label: 'Guru Putri', kelompok: 'putri' as const, subuh: ringkasSubuhPutri, pagi: ringkasPagiPutri, bg: 'linear-gradient(135deg, #9333ea, #c026d3)' },
              ].map(grp => (
                <div key={grp.kelompok} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 flex items-center justify-between gap-2" style={{ background: grp.bg }}>
                    <span className="text-white font-semibold text-sm">{grp.label}</span>
                    <button onClick={() => handleSalinAbsensi(grp.kelompok)}
                      className="bg-white bg-opacity-90 text-gray-700 text-[11px] font-semibold px-2 py-1 rounded-lg flex-shrink-0">
                      {labelTombol(`absensi-${grp.kelompok}`, '📋 Salin')}
                    </button>
                  </div>
                  <div className="p-3 space-y-3">
                    {[
                      { label: 'Sesi Subuh', jam: '04.00 - 05.30', ringkas: grp.subuh },
                      { label: 'Sesi Pagi', jam: '08.00 - 09.45', ringkas: grp.pagi },
                    ].map(sesi => (
                      <div key={sesi.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-600">{sesi.label} <span className="text-gray-400 font-normal">({sesi.jam})</span></span>
                        </div>
                        <div className="flex gap-4 mb-1 text-sm">
                          <span className="text-green-600 font-semibold">Hadir: {sesi.ringkas.hadir}</span>
                          <span className={`font-semibold ${sesi.ringkas.belumAbsen.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            Belum Absen: {sesi.ringkas.belumAbsen.length}
                          </span>
                        </div>
                        {sesi.ringkas.belumAbsen.length === 0 ? (
                          <p className="text-xs text-green-600 font-medium">✓ Semua {grp.label} sudah absen</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {sesi.ringkas.belumAbsen.map(g => (
                              <span key={g.id} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full border border-red-100">{g.nama}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {guruTakTerklasifikasi.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-1">Guru Belum Terklasifikasi ({guruTakTerklasifikasi.length})</p>
                <p className="text-[11px] text-gray-400">Perlu dilengkapi jenis kelas (Banin/Banat) di Data Guru: {guruTakTerklasifikasi.map(g => g.nama).join(', ')}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
