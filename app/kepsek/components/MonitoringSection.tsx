'use client'
import { useState } from 'react'
import {
  getKelasOptions, getKelompokSantri, getKelompokGuru,
  groupBelumDiinputByGuru, buildClipboardBelumDiinput,
  ringkasAbsensiGuru, buildClipboardAbsensiGuru,
} from '../utils'
import type { Guru } from '../types'
import type { useKepsekMonitoring } from '../hooks/useKepsekMonitoring'

const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

type Monitoring = ReturnType<typeof useKepsekMonitoring>

const pill = (label: string, count: number, className: string) => (
  <div className={`rounded-xl px-3 py-2 text-center ${className}`}>
    <div className="text-lg font-bold">{count}</div>
    <div className="text-[11px] font-semibold leading-tight">{label}</div>
  </div>
)

// Tab "Monitoring Harian" -- didesain ulang Tahap 7B: dari 6 kartu statistik
// sejajar + 2 kolom daftar panjang, menjadi Ringkasan (pills, sekilas) lalu
// Detail per kategori (collapsible via <details>), diprioritaskan Belum
// Diinput > Hadir Tidak Setor > Alpha, dengan Sakit/Izin/Sudah Setor
// tertutup default supaya tidak memenuhi layar. Filter (tanggal/jenjang/
// kelas/cari) dan rumus kategori (utils.ts) TIDAK diubah.
//
// Koreksi Tahap 7B: tambah filter Semua/Banin/Banat (item F), tombol Salin
// Belum Diinput Banin/Banat untuk TANGGAL YANG DIPILIH (item E, pakai
// santriMonitoringFilteredDasar supaya tidak ikut terpotong oleh toggle
// tampilan Semua/Banin/Banat), dan Absensi Guru dipisah Putra/Putri + tombol
// Salin masing-masing (item I/K), semua dari data existing (zero query baru).
export function MonitoringSection(props: { today: string, guruList: Guru[] } & Monitoring) {
  const {
    today, guruList,
    monitoringTanggal, handleUbahTanggalMonitoring,
    filterMonitoringJenjang, setFilterMonitoringJenjang, filterMonitoringKelas, setFilterMonitoringKelas,
    filterKelompokSantri, setFilterKelompokSantri,
    searchMonitoring, setSearchMonitoring, loadingMonitoring,
    santriSudahSetorFiltered, santriHadirTidakSetorFiltered,
    santriBelumDiinputFiltered, santriMonitoringFiltered, santriMonitoringFilteredDasar,
    santriAlphaFiltered, santriSakitFiltered, santriIzinFiltered,
    guruAbsenSubuhTanggal, guruAbsenPagiTanggal, setoranTanggalDipilih,
  } = props

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

  const tanggalLabelDipilih = new Date(monitoringTanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Belum Diinput per kelompok santri UNTUK TANGGAL YANG DIPILIH -- dari
  // santriMonitoringFilteredDasar (jenjang/kelas/nama saja, BELUM kelompok)
  // supaya tombol Banin & Banat tetap tersedia berdua meski toggle tampilan
  // sedang di posisi lain.
  const belumDiinputDasar = santriMonitoringFilteredDasar.filter(s => s.kategoriSetor === 'belum_diinput')
  const belumDiinputBaninDasar = belumDiinputDasar.filter(s => getKelompokSantri(s.jenis_kelas) === 'banin')
  const belumDiinputBanatDasar = belumDiinputDasar.filter(s => getKelompokSantri(s.jenis_kelas) === 'banat')

  const handleSalinBelumDiinput = (kelompok: 'banin' | 'banat') => {
    const list = kelompok === 'banin' ? belumDiinputBaninDasar : belumDiinputBanatDasar
    const groups = groupBelumDiinputByGuru(list)
    const judul = `MONITORING SETORAN ${kelompok === 'banin' ? 'BANIN' : 'BANAT'}`
    salin(`belum-diinput-${kelompok}`, buildClipboardBelumDiinput(judul, groups, tanggalLabelDipilih))
  }

  // Absensi Guru dipisah Putra/Putri untuk TANGGAL YANG DIPILIH -- data
  // (guruAbsenSubuhTanggal/guruAbsenPagiTanggal) sudah tersedia dari
  // useKepsekMonitoring (di-fetch bersamaan setoran tanggal dipilih), jadi
  // tidak perlu query baru.
  const guruPutra = guruList.filter(g => getKelompokGuru(g.jenis_kelas) === 'putra')
  const guruPutri = guruList.filter(g => getKelompokGuru(g.jenis_kelas) === 'putri')
  const guruTakTerklasifikasi = guruList.filter(g => getKelompokGuru(g.jenis_kelas) === 'belum_terklasifikasi')
  const ringkasSubuhPutra = ringkasAbsensiGuru(guruPutra, guruAbsenSubuhTanggal)
  const ringkasPagiPutra = ringkasAbsensiGuru(guruPutra, guruAbsenPagiTanggal)
  const ringkasSubuhPutri = ringkasAbsensiGuru(guruPutri, guruAbsenSubuhTanggal)
  const ringkasPagiPutri = ringkasAbsensiGuru(guruPutri, guruAbsenPagiTanggal)

  const handleSalinAbsensi = (kelompok: 'putra' | 'putri') => {
    const judul = `ABSENSI GURU ${kelompok === 'putra' ? 'PUTRA' : 'PUTRI'}`
    const label = kelompok === 'putra' ? 'Guru Putra' : 'Guru Putri'
    const subuh = kelompok === 'putra' ? ringkasSubuhPutra.belumAbsen : ringkasSubuhPutri.belumAbsen
    const pagi = kelompok === 'putra' ? ringkasPagiPutra.belumAbsen : ringkasPagiPutri.belumAbsen
    salin(`absensi-${kelompok}`, buildClipboardAbsensiGuru(judul, label, tanggalLabelDipilih, subuh, pagi))
  }

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Monitoring Setoran</h2>
          <p className="text-blue-200 text-sm mt-1">Lihat data per tanggal</p>
        </div>
      </div>

      {/* Filter & Tanggal */}
      <div className="bg-white rounded-2xl shadow p-4 mb-5 border border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">📅 Tanggal</label>
            <input type="date" value={monitoringTanggal}
              onChange={e => handleUbahTanggalMonitoring(e.target.value)}
              max={today} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
            <select value={filterMonitoringJenjang} onChange={e => { setFilterMonitoringJenjang(e.target.value); setFilterMonitoringKelas('semua') }} className={inputClass}>
              <option value="semua">Semua</option>
              <option value="ula">Ula</option>
              <option value="wustha">Wustha</option>
              <option value="ulya">Ulya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelas</label>
            <select value={filterMonitoringKelas} onChange={e => setFilterMonitoringKelas(e.target.value)} className={inputClass}>
              <option value="semua">Semua</option>
              {getKelasOptions(filterMonitoringJenjang).map(k => (<option key={k} value={k}>Kelas {k}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cari Santri</label>
            <input type="text" value={searchMonitoring} onChange={e => setSearchMonitoring(e.target.value)}
              placeholder="Nama santri..." className={inputClass} />
          </div>
        </div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">
            Tanggal: <span className="font-semibold text-gray-600">{tanggalLabelDipilih}</span>
          </p>
          {loadingMonitoring && <span className="text-xs text-blue-500">Memuat...</span>}
        </div>
        <div className="flex gap-2">
          {(['semua', 'banin', 'banat'] as const).map(k => (
            <button key={k} onClick={() => setFilterKelompokSantri(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterKelompokSantri === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {k === 'semua' ? 'Semua' : k === 'banin' ? 'Banin' : 'Banat'}
            </button>
          ))}
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
        {pill('Belum Diinput', santriBelumDiinputFiltered.length, 'bg-red-100 text-red-700')}
        {pill('Hadir, Tdk Setor', santriHadirTidakSetorFiltered.length, 'bg-orange-100 text-orange-700')}
        {pill('Alpha', santriAlphaFiltered.length, 'bg-rose-100 text-rose-700')}
        {pill('Sakit', santriSakitFiltered.length, 'bg-yellow-100 text-yellow-700')}
        {pill('Izin', santriIzinFiltered.length, 'bg-blue-100 text-blue-700')}
        {pill('Sudah Setor', santriSudahSetorFiltered.length, 'bg-green-100 text-green-700')}
      </div>

      {/* Salin Belum Diinput (tanggal dipilih) -- selalu tersedia dua-duanya, terlepas dari toggle di atas */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => handleSalinBelumDiinput('banin')}
          className="flex-1 bg-white border border-red-200 text-red-700 text-xs font-semibold px-3 py-2.5 rounded-xl shadow-sm">
          {labelTombol('belum-diinput-banin', `📋 Salin Belum Diinput Banin (${belumDiinputBaninDasar.length})`)}
        </button>
        <button onClick={() => handleSalinBelumDiinput('banat')}
          className="flex-1 bg-white border border-red-200 text-red-700 text-xs font-semibold px-3 py-2.5 rounded-xl shadow-sm">
          {labelTombol('belum-diinput-banat', `📋 Salin Belum Diinput Banat (${belumDiinputBanatDasar.length})`)}
        </button>
      </div>

      {/* Detail per kategori, diprioritaskan (mengikuti toggle Semua/Banin/Banat) */}
      <div className="space-y-3 mb-5">
        <details className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden" open>
          <summary className="cursor-pointer select-none px-4 py-3 bg-gradient-to-r from-red-500 to-red-700 text-white font-semibold text-sm flex items-center justify-between">
            <span>Belum Diinput</span>
            <span className="bg-white bg-opacity-20 text-xs px-2 py-0.5 rounded-full font-bold">{santriBelumDiinputFiltered.length}</span>
          </summary>
          <div className="p-3 max-h-80 overflow-y-auto">
            {santriBelumDiinputFiltered.map(s => (
              <div key={s.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.nama}</div>
                  <div className="text-xs text-gray-400">{s.kelas || '-'} • {s.guru?.nama || '-'}</div>
                </div>
              </div>
            ))}
            {santriBelumDiinputFiltered.length === 0 && <p className="text-green-600 text-sm text-center py-4 font-semibold">✓ Semua sudah diinput</p>}
          </div>
        </details>

        <details className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden" open>
          <summary className="cursor-pointer select-none px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-700 text-white font-semibold text-sm flex items-center justify-between">
            <span>Hadir, Tidak Setor</span>
            <span className="bg-white bg-opacity-20 text-xs px-2 py-0.5 rounded-full font-bold">{santriHadirTidakSetorFiltered.length}</span>
          </summary>
          <div className="p-3 max-h-80 overflow-y-auto">
            {santriHadirTidakSetorFiltered.map(s => (
              <div key={s.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.nama}</div>
                  <div className="text-xs text-gray-400">{s.kelas || '-'} • {s.guru?.nama || '-'}</div>
                </div>
              </div>
            ))}
            {santriHadirTidakSetorFiltered.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Tidak ada</p>}
          </div>
        </details>

        <details className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden" open={santriAlphaFiltered.length > 0}>
          <summary className="cursor-pointer select-none px-4 py-3 bg-gradient-to-r from-rose-700 to-rose-900 text-white font-semibold text-sm flex items-center justify-between">
            <span>Alpha</span>
            <span className="bg-white bg-opacity-20 text-xs px-2 py-0.5 rounded-full font-bold">{santriAlphaFiltered.length}</span>
          </summary>
          <div className="p-3 max-h-80 overflow-y-auto">
            {santriAlphaFiltered.map(s => (
              <div key={s.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.nama}</div>
                  <div className="text-xs text-gray-400">{s.kelas || '-'} • {s.guru?.nama || '-'}</div>
                </div>
              </div>
            ))}
            {santriAlphaFiltered.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Tidak ada</p>}
          </div>
        </details>

        <details className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <summary className="cursor-pointer select-none px-4 py-3 bg-gray-50 text-gray-700 font-semibold text-sm flex items-center justify-between">
            <span>Sakit</span>
            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-bold">{santriSakitFiltered.length}</span>
          </summary>
          <div className="p-3 max-h-80 overflow-y-auto">
            {santriSakitFiltered.map(s => (
              <div key={s.id} className="text-sm py-1.5 border-b last:border-0">{s.nama} <span className="text-xs text-gray-400">— {s.kelas || '-'}</span></div>
            ))}
            {santriSakitFiltered.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Tidak ada</p>}
          </div>
        </details>

        <details className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <summary className="cursor-pointer select-none px-4 py-3 bg-gray-50 text-gray-700 font-semibold text-sm flex items-center justify-between">
            <span>Izin</span>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">{santriIzinFiltered.length}</span>
          </summary>
          <div className="p-3 max-h-80 overflow-y-auto">
            {santriIzinFiltered.map(s => (
              <div key={s.id} className="text-sm py-1.5 border-b last:border-0">{s.nama} <span className="text-xs text-gray-400">— {s.kelas || '-'}</span></div>
            ))}
            {santriIzinFiltered.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Tidak ada</p>}
          </div>
        </details>

        <details className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <summary className="cursor-pointer select-none px-4 py-3 bg-gradient-to-r from-green-600 to-green-800 text-white font-semibold text-sm flex items-center justify-between">
            <span>Sudah Setor</span>
            <span className="bg-white bg-opacity-20 text-xs px-2 py-0.5 rounded-full font-bold">{santriSudahSetorFiltered.length}</span>
          </summary>
          <div className="p-3 max-h-80 overflow-y-auto">
            {santriSudahSetorFiltered.map(s => {
              const setoran = setoranTanggalDipilih.filter(x => x.santri_id === s.id)
              return (
                <div key={s.id} className="py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                      {s.nama?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{s.nama}</div>
                      <div className="text-xs text-gray-400">{s.kelas || '-'} • {s.guru?.nama || '-'}</div>
                    </div>
                    <span className="text-green-500 text-xs font-semibold flex-shrink-0">✓ {setoran.length}x</span>
                  </div>
                  {setoran.map(st => (
                    <div key={st.id} className="ml-10 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {st.jenis === 'baru' ? 'Baru' : 'Murojaah'} — {st.status === 'lancar' ? '✓ Lancar' : '✗ Rosib'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
            {santriSudahSetorFiltered.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Belum ada</p>}
          </div>
        </details>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">Progress Setoran</span>
          <span className="text-sm font-bold" style={{ color: '#2563a8' }}>
            {santriMonitoringFiltered.length > 0 ? Math.round((santriSudahSetorFiltered.length / santriMonitoringFiltered.length) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div className="h-4 rounded-full" style={{ width: `${santriMonitoringFiltered.length > 0 ? (santriSudahSetorFiltered.length / santriMonitoringFiltered.length) * 100 : 0}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{santriSudahSetorFiltered.length} dari {santriMonitoringFiltered.length} santri</p>
      </div>

      {/* Absensi Guru tanggal dipilih -- dipisah Putra/Putri (Koreksi Tahap 7B) */}
      <div className="bg-white rounded-2xl shadow p-4 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3 text-sm">Absensi Guru</h3>
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
              <div className="p-3 space-y-2">
                {[{ label: 'Subuh', ringkas: grp.subuh }, { label: 'Pagi', ringkas: grp.pagi }].map(sesi => (
                  <div key={sesi.label}>
                    <div className="flex gap-3 text-xs mb-1">
                      <span className="font-semibold text-gray-600">{sesi.label}</span>
                      <span className="text-green-600">Hadir: {sesi.ringkas.hadir}</span>
                      <span className={sesi.ringkas.belumAbsen.length > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>Belum Absen: {sesi.ringkas.belumAbsen.length}</span>
                    </div>
                    {sesi.ringkas.belumAbsen.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {sesi.ringkas.belumAbsen.map(g => (
                          <span key={g.id} className="text-[11px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full border border-red-100">{g.nama}</span>
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
          <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-1">Guru Belum Terklasifikasi ({guruTakTerklasifikasi.length})</p>
            <p className="text-[11px] text-gray-400">Perlu dilengkapi jenis kelas (Banin/Banat) di Data Guru: {guruTakTerklasifikasi.map(g => g.nama).join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
