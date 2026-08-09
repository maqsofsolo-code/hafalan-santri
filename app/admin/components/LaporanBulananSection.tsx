'use client'
import { getKelasOptions, jenjangLabel } from '../utils'
import type { Santri } from '../types'
import type { useAdminLaporan } from '../hooks/useAdminLaporan'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

type Laporan = ReturnType<typeof useAdminLaporan>

// Tab "Laporan Bulanan" -- dipindah dari app/admin/page.tsx (Modularisasi
// Tahap 6A). JSX/className identik dengan sebelumnya.
export function LaporanBulananSection(props: { laporan: Laporan, santriList: Santri[] }) {
  const { laporan, santriList } = props

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Laporan Bulanan</h2>
          <p className="text-teal-100 text-sm mt-1">Rekap setoran hafalan per santri</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Filter Laporan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">📅 Bulan</label>
            <input type="month" value={laporan.laporanBulan}
              onChange={e => laporan.setLaporanBulan(e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
            <select value={laporan.laporanJenjang}
              onChange={e => { laporan.setLaporanJenjang(e.target.value); laporan.setLaporanKelas('semua'); laporan.setLaporanSantriId('semua') }}
              className={inputClass}>
              <option value="semua">Semua Jenjang</option>
              <option value="ula">Ula</option>
              <option value="wustha">Wustha</option>
              <option value="ulya">Ulya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelas</label>
            <select value={laporan.laporanKelas}
              onChange={e => { laporan.setLaporanKelas(e.target.value); laporan.setLaporanSantriId('semua') }}
              className={inputClass}>
              <option value="semua">Semua Kelas</option>
              {getKelasOptions(laporan.laporanJenjang).map(k => (
                <option key={k} value={k}>Kelas {k}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Santri Tertentu</label>
            <select value={laporan.laporanSantriId} onChange={e => laporan.setLaporanSantriId(e.target.value)} className={inputClass}>
              <option value="semua">Semua Santri</option>
              {santriList
                .filter(s => laporan.laporanJenjang === 'semua' || s.jenjang === laporan.laporanJenjang)
                .filter(s => laporan.laporanKelas === 'semua' || s.kelas_num?.toString() === laporan.laporanKelas)
                .map(s => (<option key={s.id} value={s.id}>{s.nama}</option>))}
            </select>
          </div>
        </div>

        <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 mb-4">
          <p className="text-xs text-teal-700">
            📋 Laporan bulan <span className="font-semibold">
              {new Date(laporan.laporanBulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </span>
            {laporan.laporanJenjang !== 'semua' && ` • Jenjang ${jenjangLabel(laporan.laporanJenjang)}`}
            {laporan.laporanKelas !== 'semua' && ` • Kelas ${laporan.laporanKelas}`}
            {laporan.laporanSantriId !== 'semua' && ` • ${santriList.find(s => s.id === laporan.laporanSantriId)?.nama || ''}`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => laporan.handleDownloadLaporan('excel')} disabled={laporan.laporanLoading !== ''}
            className="flex items-center justify-center gap-2 text-white py-3 px-4 rounded-xl font-semibold text-sm shadow disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
            {laporan.laporanLoading === 'excel' ? 'Menyiapkan...' : '📥 Download Excel'}
          </button>
          <button onClick={() => laporan.handleDownloadLaporan('pdf')} disabled={laporan.laporanLoading !== ''}
            className="flex items-center justify-center gap-2 text-white py-3 px-4 rounded-xl font-semibold text-sm shadow disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c2d12, #ea580c)' }}>
            {laporan.laporanLoading === 'pdf' ? 'Menyiapkan...' : '📄 Download PDF'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 border border-gray-100">
        <p className="text-xs font-semibold text-gray-600 mb-3">📌 Isi Laporan:</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          {[
            'Detail setoran per hari',
            'Status lancar / rosib',
            'Hafalan baru & murojaah',
            'Catatan guru',
            'Rekap kehadiran lengkap',
            'Penambahan hafalan bulan ini',
            'Tanda tangan kepala sekolah & guru',
            'Kop surat pesantren',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
