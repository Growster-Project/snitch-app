import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase, type Profile, type Project, type Reference } from '@/lib/supabase'
import AppNav from '@/components/AppNav'

const DIRECTORS = ['Sneha', 'Kriti', 'Harshit']

export default function EditTablePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [references, setReferences] = useState<Reference[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [cellValue, setCellValue] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (prof?.role === 'brand') { router.push('/references'); return }
    setProfile(prof)
    const { data: proj } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(proj || [])
    if (proj && proj.length > 0) {
      const pid = proj[0].id
      setSelectedProject(pid)
      await loadRefs(pid)
    }
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function loadRefs(pid: string) {
    const { data } = await supabase.from('references').select('*').eq('project_id', pid).order('sno')
    setReferences(data || [])
  }

  async function saveCell(id: string, field: string, value: string) {
    setSaving(true)
    await supabase.from('references').update({ [field]: value || null }).eq('id', id)
    await supabase.from('reference_logs').insert({ reference_id: id, user_name: profile?.full_name, user_role: profile?.role, action: 'edited', field_changed: field, old_value: null, new_value: value })
    setReferences(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    setEditingCell(null)
    setSaving(false)
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' }}><p style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p></div>

  const inputStyle: any = { background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#fff', fontFamily: 'inherit', width: '100%', padding: '8px 12px' }

  return (
    <>
      <Head><title>Edit Table — Snitch</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
      <AppNav profile={profile} />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '1.25rem 1rem 4rem' }}>

        {/* Header + project selector */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>🎬 Edit Table</h1>
          <select value={selectedProject} onChange={e => { setSelectedProject(e.target.value); loadRefs(e.target.value) }}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 14px', fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'inherit', outline: 'none', maxWidth: 280 }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{references.length} refs · click any cell to edit</span>
        </div>

        {references.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
            <p>No references in this project</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                  {['#', 'Director', 'Reference Link', 'Log Notes', 'Camera', 'File Number'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.05)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {references.map((ref, idx) => (
                  <tr key={ref.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: ref.file_number ? 'rgba(16,185,129,0.06)' : 'transparent', borderLeft: ref.file_number ? '3px solid #10b981' : '3px solid transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = ref.file_number ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = ref.file_number ? 'rgba(16,185,129,0.06)' : 'transparent'}>

                    {/* # */}
                    <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, fontSize: 11, borderRight: '1px solid rgba(255,255,255,0.05)', width: 40 }}>{idx + 1}</td>

                    {/* Director */}
                    <td style={{ borderRight: '1px solid rgba(255,255,255,0.05)', minWidth: 130 }}>
                      {editingCell?.id === ref.id && editingCell.field === 'assigned_director' ? (
                        <select autoFocus value={cellValue} onChange={e => setCellValue(e.target.value)}
                          onBlur={() => saveCell(ref.id, 'assigned_director', cellValue)}
                          style={{ ...inputStyle, background: '#1a1a2e' }}>
                          <option value="">Unassigned</option>
                          {DIRECTORS.map(d => <option key={d}>{d}</option>)}
                        </select>
                      ) : (
                        <div style={{ padding: '10px 12px', cursor: 'pointer' }}
                          onClick={() => { setEditingCell({ id: ref.id, field: 'assigned_director' }); setCellValue(ref.assigned_director || '') }}>
                          {ref.assigned_director ? (
                            <span style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(0,80,255,0.15)', color: '#60a5fa', fontSize: 12, fontWeight: 700 }}>{ref.assigned_director}</span>
                          ) : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>+ assign</span>}
                        </div>
                      )}
                    </td>

                    {/* Reference Link */}
                    <td style={{ borderRight: '1px solid rgba(255,255,255,0.05)', minWidth: 180 }}>
                      {editingCell?.id === ref.id && editingCell.field === 'reference_link' ? (
                        <input autoFocus value={cellValue} onChange={e => setCellValue(e.target.value)}
                          onBlur={() => saveCell(ref.id, 'reference_link', cellValue)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') saveCell(ref.id, 'reference_link', cellValue) }}
                          style={inputStyle} placeholder="https://..." />
                      ) : (
                        <div style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                          onClick={() => { setEditingCell({ id: ref.id, field: 'reference_link' }); setCellValue(ref.reference_link || '') }}>
                          {ref.reference_link ? (
                            <>
                              <a href={ref.reference_link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                style={{ color: '#ff0080', fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>↗</a>
                              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                                {ref.reference_link.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
                              </span>
                            </>
                          ) : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>+ link</span>}
                        </div>
                      )}
                    </td>

                    {/* Log Notes (edit_notes) */}
                    <td style={{ borderRight: '1px solid rgba(255,255,255,0.05)', minWidth: 220 }}>
                      {editingCell?.id === ref.id && editingCell.field === 'edit_notes' ? (
                        <textarea autoFocus value={cellValue} onChange={e => setCellValue(e.target.value)}
                          onBlur={() => saveCell(ref.id, 'edit_notes', cellValue)}
                          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Log notes..." />
                      ) : (
                        <div style={{ padding: '10px 12px', cursor: 'pointer', color: ref.edit_notes ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.15)', fontSize: 12, lineHeight: 1.5 }}
                          onClick={() => { setEditingCell({ id: ref.id, field: 'edit_notes' }); setCellValue(ref.edit_notes || '') }}>
                          {ref.edit_notes || '+ notes'}
                        </div>
                      )}
                    </td>

                    {/* Camera */}
                    <td style={{ borderRight: '1px solid rgba(255,255,255,0.05)', minWidth: 120 }}>
                      {editingCell?.id === ref.id && editingCell.field === 'camera' ? (
                        <input autoFocus value={cellValue} onChange={e => setCellValue(e.target.value)}
                          onBlur={() => saveCell(ref.id, 'camera', cellValue)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') saveCell(ref.id, 'camera', cellValue) }}
                          style={inputStyle} placeholder="e.g. Sony A7IV" />
                      ) : (
                        <div style={{ padding: '10px 12px', cursor: 'pointer', color: ref.camera ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.15)', fontSize: 12 }}
                          onClick={() => { setEditingCell({ id: ref.id, field: 'camera' }); setCellValue(ref.camera || '') }}>
                          {ref.camera || '+ camera'}
                        </div>
                      )}
                    </td>

                    {/* File Number */}
                    <td style={{ minWidth: 110 }}>
                      {editingCell?.id === ref.id && editingCell.field === 'file_number' ? (
                        <input autoFocus value={cellValue} onChange={e => setCellValue(e.target.value)}
                          onBlur={() => saveCell(ref.id, 'file_number', cellValue)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') saveCell(ref.id, 'file_number', cellValue) }}
                          style={inputStyle} placeholder="e.g. A001" />
                      ) : (
                        <div style={{ padding: '10px 12px', cursor: 'pointer', color: ref.file_number ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.15)', fontSize: 12 }}
                          onClick={() => { setEditingCell({ id: ref.id, field: 'file_number' }); setCellValue(ref.file_number || '') }}>
                          {ref.file_number || '+ file no.'}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}

export const dynamic = 'force-dynamic'
