'use client'
import { getTanggalWIB } from '../../lib/dateWib'
import type { Guru, Santri } from '../types'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

// Tab "Monitoring" -- dipindah dari app/admin/page.tsx (Modularisasi Tahap
// 6A). JSX/className identik dengan sebelumnya; seluruh state/handler
// datang dari useAdminMonitoring() lewat props.
export function MonitoringSection(props: {
  tanggal: string
  santriList: Santri[]
  guruList: Guru[]
  santriSudahSetor: Santri[]
  santriBelumSetor: Santri[]
  guruSudahInput: (string | undefined)[]
  guruBelumInput: Guru[]
  monitoringDownloadTanggal: string
  setMonitoringDownloadTanggal: (v: string) => void
  monitoringDownloadJenjang: string
  setMonitoringDownloadJenjang: (v: string) => void
  monitoringDownloadKelas: string
  setMonitoringDownloadKelas: (v: string) => void
  monitoringDownloadKelompok: string
  setMonitoringDownloadKelompok: (v: string) => void
  monitoringKelasOptions: number[]
  monitoringKelompokOptions: { value: string, label: string }[]
  monitoringDownloadFilterLengkap: boolean
  monitoringDownloadLoading: string
  monitoringDownloadMsg: string
  setMonitoringDownloadMsg: (v: string) => void
  handleDownloadMonitoring: (jenis: 'rosib' | 'belum-diinput') => void
}) {
  const {
    tanggal, santriList, guruList, santriSudahSetor, santriBelumSetor, guruSudahInput, guruBelumInput,
    monitoringDownloadTanggal, setMonitoringDownloadTanggal,
    monitoringDownloadJenjang, setMonitoringDownloadJenjang,
    monitoringDownloadKelas, setMonitoringDownloadKelas,
    monitoringDownloadKelompok, setMonitoringDownloadKelompok,
    monitoringKelasOptions, monitoringKelompokOptions, monitoringDownloadFilterLengkap,
    monitoringDownloadLoading, monitoringDownloadMsg, setMonitoringDownloadMsg, handleDownloadMonitoring,
  } = props

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Monitoring Harian</h2>
          <p className="text-blue-200 text-sm mt-1">📅 {tanggal}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Sudah Setor', count: santriSudahSetor.length, color: 'from-green-500 to-green-700', sub: 'Santri' },
          { label: 'Belum Setor', count: santriBelumSetor.length, color: 'from-red-500 to-red-700', sub: 'Santri' },
          { label: 'Guru Hadir', count: guruSudahInput.length, color: 'from-blue-500 to-blue-700', sub: 'Dari ' + guruList.length },
          { label: 'Guru Absen', count: guruBelumInput.length, color: 'from-orange-500 to-orange-700', sub: 'Tidak input' },
        ].map((item, i) => (
          <div key={i} className={`bg-gradient-to-br ${item.color} rounded-2xl p-4 shadow-lg text-white relative overflow-hidden`}>
            <div className="absolute -bottom-2 -right-2 text-5xl opacity-10">◆</div>
            <div className="text-3xl font-bold">{item.count}</div>
            <div className="font-semibold text-xs mt-1">{item.label}</div>
            <div className="text-white text-opacity-70 text-xs">{item.sub}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">Progress Setoran</span>
          <span className="text-sm font-bold" style={{ color: '#2563a8' }}>
            {santriList.length > 0 ? Math.round((santriSudahSetor.length / santriList.length) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div className="h-4 rounded-full" style={{ width: `${santriList.length > 0 ? (santriSudahSetor.length / santriList.length) * 100 : 0}%`, background: 'linear-gradient(135deg, #166534, #16a34a)' }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{santriSudahSetor.length} dari {santriList.length} santri</p>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
        <div className="mb-4">
          <h3 className="font-bold text-gray-800">Download Monitoring Santri</h3>
          <p className="text-xs text-gray-400 mt-1">
            Pilih tanggal dan kelompok santri untuk mengunduh daftar Rosib atau Belum Diinput.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tanggal</label>
            <input
              type="date"
              value={monitoringDownloadTanggal}
              max={getTanggalWIB()}
              onChange={e => { setMonitoringDownloadTanggal(e.target.value); setMonitoringDownloadMsg('') }}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
            <select
              value={monitoringDownloadJenjang}
              onChange={e => {
                setMonitoringDownloadJenjang(e.target.value)
                setMonitoringDownloadKelas('')
                setMonitoringDownloadKelompok('')
                setMonitoringDownloadMsg('')
              }}
              className={inputClass}
            >
              <option value="">Pilih Jenjang</option>
              <option value="ula">Ula</option>
              <option value="wustha">Wustha</option>
              <option value="ulya">Ulya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelas</label>
            <select
              value={monitoringDownloadKelas}
              disabled={!monitoringDownloadJenjang}
              onChange={e => {
                setMonitoringDownloadKelas(e.target.value)
                setMonitoringDownloadKelompok('')
                setMonitoringDownloadMsg('')
              }}
              className={inputClass}
            >
              <option value="">Pilih Kelas</option>
              {monitoringKelasOptions.map(kelas => (
                <option key={kelas} value={kelas}>Kelas {kelas}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelompok</label>
            <select
              value={monitoringDownloadKelompok}
              disabled={!monitoringDownloadKelas}
              onChange={e => { setMonitoringDownloadKelompok(e.target.value); setMonitoringDownloadMsg('') }}
              className={inputClass}
            >
              <option value="">Pilih Kelompok</option>
              {monitoringKelompokOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => handleDownloadMonitoring('rosib')}
            disabled={!monitoringDownloadFilterLengkap || monitoringDownloadLoading !== ''}
            className="w-full text-white px-4 py-3 rounded-xl font-semibold text-sm shadow disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #b91c1c, #ef4444)' }}
          >
            {monitoringDownloadLoading === 'rosib' ? 'Menyiapkan...' : 'Download Santri Rosib'}
          </button>
          <button
            onClick={() => handleDownloadMonitoring('belum-diinput')}
            disabled={!monitoringDownloadFilterLengkap || monitoringDownloadLoading !== ''}
            className="w-full text-white px-4 py-3 rounded-xl font-semibold text-sm shadow disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #9a3412, #f97316)' }}
          >
            {monitoringDownloadLoading === 'belum-diinput' ? 'Menyiapkan...' : 'Download Belum Diinput'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Belum diinput berarti belum ada record setoran maupun status kehadiran dari guru pada tanggal tersebut.
        </p>
        {monitoringDownloadMsg && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs">
            {monitoringDownloadMsg}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
            <h3 className="text-white font-semibold text-sm">Guru Hadir ({guruSudahInput.length})</h3>
          </div>
          <div className="p-3">
            {guruList.filter(g => guruSudahInput.includes(g.id)).map(g => (
              <div key={g.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">{g.nama?.charAt(0).toUpperCase()}</div>
                <span className="text-sm">{g.nama}</span>
                <span className="ml-auto text-green-500 text-xs">Hadir</span>
              </div>
            ))}
            {guruSudahInput.length === 0 && <p className="text-gray-400 text-sm text-center py-3">Belum ada</p>}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-700">
            <h3 className="text-white font-semibold text-sm">Guru Absen ({guruBelumInput.length})</h3>
          </div>
          <div className="p-3">
            {guruBelumInput.map(g => (
              <div key={g.id} className="flex items-center gap-2 py-2 border-b last:border-0">
                <div className="w-7 h-7 rounded-full bg-red-400 flex items-center justify-center text-white text-xs font-bold">{g.nama?.charAt(0).toUpperCase()}</div>
                <span className="text-sm">{g.nama}</span>
                <span className="ml-auto text-red-400 text-xs">Absen</span>
              </div>
            ))}
            {guruBelumInput.length === 0 && <p className="text-gray-400 text-sm text-center py-3">Semua hadir!</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
