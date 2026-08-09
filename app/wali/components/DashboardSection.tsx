'use client'
import { getTanggalWIB } from '../../lib/dateWib'
import { getStatusKehadiranInfo, ringkasLaporanHariIni } from '../utils'
import type { Santri, SetoranRow } from '../types'
import type { useWaliLaporanHarian } from '../hooks/useWaliLaporanHarian'
import type { useWaliNotifikasi } from '../hooks/useWaliNotifikasi'

type Laporan = ReturnType<typeof useWaliLaporanHarian>
type Notifikasi = ReturnType<typeof useWaliNotifikasi>

// Tab "Ringkasan" (dashboard) -- dipindah dari app/wali/page.tsx
// (Modularisasi Tahap 8A). JSX/className identik dengan sebelumnya.
// isLiburHariIni/tanggalHariIni/isHariIni/isUlyaSantri/ringkasan laporan
// dihitung di sini karena hanya dipakai tab ini.
export function DashboardSection(props: {
  selectedSantri: Santri
  laporan: Laporan
  notifikasi: Notifikasi
  peringkatHafalan: { peringkat: number, total: number } | null
  peringkatKonsistensi: number | null
  peringkatSemangat: number | null
  allSantriKelasLength: number
  riwayatSetoran: SetoranRow[]
  totalSetoran: number
  totalLancar: number
  totalRosib: number
  setoranBaru: number
}) {
  const {
    selectedSantri, laporan, notifikasi,
    peringkatHafalan, peringkatKonsistensi, peringkatSemangat, allSantriKelasLength,
    riwayatSetoran, totalSetoran, totalLancar, totalRosib, setoranBaru,
  } = props
  const { laporanHariIni, tanggalLaporan, handleGantiTanggalLaporan } = laporan
  const { notifAktif, notifLoading, notifPesan, handleAktifkanNotif } = notifikasi

  const tanggalHariIni = new Date(tanggalLaporan + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hariNomorWIB = new Date(tanggalLaporan + 'T00:00:00').getDay()
  const isLiburHariIni = hariNomorWIB === 0 || hariNomorWIB === 5
  const isUlyaSantri = selectedSantri?.jenjang === 'ulya'
  const isHariIni = tanggalLaporan === getTanggalWIB()

  const ringkasan = ringkasLaporanHariIni(laporanHariIni, isLiburHariIni)
  const { adaHadir, hafalanBaruHariIni, murojaahHariIni, catatanHariIni, statusBadge, pesanOtomatis, pesanWarna } = ringkasan

  return (
    <div>
      {/* ===== KARTU LAPORAN HARI INI ===== */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 overflow-hidden mb-5">
        <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
          <div className="text-center mb-3">
            <h3 className="text-white font-bold text-sm flex items-center justify-center gap-1.5">
              📋 {isHariIni ? 'Laporan Hari Ini' : 'Laporan'}
            </h3>
            <div className="text-blue-200 text-xs mt-0.5">{tanggalHariIni}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleGantiTanggalLaporan(-1, selectedSantri?.id)}
              className="flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-black text-white rounded-xl px-3 py-2 transition">
              <span className="text-base">‹</span>
              <span className="text-xs font-medium leading-tight text-left">Lihat hari<br />sebelumnya</span>
            </button>
            <button onClick={() => handleGantiTanggalLaporan(1, selectedSantri?.id)}
              disabled={isHariIni}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition ${isHariIni ? 'bg-gray-700 bg-opacity-40 text-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black text-white'}`}>
              <span className="text-xs font-medium leading-tight text-right">Lihat hari<br />setelahnya</span>
              <span className="text-base">›</span>
            </button>
          </div>
        </div>
        <div className="p-5">
          {/* Status Kehadiran */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-600">Status Kehadiran</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusBadge.color}`}>{statusBadge.label}</span>
          </div>

          {/* Detail setoran — hanya tampil jika hadir & ada setoran */}
          {adaHadir && (
            <div className="space-y-3 mb-4">
              {/* Hafalan Baru (skip untuk Ulya) */}
              {!isUlyaSantri && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="text-xs font-semibold text-blue-800 mb-1">📖 Hafalan Baru</div>
                  {hafalanBaruHariIni ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-800 font-medium">{hafalanBaruHariIni.surah} ayat {hafalanBaruHariIni.ayat_mulai}–{hafalanBaruHariIni.ayat_selesai}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${hafalanBaruHariIni.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {hafalanBaruHariIni.status === 'lancar' ? '✓ Lancar' : '✗ Rosib'}
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic">Tidak ada setoran hafalan baru hari ini</div>
                  )}
                </div>
              )}

              {/* Murojaah */}
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                <div className="text-xs font-semibold text-purple-800 mb-1">🔄 Murojaah (Hafalan Lama)</div>
                {murojaahHariIni ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-800 font-medium">{murojaahHariIni.surah} ayat {murojaahHariIni.ayat_mulai}–{murojaahHariIni.ayat_selesai}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${murojaahHariIni.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {murojaahHariIni.status === 'lancar' ? '✓ Lancar' : '✗ Rosib'}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">Tidak ada setoran murojaah hari ini</div>
                )}
              </div>
            </div>
          )}

          {/* Catatan Guru */}
          {catatanHariIni.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-xs font-semibold text-amber-800 mb-1">📝 Catatan dari Ustadz/Ustadzah</div>
              {catatanHariIni.map((c, i) => (
                <div key={i} className="text-sm text-amber-900">• {c}</div>
              ))}
            </div>
          )}

          {/* Pesan Otomatis */}
          {pesanOtomatis && (
            <div className={`p-3 rounded-xl border text-sm leading-relaxed ${pesanWarna}`}>
              {pesanOtomatis}
            </div>
          )}
        </div>
      </div>

      {/* ===== KARTU AKTIFKAN NOTIFIKASI ===== */}
      {!notifAktif && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden mb-5">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-3xl flex-shrink-0">🔔</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-sm mb-1">Aktifkan Notifikasi</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">
                  Dapatkan pemberitahuan langsung di HP setiap ada laporan hafalan ananda yang baru, tanpa perlu membuka aplikasi.
                </p>
                <button onClick={handleAktifkanNotif} disabled={notifLoading}
                  className="w-full text-white py-2.5 rounded-xl font-semibold text-sm shadow disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
                  {notifLoading ? 'Memproses...' : '🔔 Aktifkan Notifikasi Sekarang'}
                </button>
                {notifPesan && (
                  <p className={`text-xs mt-2 ${notifAktif ? 'text-green-600' : 'text-red-500'}`}>{notifPesan}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {notifAktif && (
        <div className="bg-green-50 rounded-2xl border border-green-200 p-3 mb-5 flex items-center gap-2">
          <span className="text-lg">✅</span>
          <span className="text-sm text-green-700 font-medium">Notifikasi sudah aktif di perangkat ini</span>
        </div>
      )}

      {/* 3 kartu peringkat ringkas */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Peringkat Hafalan', nilai: peringkatHafalan?.peringkat, satuan: `dari ${peringkatHafalan?.total}`, color: 'from-yellow-500 to-yellow-600' },
          { label: 'Konsistensi Setor', nilai: peringkatKonsistensi || '-', satuan: `dari ${allSantriKelasLength}`, color: 'from-blue-500 to-blue-700' },
          { label: 'Semangat Hafal', nilai: peringkatSemangat || '-', satuan: `dari ${allSantriKelasLength}`, color: 'from-purple-500 to-purple-700' },
        ].map((item, i) => (
          <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-3 shadow text-white relative overflow-hidden`}>
            <div className="absolute -bottom-2 -right-2 text-4xl opacity-10">◆</div>
            <div className="text-2xl font-bold">{item.nilai ?? '-'}</div>
            <div className="text-white text-opacity-80 text-xs mt-0.5">{item.label}</div>
            <div className="text-white text-opacity-60 text-xs">{item.satuan}</div>
          </div>
        ))}
      </div>

      {/* Ringkasan 30 setoran terakhir */}
      <h3 className="text-lg font-bold text-gray-800 mb-4">Ringkasan 30 Setoran Terakhir</h3>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { count: totalSetoran, label: 'Total Setoran', color: 'from-blue-500 to-blue-700' },
          { count: totalLancar, label: 'Lancar', color: 'from-green-500 to-green-700' },
          { count: totalRosib, label: 'Rosib', color: 'from-red-500 to-red-700' },
          { count: setoranBaru, label: 'Hafalan Baru', color: 'from-purple-500 to-purple-700' },
        ].map((item, i) => (
          <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
            <div className="absolute -bottom-2 -right-2 text-4xl opacity-10">◆</div>
            <div className="text-3xl font-bold">{item.count}</div>
            <div className="text-white text-opacity-80 text-xs mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold text-gray-800 mb-3">Setoran Terbaru</h3>
      <div className="space-y-3">
        {riwayatSetoran.slice(0, 5).map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <div className="flex justify-between items-start mb-1">
              <div>
                {item.status_kehadiran && item.status_kehadiran !== 'hadir' ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusKehadiranInfo(item.status_kehadiran).color}`}>
                    {getStatusKehadiranInfo(item.status_kehadiran).label}
                  </span>
                ) : (
                  <div className="font-semibold text-sm text-gray-800">{item.surah} ayat {item.ayat_mulai}–{item.ayat_selesai}</div>
                )}
              </div>
              {item.status_kehadiran === 'hadir' && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {item.status_kehadiran === 'hadir' && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {item.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}
                </span>
              )}
              <span className="text-xs text-gray-400">{item.tanggal}</span>
            </div>
            {item.catatan && <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-600">Catatan guru: {item.catatan}</div>}
          </div>
        ))}
        {riwayatSetoran.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
            <p className="text-gray-400 text-sm">Belum ada riwayat setoran</p>
          </div>
        )}
      </div>
    </div>
  )
}
