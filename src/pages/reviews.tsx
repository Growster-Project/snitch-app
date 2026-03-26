import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase, type Profile, type Project, type VideoReview } from '@/lib/supabase'
import AppNav from '@/components/AppNav'

export default function ReviewsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [reviews, setReviews] = useState<VideoReview[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [driveLink, setDriveLink] = useState('')

  const emptyForm = { file_name: '', brand_feedback: '', drive_folder_link: '' }
  const [form, setForm] = useState(emptyForm)
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

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
      await loadReviews(pid)
    }
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function loadReviews(pid: string) {
    const { data } = await supabase.from('video_reviews').select('*').eq('project_id', pid).order('created_at', { ascending: false })
    setReviews(data || [])
  }

  async function addReview() {
    if (!form.file_name.trim()) return
    setSaving(true)
    await supabase.from('video_reviews').insert({
      project_id: selectedProject,
      file_name: form.file_name,
      brand_feedback: form.brand_feedback || null,
      drive_folder_link: form.drive_folder_link || driveLink || null,
      created_by: profile?.full_name,
    })
    await loadReviews(selectedProject)
    setForm(emptyForm); setShowAdd(false); setSaving(false)
  }

  async function updateStatus(id: string, status: VideoReview['status']) {
    await supabase.from('video_reviews').update({ status }).eq('id', id)
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  async function updateFeedback(id: string, feedback: string) {
    await supabase.from('video_reviews').update({ brand_feedback: feedback }).eq('id', id)
    setReviews(prev => prev.map(r => r.id === id ? { ...r, brand_feedback: feedback } : r))
  }

  async function deleteReview(id: string) {
    if (!confirm('Delete this review entry?')) return
    await supabase.from('video_reviews').delete().eq('id', id)
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  async function saveDriveLink() {
    if (!selectedProject || !driveLink) return
    const project = projects.find(p => p.id === selectedProject)
    alert(`Drive link saved for ${project?.name}. Add it to each review entry below.`)
  }

  const statusColors: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fef3c7', color: '#92400e' },
    addressing: { bg: '#dbeafe', color: '#1e40af' },
    resolved: { bg: '#dcfce7', color: '#14532d' },
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><p style={{ color: 'var(--text-secondary)' }}>Loading…</p></div>

  const isBrand = profile?.role === 'brand'
  const inputStyle: any = { background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const labelStyle: any = { fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }

  const pending = reviews.filter(r => r.status === 'pending').length
  const addressing = reviews.filter(r => r.status === 'addressing').length
  const resolved = reviews.filter(r => r.status === 'resolved').length

  return (
    <>
      <Head><title>Reviews — Snitch</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
      <AppNav profile={profile} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '1.25rem 1rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' as const }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, flex: 1 }}>🎥 Video Reviews</h1>
          <select value={selectedProject} onChange={e => { setSelectedProject(e.target.value); loadReviews(e.target.value) }}
            style={{ ...inputStyle, maxWidth: 240, fontWeight: 600 }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)}
            style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
            + Add Entry
          </button>
        </div>

        {/* Drive link input */}
        <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const }}>
          <div style={{ fontSize: 20 }}>📁</div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Google Drive Folder Link</label>
            <input value={driveLink} onChange={e => setDriveLink(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." style={inputStyle} />
          </div>
          {driveLink && (
            <a href={driveLink} target="_blank" rel="noreferrer"
              style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#4285f4', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
              📂 Open Drive
            </a>
          )}
        </div>

        {/* Stats */}
        {reviews.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: '1.25rem' }}>
            {[{ label: '⏳ Pending', value: pending, color: '#f59e0b' }, { label: '🔄 Addressing', value: addressing, color: '#3b82f6' }, { label: '✅ Resolved', value: resolved, color: '#059669' }].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center' as const, padding: '1rem' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Reviews table */}
        {reviews.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' as const, padding: '3rem', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎥</div>
            <p>No video reviews yet. Add the first entry!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--tab-bg)' }}>
                  {['File Name', 'Brand Feedback', 'Status', 'Drive', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left' as const, fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviews.map(review => {
                  const sc = statusColors[review.status]
                  return (
                    <tr key={review.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)', minWidth: 160 }}>{review.file_name}</td>
                      <td style={{ padding: '10px 12px', minWidth: 240 }}>
                        {isBrand ? (
                          <textarea defaultValue={review.brand_feedback || ''} placeholder="Add feedback here…"
                            onBlur={e => updateFeedback(review.id, e.target.value)}
                            style={{ ...inputStyle, minHeight: 60, fontSize: 12 }} />
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{review.brand_feedback || '—'}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' as const }}>{review.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {(review.drive_folder_link || driveLink) ? (
                          <a href={review.drive_folder_link || driveLink} target="_blank" rel="noreferrer"
                            style={{ color: '#4285f4', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>📂 Open</a>
                        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {!isBrand && (
                            <>
                              <button onClick={() => updateStatus(review.id, 'addressing')} title="Mark Addressing"
                                style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: review.status === 'addressing' ? '#3b82f6' : 'var(--tab-bg)', color: review.status === 'addressing' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>🔄</button>
                              <button onClick={() => updateStatus(review.id, 'resolved')} title="Mark Resolved"
                                style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: review.status === 'resolved' ? '#059669' : 'var(--tab-bg)', color: review.status === 'resolved' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>✅</button>
                              <button onClick={() => deleteReview(review.id)}
                                style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>🗑</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add Review Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: 500, border: '1px solid var(--border)' }}>
            <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 99, margin: '0 auto 1.25rem' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: '1.25rem' }}>+ Add Review Entry</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={labelStyle}>File Name *</label>
                <input value={form.file_name} onChange={e => f('file_name', e.target.value)} placeholder="e.g. SNITCH_MARCH_001.mp4" autoFocus style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Brand Feedback (optional)</label>
                <textarea value={form.brand_feedback} onChange={e => f('brand_feedback', e.target.value)} placeholder="Brand's feedback on this file…" style={{ ...inputStyle, minHeight: 80 }} />
              </div>
              <div>
                <label style={labelStyle}>Drive Link (optional)</label>
                <input value={form.drive_folder_link} onChange={e => f('drive_folder_link', e.target.value)} placeholder="https://drive.google.com/…" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: '1.25rem' }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '11px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
              <button onClick={addReview} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: 12, border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>{saving ? 'Saving…' : 'Add Entry'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export const dynamic = 'force-dynamic'
