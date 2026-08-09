'use client'
import { getKelasOptions, jenjangLabel } from '../utils'
import type { useAdminNaikKelas } from '../hooks/useAdminNaikKelas'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

type NaikKelas = ReturnType<typeof useAdminNaikKelas>

// Tab "Naik Kelas" -- dipindah dari app/admin/page.tsx (Modularisasi Tahap
// 6A). JSX/className identik dengan sebelumnya; logic preview & proses naik
// kelas TIDAK diubah (lihat useAdminNaikKelas.ts).
export function NaikKelasSection(props: { naikKelas: NaikKelas }) {
  const { naikKelas: nk } = props

  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Proses Naik Kelas</h2>
          <p className="text-blue-200 text-sm mt-1">Pilih kelas yang akan dinaikkan</p>
          <p className="text-blue-300 text-xs mt-0.5">⚠️ Guru lama akan diputus, sambungkan guru baru setelah proses</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-5 mb-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Pilih Kelas</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
            <select value={nk.naikKelasJenjang} onChange={e => { nk.setNaikKelasJenjang(e.target.value); nk.setNaikKelasNum(''); nk.setNaikKelasPreview([]) }} className={inputClass}>
              <option value="ula">Ula</option>
              <option value="wustha">Wustha</option>
              <option value="ulya">Ulya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelas</label>
            <select value={nk.naikKelasNum} onChange={e => { nk.setNaikKelasNum(e.target.value); nk.setNaikKelasPreview([]) }} className={inputClass}>
              <option value="">-- Pilih Kelas</option>
              {getKelasOptions(nk.naikKelasJenjang).map(k => (
                <option key={k} value={k}>Kelas {k}</option>
              ))}
            </select>
          </div>
        </div>

        {nk.naikKelasNum && (
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 mb-4 text-xs text-blue-700">
            {nk.naikKelasJenjang === 'ulya' && parseInt(nk.naikKelasNum) === 12
              ? '🎓 Santri Kelas 12 Ulya yang dicentang akan menjadi Alumni (Lulus)'
              : `📚 Santri akan naik ke Kelas ${parseInt(nk.naikKelasNum) + 1} ${
                  nk.naikKelasJenjang === 'ula' && parseInt(nk.naikKelasNum) === 6 ? 'Wustha' :
                  nk.naikKelasJenjang === 'wustha' && parseInt(nk.naikKelasNum) === 9 ? 'Ulya' :
                  jenjangLabel(nk.naikKelasJenjang)
                }`
            }
          </div>
        )}

        <button onClick={nk.handlePreviewNaikKelas} disabled={!nk.naikKelasNum}
          className="w-full text-white py-3 rounded-xl font-semibold text-sm shadow disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
          Lihat Daftar Santri
        </button>
      </div>

      {nk.naikKelasPreview.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-800">Daftar Santri Kelas {nk.naikKelasNum} {jenjangLabel(nk.naikKelasJenjang)}</h3>
            <div className="flex gap-2">
              <button onClick={() => {
                const all: Record<string, boolean> = {}
                nk.naikKelasPreview.forEach(s => { all[s.id] = true })
                nk.setNaikKelasChecked(all)
              }} className="text-xs text-blue-600 px-3 py-1 rounded-lg bg-blue-50">Pilih Semua</button>
              <button onClick={() => nk.setNaikKelasChecked({})}
                className="text-xs text-gray-500 px-3 py-1 rounded-lg bg-gray-100">Hapus Pilihan</button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-3">Centang santri yang akan naik kelas. Yang tidak dicentang tetap di kelas yang sama.</p>
          <div className="space-y-2 mb-4">
            {nk.naikKelasPreview.map(s => (
              <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${nk.naikKelasChecked[s.id] ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
                onClick={() => nk.setNaikKelasChecked(prev => ({ ...prev, [s.id]: !prev[s.id] }))}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${nk.naikKelasChecked[s.id] ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                  {nk.naikKelasChecked[s.id] && <span className="text-white text-xs">✓</span>}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{s.nama}</div>
                  <div className="text-xs text-gray-400">{s.kelas}</div>
                </div>
                {nk.naikKelasChecked[s.id] && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {nk.naikKelasJenjang === 'ulya' && parseInt(nk.naikKelasNum) === 12 ? 'Lulus' : 'Naik'}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 mb-4">
            <p className="text-xs text-yellow-700">
              ✓ Naik: <span className="font-bold">{Object.values(nk.naikKelasChecked).filter(Boolean).length} santri</span>
              &nbsp;•&nbsp;
              Tetap: <span className="font-bold">{nk.naikKelasPreview.length - Object.values(nk.naikKelasChecked).filter(Boolean).length} santri</span>
            </p>
          </div>
          {nk.naikKelasMsg && (
            <div className={`p-3 rounded-xl mb-4 text-sm ${nk.naikKelasMsg.startsWith('✓') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {nk.naikKelasMsg}
            </div>
          )}
          <button onClick={nk.handleProsesNaikKelas} disabled={nk.naikKelasLoading}
            className="w-full text-white py-3 rounded-xl font-bold text-sm shadow disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}>
            {nk.naikKelasLoading ? 'Memproses...' : `✓ Proses Naik Kelas (${Object.values(nk.naikKelasChecked).filter(Boolean).length} santri)`}
          </button>
        </div>
      )}

      {nk.naikKelasMsg && nk.naikKelasPreview.length === 0 && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl text-sm">{nk.naikKelasMsg}</div>
      )}
    </div>
  )
}
