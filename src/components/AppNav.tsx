import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AppNav({ profile }: { profile: any }) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    const close = () => setShowMenu(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  function toggleTheme() {
    const t = isDark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('snitch-theme', t)
    setIsDark(!isDark)
  }

  function initials(name: string) {
    return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  const isAgencyOrDirector = profile?.role === 'agency' || profile?.role === 'director'

  const navItems = [
    { label: '📋 References', href: '/references' },
    { label: '📊 Dashboard', href: '/dashboard' },
    ...(isAgencyOrDirector ? [{ label: '🎬 Directors', href: '/directors' }] : []),
    ...(isAgencyOrDirector ? [{ label: '✂️ Edit Table', href: '/edittable' }] : []),
    { label: '🎥 Reviews', href: '/reviews' },
  ]

  return (
    <>
      <nav style={{
        background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 40,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => router.push('/references')}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #ff0080, #0050ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🐹</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Snitch<span style={{ color: 'var(--brand)' }}>.</span></span>
          </div>

          {/* Desktop nav */}
          <div className="desktop-only" style={{ display: 'flex', gap: 4 }}>
            {navItems.map(item => (
              <button key={item.href} onClick={() => router.push(item.href)}
                style={{ padding: '6px 14px', borderRadius: 99, border: 'none', background: router.pathname === item.href ? 'var(--brand-light)' : 'transparent', color: router.pathname === item.href ? 'var(--brand)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: router.pathname === item.href ? 600 : 400, fontFamily: 'inherit' }}>
                {item.label}
              </button>
            ))}
          </div>

          {/* Right: avatar + hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {profile && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #ff0080, #0050ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {initials(profile.full_name)}
              </div>
            )}
            <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }}
              style={{ width: 36, height: 36, borderRadius: 999, border: '1px solid var(--border)', background: showMenu ? 'var(--brand)' : 'var(--surface)', color: showMenu ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {showMenu ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      {/* Dropdown */}
      {showMenu && (
        <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 64, right: 16, width: 240, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: 8, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', maxHeight: '80vh', overflowY: 'auto' }}>
            {profile && (
              <>
                <div style={{ padding: '8px 14px 8px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{profile.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, textTransform: 'capitalize' }}>{profile.role}</div>
                </div>
              </>
            )}
            {navItems.map(item => (
              <button key={item.href} onClick={() => { router.push(item.href); setShowMenu(false) }}
                style={{ display: 'block', width: '100%', padding: '11px 14px', textAlign: 'left', background: router.pathname === item.href ? 'var(--brand-light)' : 'transparent', color: router.pathname === item.href ? 'var(--brand)' : 'var(--text-primary)', border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: router.pathname === item.href ? 600 : 400 }}>
                {item.label}
              </button>
            ))}

            <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
              style={{ display: 'block', width: '100%', padding: '11px 14px', textAlign: 'left', background: 'transparent', color: '#dc2626', border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              🚪 Sign out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
