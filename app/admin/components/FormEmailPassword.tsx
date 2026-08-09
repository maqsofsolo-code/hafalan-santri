'use client'

// Blok form email/password bersama untuk Tambah/Edit Guru & Wali -- dipindah
// dari app/admin/page.tsx (Modularisasi Tahap 6A), JSX/className identik.
export function FormEmailPassword({
  isEdit,
  formEmail,
  setFormEmail,
  formPassword,
  setFormPassword,
  showPassword,
  setShowPassword
}: {
  isEdit: boolean
  formEmail: string
  setFormEmail: (v: string) => void
  formPassword: string
  setFormPassword: (v: string) => void
  showPassword: boolean
  setShowPassword: (v: boolean) => void
}) {
  return (
    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
      <p className="text-xs font-semibold text-yellow-800 mb-3">
        {isEdit ? '✏️ Ubah Email / Password (kosongkan jika tidak ingin diubah)' : '🔐 Akun Login'}
      </p>
      <div className="space-y-2">
        <input placeholder="Email" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <div className="relative">
          <input placeholder={isEdit ? "Password baru (kosongkan jika tidak diubah)" : "Password"}
            type={showPassword ? 'text' : 'password'} value={formPassword} onChange={e => setFormPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 pr-12" />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-gray-400 text-sm px-1">{showPassword ? '🙈' : '👁'}</button>
        </div>
        {showPassword && formPassword && (
          <div className="p-2 bg-white rounded-lg border border-yellow-200">
            <p className="text-xs text-gray-500">Password: <span className="font-bold text-gray-800">{formPassword}</span></p>
          </div>
        )}
      </div>
    </div>
  )
}
