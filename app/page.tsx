'use client'
import { useState } from 'react'
import { supabase } from './lib/supabase'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email atau password salah!')
      setLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'guru') window.location.href = '/guru'
    else if (profile?.role === 'admin') window.location.href = '/admin'
    else if (profile?.role === 'kepsek') window.location.href = '/kepsek'
    else if (profile?.role === 'wali') window.location.href = '/wali'
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 50%, #1a3a5c 100%)' }}>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header Biru */}
        <div className="px-8 py-8 text-center"
          style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}>

          {/* Logo Pesantren */}
          <div className="flex justify-center mb-4">
  <Image
    src="/logo.png"
    alt="Logo Daarus Salaf"
    width={100}
    height={100}
    className="object-contain drop-shadow-lg"
  />
</div>

<h1 className="text-white font-bold text-2xl leading-tight tracking-wide">
  PONDOK PESANTREN
</h1>
<h2 className="text-white font-bold text-2xl leading-tight tracking-wide">
  DAARUS SALAF
</h2>
<p className="text-blue-200 text-sm mt-1 tracking-widest uppercase">
  Sukoharjo
</p>

          <div className="mt-3 border-t border-blue-400 pt-3">
            <p className="text-blue-100 text-sm font-medium">
              Sistem Informasi Santri
            </p>
          </div>
        </div>

        {/* Form Login */}
        <div className="px-8 py-8">
          <h3 className="text-gray-700 font-semibold text-lg mb-6 text-center">
            Silakan Login
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Masukkan email"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 text-base bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Masukkan password"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 text-base bg-gray-50"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full text-white py-4 rounded-xl font-semibold transition disabled:opacity-50 text-base shadow-lg active:opacity-90"
              style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2563a8 100%)' }}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            © 2025 Pondok Pesantren Daarus Salaf Sukoharjo
          </p>
        </div>
      </div>
    </div>
  )
}