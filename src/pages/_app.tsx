import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('snitch-theme')
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
      setIsDark(true)
    }
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {isDark && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,0,128,0.18) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,80,255,0.15) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', top: '35%', right: '15%', width: '30vw', height: '30vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,0,120,0.1) 0%, transparent 70%)' }} />
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Component {...pageProps} />
      </div>
    </>
  )
}
