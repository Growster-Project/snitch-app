import { FormEvent, useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/references')
  }

  return (
    <>
      <Head><title>Snitch — Growster</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Montserrat', sans-serif", position: 'relative', overflow: 'hidden', padding: '1rem' }}>
        {/* Orbs */}
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,0,128,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,80,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 400, zIndex: 10 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #ff0080, #0050ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 20px rgba(255,0,128,0.4)' }}>🐹</div>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>Snitch<span style={{ color: '#ff0080' }}>.</span></span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 400, letterSpacing: '0.1em', textTransform: 'uppercase' }}>by Growster</p>
          </div>

          {/* Card */}
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 24, padding: '2rem', backdropFilter: 'blur(20px)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Welcome back 👋</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: '1.75rem' }}>Sign in to your Snitch account</p>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@growster.in" required
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#fff', fontFamily: 'inherit', outline: 'none', width: '100%' }}
                  onFocus={e => e.target.style.borderColor = '#ff0080'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#fff', fontFamily: 'inherit', outline: 'none', width: '100%' }}
                  onFocus={e => e.target.style.borderColor = '#ff0080'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              {error && <div style={{ background: 'rgba(255,0,80,0.1)', border: '1px solid rgba(255,0,80,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ff4d6d' }}>{error}</div>}
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: loading ? 'rgba(255,0,128,0.4)' : 'linear-gradient(135deg, #ff0080, #cc0066)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
                {loading ? 'Signing in…' : 'Sign in →'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: '1.5rem', letterSpacing: '0.05em' }}>
            GROWSTER © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  )
}
