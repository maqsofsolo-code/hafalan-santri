'use client'
import type { useRiwayatSetoran } from '../hooks/useRiwayatSetoran'

type RiwayatState = ReturnType<typeof useRiwayatSetoran>

// Tab "Riwayat Setoran" -- dipindah dari app/guru/page.tsx (Modularisasi
// Tahap 5A). JSX/className identik dengan sebelumnya.
export function RiwayatSetoranSection(props: { riwayat: RiwayatState }) {
  const { riwayat } = props
  return (
    <div>
      <div className="rounded-2xl p-5 mb-5 text-white relative overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 bg-white" />
        <div className="relative z-10">
          <h2 className="font-bold text-xl">Riwayat Setoran</h2>
          <p className="text-blue-200 text-sm mt-1">{riwayat.riwayatList.length} setoran tercatat</p>
        </div>
      </div>
      <div className="space-y-3">
        {riwayat.riwayatList.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center shadow border border-gray-100">
            <p className="text-gray-400">Belum ada riwayat setoran</p>
          </div>
        )}
        {riwayat.riwayatList.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                  {item.santri?.nama?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-sm">{item.santri?.nama}</div>
                  <div className="text-xs text-gray-400">{item.tanggal}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.status_kehadiran !== 'hadir' ? (
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status_kehadiran === 'sakit' ? 'bg-yellow-100 text-yellow-700' : item.status_kehadiran === 'izin' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                    {item.status_kehadiran?.toUpperCase()}
                  </span>
                ) : (
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'lancar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.status === 'lancar' ? 'Lancar' : 'Rosib'}
                  </span>
                )}
                {item.status_kehadiran === 'hadir' && (
                  <button onClick={() => { riwayat.setEditSetoran(item); riwayat.setEditStatus(item.status); riwayat.setEditCatatan(item.catatan || '') }}
                    className="text-blue-500 text-xs px-2 py-1 rounded-lg hover:bg-blue-50 border border-blue-200">
                    Edit
                  </button>
                )}
              </div>
            </div>
            {item.status_kehadiran === 'hadir' && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.jenis === 'baru' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {item.jenis === 'baru' ? 'Hafalan Baru' : 'Murojaah'}
                </span>
                <span className="text-xs text-gray-600">
                  {item.surah_mulai?.nama_latin || item.surah}
                  {item.surah_selesai && item.surah_mulai_nomor !== item.surah_selesai_nomor && <> → {item.surah_selesai?.nama_latin}</>}
                  {' '}ayat {item.ayat_mulai}–{item.ayat_selesai}
                </span>
                {item.guru_pengganti && <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">Pengganti</span>}
              </div>
            )}
            {item.catatan && <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-600">{item.catatan}</div>}
            {riwayat.editSetoran?.id === item.id && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">Edit Setoran:</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button onClick={() => riwayat.setEditStatus('lancar')}
                    className={`py-2 rounded-xl text-xs font-bold border-2 transition ${riwayat.editStatus === 'lancar' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                    ✓ Lancar
                  </button>
                  <button onClick={() => riwayat.setEditStatus('rosib')}
                    className={`py-2 rounded-xl text-xs font-bold border-2 transition ${riwayat.editStatus === 'rosib' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-500'}`}>
                    ✗ Rosib
                  </button>
                </div>
                <textarea value={riwayat.editCatatan} onChange={e => riwayat.setEditCatatan(e.target.value)}
                  placeholder="Catatan..." rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 mb-2" />
                <div className="flex gap-2">
                  <button onClick={riwayat.handleSimpanEditSetoran} disabled={riwayat.editLoading}
                    className="flex-1 text-white py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #1a3a5c, #2563a8)' }}>
                    {riwayat.editLoading ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button onClick={() => riwayat.setEditSetoran(null)}
                    className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-xs font-semibold">
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {riwayat.riwayatHasMore && riwayat.riwayatList.length > 0 && (
          <button onClick={riwayat.fetchMoreRiwayat} disabled={riwayat.riwayatLoadingMore}
            className="w-full py-3 rounded-xl text-sm font-semibold border-2 border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50">
            {riwayat.riwayatLoadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
          </button>
        )}
      </div>
    </div>
  )
}
