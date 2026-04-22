import { useEffect, useState, useCallback, useMemo } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase, type Profile, type Project, type Reference } from '@/lib/supabase'
import AppNav from '@/components/AppNav'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const CATEGORY_COLORS: Record<string, string> = {
  'Shirts': '#ff0080', 'Trousers': '#0050ff', 'Shorts': '#f59e0b',
  'Jeans': '#059669', 'Sweaters': '#8b5cf6', 'Jackets': '#ec4899',
  'Accessories': '#06b6d4', 'Perfumes': '#f97316', 'Shoes': '#14b8a6',
  'Trends': '#6366f1', 'Script (Multi)': '#84cc16', 'Other': '#9ca3af',
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [references, setReferences] = useState<Reference[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)
    const { data: proj } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(proj || [])
    if (proj && proj.length > 0) {
      const pid = proj[0].id
      setSelectedProject(pid)
      const { data: refs } = await supabase.from('references').select('*').eq('project_id', pid)
      setReferences(refs || [])
    }
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function loadRefs(pid: string) {
    setSelectedProject(pid)
    const { data } = await supabase.from('references').select('*').eq('project_id', pid)
    setReferences(data || [])
  }

  const stats = useMemo(() => {
    const total = references.length
    const approved = references.filter(r => r.approval_status === 'approved').length
    const rejected = references.filter(r => r.approval_status === 'rejected').length
    const pending = references.filter(r => r.approval_status === 'pending').length
    const locked = references.filter(r => r.is_locked).length
    const byCategory = Object.entries(
      references.reduce((acc, r) => {
        const cat = r.category || 'Other'
        acc[cat] = (acc[cat] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

    const byDirector = Object.entries(
      references.reduce((acc, r) => {
        const dir = r.assigned_director || 'Unassigned'
        acc[dir] = (acc[dir] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }))

    // Done = has file_number, Pending = assigned but no file_number
    const directorProgress = ['Sneha','Kriti','Harshit'].map(dir => {
      const assigned = references.filter(r => r.assigned_director === dir)
      const done = assigned.filter(r => r.file_number || r.camera || r.edit_notes?.toLowerCase().includes('done'))
      const pending = assigned.filter(r => !r.file_number && !r.camera && !r.edit_notes?.toLowerCase().includes('done'))
      return { name: dir, assigned: assigned.length, done: done.length, pending: pending.length }
    }).filter(d => d.assigned > 0)

    return { total, approved, rejected, pending, locked, byCategory, byDirector, directorProgress }
  }, [references])

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><p style={{ color: 'var(--text-secondary)' }}>Loading…</p></div>

  const StatCard = ({ emoji, label, value, color }: any) => (
    <div className="card" style={{ textAlign: 'center' as const }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  )

  return (
    <>
      <Head><title>Dashboard — Snitch</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
      <AppNav profile={profile} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '1.25rem 1rem', paddingBottom: '4rem' }}>
        {/* Project selector */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' as const }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, flex: 1 }}>📊 Dashboard</h1>
          <select value={selectedProject} onChange={e => loadRefs(e.target.value)}
            style={{ maxWidth: 280, fontWeight: 600, fontSize: 14, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {references.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' as const, padding: '3rem', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <p>No references in this project yet.</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
              <StatCard emoji="📋" label="Total" value={stats.total} />
              <StatCard emoji="✅" label="Approved" value={stats.approved} color="#059669" />
              <StatCard emoji="❌" label="Rejected" value={stats.rejected} color="#dc2626" />
              <StatCard emoji="⏳" label="Pending" value={stats.pending} color="#f59e0b" />
              <StatCard emoji="🔒" label="Locked" value={stats.locked} color="#8b5cf6" />
              <StatCard emoji="📈" label="Approval %" value={stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) + '%' : '—'} color="#059669" />
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: '1.5rem' }}>
              {/* Pie chart */}
              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>🥧 Category Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={stats.byCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                      {stats.byCategory.map((entry, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#9ca3af'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span style={{ fontSize: 11 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bar chart */}
              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>📊 Category Breakdown</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.byCategory} barSize={20} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} name="References">
                      {stats.byCategory.map((entry, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#9ca3af'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Director progress */}
            {stats.directorProgress.length > 0 && (
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>🎬 Director Progress</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                  {stats.directorProgress.map(d => (
                    <div key={d.name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '1.25rem' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 12 }}>🎬 {d.name}</div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <div style={{ flex: 1, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' as const }}>
                          <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>{d.done}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(16,185,129,0.7)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginTop: 2 }}>Done</div>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' as const }}>
                          <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b' }}>{d.pending}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(245,158,11,0.7)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginTop: 2 }}>Pending</div>
                        </div>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: d.assigned > 0 ? `${(d.done/d.assigned)*100}%` : '0%', background: 'linear-gradient(90deg,#10b981,#059669)', borderRadius: 99, transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>{d.assigned} total assigned · {d.assigned > 0 ? Math.round((d.done/d.assigned)*100) : 0}% complete</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category numbers table */}
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: '1rem' }}>📋 Actual Numbers</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Category', 'Total', 'Approved', 'Rejected', 'Pending', 'Locked', '%'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left' as const, fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byCategory.map(cat => {
                      const catRefs = references.filter(r => (r.category || 'Other') === cat.name)
                      const approved = catRefs.filter(r => r.approval_status === 'approved').length
                      const rejected = catRefs.filter(r => r.approval_status === 'rejected').length
                      const pending = catRefs.filter(r => r.approval_status === 'pending').length
                      const locked = catRefs.filter(r => r.is_locked).length
                      return (
                        <tr key={cat.name} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: (CATEGORY_COLORS[cat.name] || '#9ca3af') + '20', color: CATEGORY_COLORS[cat.name] || '#9ca3af', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{cat.name}</span>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700 }}>{cat.value}</td>
                          <td style={{ padding: '10px 12px', color: '#059669', fontWeight: 600 }}>{approved}</td>
                          <td style={{ padding: '10px 12px', color: '#dc2626', fontWeight: 600 }}>{rejected}</td>
                          <td style={{ padding: '10px 12px', color: '#f59e0b', fontWeight: 600 }}>{pending}</td>
                          <td style={{ padding: '10px 12px', color: '#8b5cf6', fontWeight: 600 }}>{locked}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{Math.round((approved / cat.value) * 100)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  )
}

export const dynamic = 'force-dynamic'
