import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase, type Profile, type Project, type Reference } from '@/lib/supabase'
import AppNav from '@/components/AppNav'

const DIRECTORS = ['Sneha', 'Kriti', 'Harshit']
const CATEGORIES = ['Shirts','Trousers','Shorts','Jeans','Sweaters','Jackets','Accessories','Perfumes','Shoes','Trends','Script (Multi)','Other']

export default function DirectorsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [references, setReferences] = useState<Reference[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedDirector, setSelectedDirector] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingRef, setEditingRef] = useState<Reference | null>(null)
  const [directorNotes, setDirectorNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof || prof.role === 'brand') { router.push('/references'); return }
    setProfile(prof)
    const { data: proj } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(proj || [])
    if (proj && proj.length > 0) {
      const pid = proj[0].id
      setSelectedProject(pid)
      const { data: refs } = await supabase.from('references').select('*').eq('project_id', pid).order('sno')
      setReferences(refs || [])
    }
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function loadRefs(pid: string) {
    setSelectedProject(pid)
    const { data } = await supabase.from('references').select('*').eq('project_id', pid).order('sno')
    setReferences(data || [])
  }

  async function assignDirector(ref: Reference, director: string) {
    const newDir = ref.assigned_director === director ? null : director
    await supabase.from('references').update({ assigned_director: newDir }).eq('id', ref.id)
    await supabase.from('reference_logs').insert({ reference_id: ref.id, user_name: profile?.full_name, user_role: profile?.role, action: newDir ? 'assigned' : 'unassigned', field_changed: 'assigned_director', old_value: ref.assigned_director, new_value: newDir })
    setReferences(prev => prev.map(r => r.id === ref.id ? { ...r, assigned_director: newDir } : r))
  }

  async function saveDirectorNotes() {
    if (!editingRef) return
    setSaving(true)
    await supabase.from('references').update({ director_notes: directorNotes }).eq('id', editingRef.id)
    await supabase.from('reference_logs').insert({ reference_id: editingRef.id, user_name: profile?.full_name, user_role: profile?.role, action: 'director_notes_updated', field_changed: 'director_notes', old_value: editingRef.director_notes, new_value: directorNotes })
    setReferences(prev => prev.map(r => r.id === editingRef.id ? { ...r, director_notes: directorNotes } : r))
    setEditingRef(null); setSaving(false)
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><p style={{ color: 'var(--text-secondary)' }}>Loading…</p></div>

  const directorRefs = selectedDirector ? references.filter(r => r.assigned_director === selectedDirector) : references
  const inputStyle: any = { background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', width: '100%' }

  return (
    <>
      <Head><title>Directors — Snitch</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
      <AppNav profile={profile} />

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '1.25rem 1rem', paddingBottom: '4rem' }}>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' as const }}>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>🎬 Directors</h1>
          <select value={selectedProject} onChange={e => loadRefs(e.target.value)}
            style={{ ...inputStyle, maxWidth: 240, fontWeight: 600 }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Director tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' as const }}>
          <button onClick={() => setSelectedDirector(null)}
            style={{ padding: '8px 18px', borderRadius: 99, border: 'none', background: !selectedDirector ? 'var(--brand)' : 'var(--tab-bg)', color: !selectedDirector ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: !selectedDirector ? 700 : 400, fontFamily: 'inherit' }}>
            All ({references.length})
          </button>
          {DIRECTORS.map(d => {
            const count = references.filter(r => r.assigned_director === d).length
            return (
              <button key={d} onClick={() => setSelectedDirector(d)}
                style={{ padding: '8px 18px', borderRadius: 99, border: 'none', background: selectedDirector === d ? 'var(--brand)' : 'var(--tab-bg)', color: selectedDirector === d ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: selectedDirector === d ? 700 : 400, fontFamily: 'inherit' }}>
                {d} ({count})
              </button>
            )
          })}
          <button onClick={() => setSelectedDirector('Unassigned')}
            style={{ padding: '8px 18px', borderRadius: 99, border: 'none', background: selectedDirector === 'Unassigned' ? '#6b7280' : 'var(--tab-bg)', color: selectedDirector === 'Unassigned' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 400, fontFamily: 'inherit' }}>
            Unassigned ({references.filter(r => !r.assigned_director).length})
          </button>
        </div>

        {/* References table */}
        {directorRefs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' as const, padding: '3rem', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
            <p>No references {selectedDirector ? `assigned to ${selectedDirector}` : 'yet'}.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--tab-bg)' }}>
                  {['#','Reference','Category','Script Notes','Brand Callouts','Location','Camera','File No.','Director','Director Notes','Assign','Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left' as const, fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {directorRefs.map((ref, idx) => (
                  <tr key={ref.id} style={{ borderBottom: '1px solid var(--border)', background: ref.file_number ? 'rgba(16,185,129,0.06)' : 'transparent', borderLeft: ref.file_number ? '3px solid #10b981' : '3px solid transparent' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>{ref.sno}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {ref.reference_link ? <a href={ref.reference_link} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>↗ View</a> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: 'var(--brand-light)', color: 'var(--brand)', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{ref.category || '—'}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 160 }}>{ref.script_notes || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 140 }}>{ref.brand_callouts || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{ref.location || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{ref.camera || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {ref.file_number
                        ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>✓ {ref.file_number}</span>
                        : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {ref.assigned_director ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>{ref.assigned_director}</span> : <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 160 }}>{ref.director_notes || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                        {DIRECTORS.map(d => (
                          <button key={d} onClick={() => assignDirector(ref, d)}
                            style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: ref.assigned_director === d ? '#1d4ed8' : 'var(--tab-bg)', color: ref.assigned_director === d ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: ref.assigned_director === d ? 700 : 400 }}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => { setEditingRef(ref); setDirectorNotes(ref.director_notes || '') }}
                        style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'var(--tab-bg)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>📝</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Director Notes Modal */}
      {editingRef && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setEditingRef(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: 500, border: '1px solid var(--border)' }}>
            <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 99, margin: '0 auto 1.25rem' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>📝 Director Notes</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: '1rem' }}>Ref #{editingRef.sno} · {editingRef.category}</p>
            <textarea value={directorNotes} onChange={e => setDirectorNotes(e.target.value)}
              placeholder="Add your notes, changes, or observations for this reference…"
              style={{ ...inputStyle, minHeight: 120 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
              <button onClick={() => setEditingRef(null)} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
              <button onClick={saveDirectorNotes} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>{saving ? 'Saving…' : 'Save Notes'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export const dynamic = 'force-dynamic'
