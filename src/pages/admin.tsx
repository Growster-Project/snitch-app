import { useState } from 'react'
import Head from 'next/head'

export default function AdminPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'agency' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function createUser() {
    setLoading(true); setMsg('')
    const res = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    setMsg(data.success ? `✅ Created ${form.full_name}` : `❌ ${data.error}`)
    setLoading(false)
  }

  return (
    <>
      <Head><title>Admin — Snitch</title></Head>
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '2rem' }}>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: '1.5rem' }}>Create User</h1>
          <div style={{ display: 'grid', gap: 12 }}>
            {[['Full Name', 'full_name', 'text'], ['Email', 'email', 'email'], ['Password', 'password', 'password']].map(([label, key, type]) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#fff', fontFamily: 'inherit', width: '100%', outline: 'none' }} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#fff', fontFamily: 'inherit', width: '100%', outline: 'none' }}>
                <option value="agency">Agency</option>
                <option value="director">Director</option>
                <option value="brand">Brand</option>
              </select>
            </div>
            {msg && <div style={{ padding: '10px 14px', borderRadius: 10, background: msg.startsWith('✅') ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.15)', color: msg.startsWith('✅') ? '#34d399' : '#f87171', fontSize: 13 }}>{msg}</div>}
            <button onClick={createUser} disabled={loading}
              style={{ padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #ff0080, #cc0066)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
