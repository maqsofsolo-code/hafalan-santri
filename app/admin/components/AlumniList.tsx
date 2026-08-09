'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Santri } from '../types'

const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"

// Tab "Data Alumni" -- dipindah dari app/admin/page.tsx (Modularisasi Tahap
// 6A). Komponen ini SUDAH mandiri di file asli (state/fetch sendiri di
// dalam AlumniList lokal), dipindah apa adanya. `onEditSantri` menggantikan
// closure asli (handleEditSantri + pindah ke tab Data Santri + tutup
// sidebar mobile) yang sebelumnya diakses langsung dari scope AdminDashboard.
export function AlumniList(props: { onEditSantri: (s: Santri) => void }) {
  const { onEditSantri } = props
  const [alumniData, setAlumniData] = useState<Santri[]>([])
  const [filterStatusAlumni, setFilterStatusAlumni] = useState('semua')
  const [searchAlumni, setSearchAlumni] = useState('')

  useEffect(() => {
    const fetchAlumni = async () => {
      const { data } = await supabase.from('santri')
        .select('*, guru:guru_id(nama)')
        .in('status', ['alumni', 'keluar']).order('nama')
      setAlumniData(data || [])
    }
    fetchAlumni()
  }, [])

  const filtered = alumniData.filter(s => {
    if (filterStatusAlumni !== 'semua' && s.status !== filterStatusAlumni) return false
    if (searchAlumni && !s.nama?.toLowerCase().includes(searchAlumni.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div className="bg-white rounded-2xl shadow p-4 mb-4 border border-gray-100">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <select value={filterStatusAlumni} onChange={e => setFilterStatusAlumni(e.target.value)} className={inputClass}>
            <option value="semua">Semua</option>
            <option value="alumni">Alumni (Lulus)</option>
            <option value="keluar">Keluar</option>
          </select>
          <input type="text" value={searchAlumni} onChange={e => setSearchAlumni(e.target.value)}
            placeholder="Cari nama..." className={inputClass} />
        </div>
        <p className="text-xs text-gray-400">{filtered.length} dari {alumniData.length} alumni</p>
      </div>
      <div className="space-y-3">
        {filtered.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Belum ada data alumni</div>}
        {filtered.map(s => (
          <div key={s.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: s.status === 'alumni' ? 'linear-gradient(135deg, #92400e, #d97706)' : 'linear-gradient(135deg, #374151, #6b7280)' }}>
                {s.nama?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800">{s.nama}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.status === 'alumni' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                    {s.status === 'alumni' ? '🎓 Alumni' : '↩ Keluar'}
                  </span>
                  {s.jenjang && <span className="text-xs text-gray-400">Terakhir: {s.kelas || '-'}</span>}
                  {s.tahun_lulus && <span className="text-xs text-gray-400">TA {s.tahun_lulus}</span>}
                  {s.nisn && <span className="text-xs text-gray-400">NIS: {s.nisn}</span>}
                </div>
                {s.keterangan_keluar && <div className="text-xs text-gray-400 mt-0.5">{s.keterangan_keluar}</div>}
              </div>
              <button onClick={() => onEditSantri(s)}
                className="text-blue-500 text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50 flex-shrink-0">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
