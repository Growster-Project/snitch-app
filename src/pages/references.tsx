import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase, type Profile, type Project, type Reference } from '@/lib/supabase'
import AppNav from '@/components/AppNav'

const CATEGORIES = ['Shirts','Trousers','Shorts','Jeans','Sweaters','Jackets','Accessories','Perfumes','Shoes','Trends','Script (Multi)','Other']
const DIRECTORS = ['Sneha','Kriti','Harshit']

export default function ReferencesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [references, setReferences] = useState<Reference[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showAddProject, setShowAddProject] = useState(false)
  const [showAddRef, setShowAddRef] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingRef, setEditingRef] = useState<Reference | null>(null)
  const [showLogs, setShowLogs] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])

  const emptyRef = { reference_link: '', category: 'Shirts', script_notes: '', edit_notes: '', brand_callouts: '', shot_on_day: '', location: '', camera: '', file_number: '', assigned_director: '', other_category: '' }
  const [refForm, setRefForm] = useState<any>(emptyRef)
  const rf = (k: string, v: string) => setRefForm((p: any) => ({ ...p, [k]: v }))

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)
    const { data: proj } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(proj || [])
    if (proj && proj.length > 0) {
      const pid = selectedProject || proj[0].id
      setSelectedProject(pid)
      const { data: refs } = await supabase.from('references').select('*').eq('project_id', pid).order('sno')
      setReferences(refs || [])
    }
    setLoading(false)
  }, [router, selectedProject])

  useEffect(() => { load() }, [])

  async function loadRefs(pid: string) {
    const { data } = await supabase.from('references').select('*').eq('project_id', pid).order('sno')
    setReferences(data || [])
  }

  async function addProject() {
    if (!newProjectName.trim()) return
    setSaving(true)
    const { data } = await supabase.from('projects').insert({ name: newProjectName.trim(), brand: 'Snitch', created_by: profile?.full_name }).select().single()
    if (data) { setSelectedProject(data.id); setProjects(p => [data, ...p]); setReferences([]) }
    setNewProjectName(''); setShowAddProject(false); setSaving(false)
  }

  async function addReference() {
    if (!selectedProject) return
    setSaving(true)
    const category = refForm.category === 'Other' ? refForm.other_category : refForm.category
    const { error } = await supabase.from('references').insert({
      project_id: selectedProject,
      reference_link: refForm.reference_link || null,
      category,
      script_notes: refForm.script_notes || null,
      edit_notes: refForm.edit_notes || null,
      brand_callouts: refForm.brand_callouts || null,
      shot_on_day: refForm.shot_on_day || null,
      location: refForm.location || null,
      camera: refForm.camera || null,
      file_number: refForm.file_number || null,
      assigned_director: refForm.assigned_director || null,
      created_by: profile?.full_name,
    })
    if (!error) { await loadRefs(selectedProject); setShowAddRef(false); setRefForm(emptyRef) }
    setSaving(false)
  }

  async function updateReference() {
    if (!editingRef) return
    setSaving(true)
    const category = refForm.category === 'Other' ? refForm.other_category : refForm.category
    const updates = {
      reference_link: refForm.reference_link || null,
      category,
      script_notes: refForm.script_notes || null,
      edit_notes: refForm.edit_notes || null,
      brand_callouts: refForm.brand_callouts || null,
      shot_on_day: refForm.shot_on_day || null,
      location: refForm.location || null,
      camera: refForm.camera || null,
      file_number: refForm.file_number || null,
      assigned_director: refForm.assigned_director || null,
    }
    await supabase.from('references').update(updates).eq('id', editingRef.id)
    await supabase.from('reference_logs').insert({ reference_id: editingRef.id, user_name: profile?.full_name, user_role: profile?.role, action: 'edited', field_changed: 'multiple', old_value: null, new_value: JSON.stringify(updates) })
    await loadRefs(selectedProject)
    setEditingRef(null); setRefForm(emptyRef); setSaving(false)
  }

  async function setApproval(ref: Reference, status: 'approved' | 'rejected') {
    if (ref.is_locked) return
    await supabase.from('references').update({ approval_status: status }).eq('id', ref.id)
    await supabase.from('reference_logs').insert({ reference_id: ref.id, user_name: profile?.full_name, user_role: profile?.role, action: status, field_changed: 'approval_status', old_value: ref.approval_status, new_value: status })
    setReferences(prev => prev.map(r => r.id === ref.id ? { ...r, approval_status: status } : r))
  }

  async function toggleLock(ref: Reference) {
    if (profile?.role === 'brand' || profile?.role === 'agency') {
      const newLocked = !ref.is_locked
      await supabase.from('references').update({ is_locked: newLocked }).eq('id', ref.id)
      await supabase.from('reference_logs').insert({ reference_id: ref.id, user_name: profile?.full_name, user_role: profile?.role, action: newLocked ? 'locked' : 'unlocked', field_changed: 'is_locked', old_value: String(ref.is_locked), new_value: String(newLocked) })
      setReferences(prev => prev.map(r => r.id === ref.id ? { ...r, is_locked: newLocked } : r))
    }
  }

  async function viewLogs(refId: string) {
    const { data } = await supabase.from('reference_logs').select('*').eq('reference_id', refId).order('created_at', { ascending: false })
    setLogs(data || [])
    setShowLogs(refId)
  }

  function openEdit(ref: Reference) {
    const isOtherCategory = !CATEGORIES.slice(0, -1).includes(ref.category || '')
    setRefForm({
      reference_link: ref.reference_link || '',
      category: isOtherCategory ? 'Other' : (ref.category || 'Shirts'),
      other_category: isOtherCategory ? (ref.category || '') : '',
      script_notes: ref.script_notes || '',
      edit_notes: ref.edit_notes || '',
      brand_callouts: ref.brand_callouts || '',
      shot_on_day: ref.shot_on_day || '',
      location: ref.location || '',
      camera: ref.camera || '',
      file_number: ref.file_number || '',
      assigned_director: ref.assigned_director || '',
    })
    setEditingRef(ref)
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><p style={{ color: 'var(--text-secondary)' }}>Loading…</p></div>

  const isAgencyOrDirector = profile?.role === 'agency' || profile?.role === 'director'
  const inputStyle: any = { background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const labelStyle: any = { fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }

  return (
    <>
      <Head><title>References — Snitch</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
      <AppNav profile={profile} />

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '1.25rem 1rem', paddingBottom: '4rem' }}>
        {/* Project selector */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <select value={selectedProject} onChange={e => { setSelectedProject(e.target.value); loadRefs(e.target.value) }}
            style={{ ...inputStyle, maxWidth: 280, fontWeight: 600, fontSize: 14 }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => setShowAddProject(true)}
            style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
            + New Project
          </button>
          <button onClick={() => setShowAddRef(true)}
            style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>
            + Add Reference
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{references.length} reference{references.length !== 1 ? 's' : ''}</span>
        </div>

        {/* References table */}
        {references.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p>No references yet. Add the first one!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--tab-bg)' }}>
                  {['#','Reference','Category','Script / Edit Notes','Brand Callouts','Shot Day','Location','Camera','File No.','Director','Status','Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {references.map((ref, idx) => {
                  const rowBg = ref.is_locked ? 'rgba(5,150,105,0.08)' : ref.approval_status === 'approved' ? 'rgba(5,150,105,0.04)' : ref.approval_status === 'rejected' ? 'rgba(220,38,38,0.04)' : 'transparent'
                  return (
                    <tr key={ref.id} style={{ borderBottom: '1px solid var(--border)', background: rowBg }}>
                      <td style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ padding: '10px 12px', maxWidth: 180 }}>
                        {ref.reference_link ? (
                          <a href={ref.reference_link} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>↗ View</a>
                        ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: 'var(--brand-light)', color: 'var(--brand)', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' as const }}>{ref.category || '—'}</span>
                      </td>
                      <td style={{ padding: '10px 12px', maxWidth: 200 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ref.script_notes || '—'}</div>
                        {ref.edit_notes && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Edit: {ref.edit_notes}</div>}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 140 }}>{ref.brand_callouts || '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' as const }}>{ref.shot_on_day || '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{ref.location || '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{ref.camera || '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{ref.file_number || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {ref.assigned_director ? (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>{ref.assigned_director}</span>
                        ) : <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {ref.is_locked ? (
                            <span style={{ fontSize: 16 }} title="Locked">🔒</span>
                          ) : (
                            <>
                              <span style={{ fontSize: 16, opacity: ref.approval_status === 'approved' ? 1 : 0.3 }}>✅</span>
                              <span style={{ fontSize: 16, opacity: ref.approval_status === 'rejected' ? 1 : 0.3 }}>❌</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setApproval(ref, 'approved')} disabled={ref.is_locked} title="Approve"
                            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: ref.approval_status === 'approved' ? '#059669' : 'var(--tab-bg)', color: ref.approval_status === 'approved' ? '#fff' : 'var(--text-secondary)', cursor: ref.is_locked ? 'not-allowed' : 'pointer', fontSize: 13, opacity: ref.is_locked ? 0.4 : 1 }}>✓</button>
                          <button onClick={() => setApproval(ref, 'rejected')} disabled={ref.is_locked} title="Reject"
                            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: ref.approval_status === 'rejected' ? '#dc2626' : 'var(--tab-bg)', color: ref.approval_status === 'rejected' ? '#fff' : 'var(--text-secondary)', cursor: ref.is_locked ? 'not-allowed' : 'pointer', fontSize: 13, opacity: ref.is_locked ? 0.4 : 1 }}>✗</button>
                          <button onClick={() => toggleLock(ref)} title={ref.is_locked ? 'Unlock' : 'Lock'}
                            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: ref.is_locked ? '#059669' : 'var(--tab-bg)', color: ref.is_locked ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>🔒</button>
                          <button onClick={() => openEdit(ref)} title="Edit"
                            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'var(--tab-bg)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                          <button onClick={() => viewLogs(ref.id)} title="Logs"
                            style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'var(--tab-bg)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>📋</button>
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

      {/* Add Project Modal */}
      {showAddProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => e.target === e.currentTarget && setShowAddProject(false)}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '1.75rem', width: '100%', maxWidth: 400, border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: '1.25rem' }}>New Project / Shoot</h2>
            <label style={labelStyle}>Project Name</label>
            <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="e.g. March 100 Regular" autoFocus style={inputStyle} onKeyDown={e => e.key === 'Enter' && addProject()} />
            <div style={{ display: 'flex', gap: 8, marginTop: '1.25rem' }}>
              <button onClick={() => setShowAddProject(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
              <button onClick={addProject} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>{saving ? 'Creating…' : 'Create Project'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Reference Modal */}
      {(showAddRef || editingRef) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && (setShowAddRef(false), setEditingRef(null))}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 99, margin: '0 auto 1.25rem' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: '1.25rem' }}>{editingRef ? '✏️ Edit Reference' : '+ Add Reference'}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={labelStyle}>Reference Link</label>
                <input value={refForm.reference_link} onChange={e => rf('reference_link', e.target.value)} placeholder="https://..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={refForm.category} onChange={e => rf('category', e.target.value)} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {refForm.category === 'Other' && (
                <div>
                  <label style={labelStyle}>Specify Category</label>
                  <input value={refForm.other_category} onChange={e => rf('other_category', e.target.value)} placeholder="Enter category name" style={inputStyle} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Script / Notes</label>
                  <textarea value={refForm.script_notes} onChange={e => rf('script_notes', e.target.value)} placeholder="Script or shoot notes" style={{ ...inputStyle, minHeight: 80 }} />
                </div>
                <div>
                  <label style={labelStyle}>Edit Notes</label>
                  <textarea value={refForm.edit_notes} onChange={e => rf('edit_notes', e.target.value)} placeholder="Editing instructions" style={{ ...inputStyle, minHeight: 80 }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Brand Call Outs</label>
                <input value={refForm.brand_callouts} onChange={e => rf('brand_callouts', e.target.value)} placeholder="e.g. Show logo at 0:03" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Shot on Day</label>
                  <input value={refForm.shot_on_day} onChange={e => rf('shot_on_day', e.target.value)} placeholder="e.g. Day 1" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Location</label>
                  <input value={refForm.location} onChange={e => rf('location', e.target.value)} placeholder="e.g. Studio A" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Camera</label>
                  <input value={refForm.camera} onChange={e => rf('camera', e.target.value)} placeholder="e.g. Sony A7IV" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>File Number</label>
                  <input value={refForm.file_number} onChange={e => rf('file_number', e.target.value)} placeholder="e.g. A001" style={inputStyle} />
                </div>
              </div>
              {isAgencyOrDirector && (
                <div>
                  <label style={labelStyle}>Assign Director</label>
                  <select value={refForm.assigned_director} onChange={e => rf('assigned_director', e.target.value)} style={inputStyle}>
                    <option value="">Unassigned</option>
                    {DIRECTORS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: '1.25rem' }}>
              <button onClick={() => { setShowAddRef(false); setEditingRef(null); setRefForm(emptyRef) }}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
              <button onClick={editingRef ? updateReference : addReference} disabled={saving}
                style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14 }}>
                {saving ? 'Saving…' : editingRef ? 'Save Changes' : 'Add Reference'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowLogs(null)}>
          <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '1.5rem', width: '100%', maxWidth: 500, maxHeight: '70vh', overflowY: 'auto', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 99, margin: '0 auto 1.25rem' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: '1rem' }}>📋 Activity Log</h2>
            {logs.length === 0 ? <p style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: '2rem' }}>No activity yet</p> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {logs.map(log => (
                  <div key={log.id} style={{ background: 'var(--tab-bg)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{log.user_name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{log.action}</span>
                      {log.field_changed && ` · ${log.field_changed}`}
                      {log.new_value && log.action !== 'edited' && ` → ${log.new_value}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowLogs(null)} style={{ width: '100%', marginTop: '1rem', padding: '11px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}

export const dynamic = 'force-dynamic'
