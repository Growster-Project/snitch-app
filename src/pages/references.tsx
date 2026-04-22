import { useEffect, useState, useCallback, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase, type Profile, type Project, type Reference } from '@/lib/supabase'
import AppNav from '@/components/AppNav'

const CATEGORIES = ['Shirts','T-Shirts','Polos','Trousers','Shorts','Jeans','Sweaters','Jackets','Accessories','Perfumes','Shoes','Trends','Script (Multi)','Other']
const DIRECTORS = ['Sneha','Kriti','Harshit']
const CATEGORY_COLORS: Record<string,string> = {
  'Shirts':'#ff0080','Trousers':'#0050ff','Shorts':'#f59e0b','Jeans':'#059669',
  'Sweaters':'#8b5cf6','Jackets':'#ec4899','Accessories':'#06b6d4','Perfumes':'#f97316',
  'Shoes':'#14b8a6','Trends':'#6366f1','Script (Multi)':'#84cc16','Other':'#9ca3af'
}

function detectCategory(url: string): string {
  if (!url) return 'Other'
  const u = url.toLowerCase()
  if (u.includes('reel') || u.includes('tiktok')) return 'Trends'
  if (u.includes('script') || u.includes('youtube')) return 'Script (Multi)'
  return 'Other'
}

function formatUrl(url: string) {
  try { return new URL(url).hostname.replace('www.','') } catch { return url.slice(0,30) }
}

export default function ReferencesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [references, setReferences] = useState<Reference[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<{id:string,field:string} | null>(null)
  const [cellValue, setCellValue] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  // Quick-add row state
  const [newRow, setNewRow] = useState({ reference_link:'', category:'Other', script_notes:'', edit_notes:'', brand_callouts:'', location:'', camera:'', file_number:'', assigned_director:'' })
  const nr = (k:string, v:string) => setNewRow(p => ({...p, [k]:v}))
  const linkRef = useRef<HTMLInputElement>(null)

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

  async function deleteProject(pid: string) {
    if (!confirm('Delete this project and all its references? This cannot be undone.')) return
    await supabase.from('references').delete().eq('project_id', pid)
    await supabase.from('projects').delete().eq('id', pid)
    const remaining = projects.filter(p => p.id !== pid)
    setProjects(remaining)
    if (remaining.length > 0) {
      setSelectedProject(remaining[0].id)
      loadRefs(remaining[0].id)
    } else {
      setSelectedProject('')
      setReferences([])
    }
  }

  async function addRowReference() {
    if (!selectedProject || !newRow.reference_link.trim()) return
    setSaving(true)
    await supabase.from('references').insert({
      project_id: selectedProject,
      reference_link: newRow.reference_link || null,
      category: newRow.category,
      script_notes: newRow.script_notes || null,
      edit_notes: newRow.edit_notes || null,
      brand_callouts: newRow.brand_callouts || null,
      location: newRow.location || null,
      camera: newRow.camera || null,
      file_number: newRow.file_number || null,
      assigned_director: newRow.assigned_director || null,
      created_by: profile?.full_name,
    })
    await loadRefs(selectedProject)
    setNewRow({ reference_link:'', category:'Other', script_notes:'', edit_notes:'', brand_callouts:'', location:'', camera:'', file_number:'', assigned_director:'' })
    setSaving(false)
    linkRef.current?.focus()
  }

  async function saveCell(id: string, field: string, value: string) {
    await supabase.from('references').update({ [field]: value || null }).eq('id', id)
    setReferences(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    setEditingCell(null)
  }

  async function deleteRef(id: string) {
    setDeleting(id)
    await supabase.from('references').delete().eq('id', id)
    setReferences(prev => prev.filter(r => r.id !== id))
    setDeleting(null)
  }

  async function setApproval(ref: Reference, status: 'approved' | 'rejected') {
    if (ref.is_locked) return
    await supabase.from('references').update({ approval_status: status }).eq('id', ref.id)
    await supabase.from('reference_logs').insert({ reference_id: ref.id, user_name: profile?.full_name, user_role: profile?.role, action: status, field_changed: 'approval_status', old_value: ref.approval_status, new_value: status })
    setReferences(prev => prev.map(r => r.id === ref.id ? { ...r, approval_status: status } : r))
  }

  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0f' }}><p style={{ color:'rgba(255,255,255,0.4)' }}>Loading…</p></div>

  const isBrand = profile?.role === 'brand'
  const isAgency = profile?.role === 'agency' || profile?.role === 'director'

  // Group by category
  const categories = CATEGORIES.filter(c => references.some(r => r.category === c))
  const otherCats = [...new Set(references.map(r => r.category).filter(c => c && !CATEGORIES.includes(c)))] as string[]
  const allCats = [...categories, ...otherCats]

  const filteredRefs = selectedCategory
    ? references.filter(r => r.category === selectedCategory)
    : references

  const inputStyle: any = { background:'transparent', border:'none', outline:'none', fontSize:12, color:'rgba(255,255,255,0.8)', fontFamily:'inherit', width:'100%', padding:'6px 8px' }
  const cellStyle: any = { padding:'0', borderRight:'1px solid rgba(255,255,255,0.05)', cursor:'pointer' }

  return (
    <>
      <Head><title>References — Snitch</title><meta name="viewport" content="width=device-width,initial-scale=1" /></Head>
      <AppNav profile={profile} />

      <main style={{ maxWidth:1600, margin:'0 auto', padding:'1.25rem 1rem 4rem' }}>

        {/* Project selector + actions */}
        <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:20, flexWrap:'wrap' }}>
          <select value={selectedProject} onChange={e => { setSelectedProject(e.target.value); loadRefs(e.target.value); setSelectedCategory(null) }}
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'9px 14px', fontSize:14, fontWeight:700, color:'#fff', fontFamily:'inherit', outline:'none', maxWidth:280 }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => setShowAddProject(true)}
            style={{ padding:'9px 16px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>
            + Project
          </button>
          {selectedProject && (
            <button onClick={() => deleteProject(selectedProject)}
              style={{ padding:'9px 14px', borderRadius:10, border:'1px solid rgba(220,38,38,0.3)', background:'rgba(220,38,38,0.08)', color:'#fca5a5', cursor:'pointer', fontSize:13, fontFamily:'inherit' }}>
              🗑 Delete Project
            </button>
          )}
          <span style={{ fontSize:13, color:'rgba(255,255,255,0.3)', marginLeft:'auto' }}>{references.length} refs</span>
        </div>

        {/* BRAND VIEW — Category cards */}
        {isBrand && (
          <>
            {!selectedCategory ? (
              <div>
                <h2 style={{ fontSize:20, fontWeight:800, marginBottom:16, color:'#fff' }}>
                  {projects.find(p=>p.id===selectedProject)?.name || 'Project'}
                </h2>
                {allCats.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'4rem', color:'rgba(255,255,255,0.3)' }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                    <p>No references added yet</p>
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:14 }}>
                    {allCats.map(cat => {
                      const catRefs = references.filter(r => r.category === cat)
                      const approved = catRefs.filter(r => r.approval_status === 'approved').length
                      const color = CATEGORY_COLORS[cat] || '#9ca3af'
                      return (
                        <div key={cat} onClick={() => setSelectedCategory(cat)}
                          style={{ background:`${color}12`, border:`1px solid ${color}30`, borderRadius:20, padding:'1.5rem', cursor:'pointer', transition:'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 12px 40px ${color}20` }}
                          onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
                          <div style={{ fontSize:32, marginBottom:10 }}>
                            {cat==='Shirts'?'👕':cat==='Trousers'?'👖':cat==='Shorts'?'🩳':cat==='Jeans'?'🩳':cat==='Sweaters'?'🧥':cat==='Jackets'?'🥼':cat==='Accessories'?'💍':cat==='Perfumes'?'🌸':cat==='Shoes'?'👟':cat==='Trends'?'📱':cat==='Script (Multi)'?'📝':'📦'}
                          </div>
                          <div style={{ fontSize:16, fontWeight:800, color:'#fff', marginBottom:4 }}>{cat}</div>
                          <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)' }}>{catRefs.length} refs · {approved} approved</div>
                          <div style={{ marginTop:12, height:3, background:'rgba(255,255,255,0.08)', borderRadius:99, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${catRefs.length>0?(approved/catRefs.length)*100:0}%`, background:color, borderRadius:99, transition:'width 0.5s' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                  <button onClick={() => setSelectedCategory(null)}
                    style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:20, padding:0 }}>←</button>
                  <h2 style={{ fontSize:20, fontWeight:800, color:'#fff' }}>{selectedCategory}</h2>
                  <span style={{ fontSize:13, color:'rgba(255,255,255,0.3)' }}>{filteredRefs.length} references</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                  {filteredRefs.map((ref, idx) => {
                    const color = ref.approval_status==='approved'?'#10b981':ref.approval_status==='rejected'?'#dc2626':'rgba(255,255,255,0.1)'
                    return (
                      <div key={ref.id} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${color}`, borderRadius:16, overflow:'hidden' }}>
                        <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.4)' }}>#{idx+1}</span>
                          <div style={{ display:'flex', gap:6 }}>
                            <button onClick={() => setApproval(ref,'approved')} disabled={ref.is_locked}
                              style={{ padding:'4px 12px', borderRadius:99, border:'none', background:ref.approval_status==='approved'?'#10b981':'rgba(16,185,129,0.1)', color:ref.approval_status==='approved'?'#fff':'#10b981', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                              ✓ Approve
                            </button>
                            <button onClick={() => setApproval(ref,'rejected')} disabled={ref.is_locked}
                              style={{ padding:'4px 12px', borderRadius:99, border:'none', background:ref.approval_status==='rejected'?'#dc2626':'rgba(220,38,38,0.1)', color:ref.approval_status==='rejected'?'#fff':'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                        <div style={{ padding:'14px 16px' }}>
                          {ref.reference_link && (
                            <a href={ref.reference_link} target="_blank" rel="noreferrer"
                              style={{ display:'block', padding:'8px 12px', background:'rgba(255,0,128,0.08)', border:'1px solid rgba(255,0,128,0.2)', borderRadius:10, color:'#ff0080', fontSize:12, fontWeight:700, textDecoration:'none', marginBottom:10 }}>
                              ↗ View Reference
                            </a>
                          )}
                          {ref.script_notes && <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginBottom:6, lineHeight:1.5 }}><span style={{ color:'rgba(255,255,255,0.3)', fontSize:10, textTransform:'uppercase', fontWeight:700 }}>Notes</span><br/>{ref.script_notes}</div>}
                          {ref.brand_callouts && <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.5 }}><span style={{ color:'rgba(255,255,255,0.3)', fontSize:10, textTransform:'uppercase', fontWeight:700 }}>Callouts</span><br/>{ref.brand_callouts}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* AGENCY VIEW — Spreadsheet */}
        {isAgency && (
          <>
            {/* Category filter pills */}
            {allCats.length > 0 && (
              <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                <button onClick={() => setSelectedCategory(null)}
                  style={{ padding:'5px 14px', borderRadius:99, border:`1px solid ${!selectedCategory?'rgba(255,0,128,0.5)':'rgba(255,255,255,0.1)'}`, background:!selectedCategory?'rgba(255,0,128,0.1)':'transparent', color:!selectedCategory?'#ff0080':'rgba(255,255,255,0.5)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  All ({references.length})
                </button>
                {allCats.map(cat => {
                  const count = references.filter(r=>r.category===cat).length
                  const color = CATEGORY_COLORS[cat] || '#9ca3af'
                  const active = selectedCategory === cat
                  return (
                    <button key={cat} onClick={() => setSelectedCategory(active?null:cat)}
                      style={{ padding:'5px 14px', borderRadius:99, border:`1px solid ${active?color+'80':'rgba(255,255,255,0.1)'}`, background:active?`${color}18`:'transparent', color:active?color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      {cat} ({count})
                    </button>
                  )
                })}
              </div>
            )}

            {/* Spreadsheet table */}
            <div style={{ overflowX:'auto', borderRadius:16, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.02)' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)' }}>
                    {['#','Link','Category','Notes','Edit Notes','Callouts','Location','Camera','File No.','Director','Status',''].map(h => (
                      <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap', borderRight:'1px solid rgba(255,255,255,0.05)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRefs.map((ref, idx) => {
                    const color = CATEGORY_COLORS[ref.category||''] || '#9ca3af'
                    return (
                      <tr key={ref.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', background: (ref.file_number||ref.camera||ref.edit_notes?.toLowerCase().includes('done'))?'rgba(16,185,129,0.06)':ref.approval_status==='approved'?'rgba(16,185,129,0.04)':ref.approval_status==='rejected'?'rgba(220,38,38,0.04)':'transparent', borderLeft:(ref.file_number||ref.camera||ref.edit_notes?.toLowerCase().includes('done'))?'3px solid #10b981':'3px solid transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background=(ref.file_number||ref.camera||ref.edit_notes?.toLowerCase().includes('done'))?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background=(ref.file_number||ref.camera||ref.edit_notes?.toLowerCase().includes('done'))?'rgba(16,185,129,0.08)':ref.approval_status==='approved'?'rgba(16,185,129,0.04)':ref.approval_status==='rejected'?'rgba(220,38,38,0.04)':'transparent'}>
                        <td style={{ ...cellStyle, padding:'8px 12px', color:'rgba(255,255,255,0.3)', fontWeight:600, fontSize:11, width:36 }}>{idx+1}</td>

                        {/* Link cell */}
                        <td style={{ ...cellStyle, minWidth:140 }}>
                          {editingCell?.id===ref.id && editingCell.field==='reference_link' ? (
                            <input autoFocus value={cellValue} onChange={e=>setCellValue(e.target.value)}
                              onBlur={() => saveCell(ref.id,'reference_link',cellValue)}
                              onKeyDown={e => { if(e.key==='Enter'||e.key==='Tab') saveCell(ref.id,'reference_link',cellValue) }}
                              style={inputStyle} />
                          ) : (
                            <div style={{ padding:'6px 8px', display:'flex', alignItems:'center', gap:6 }} onClick={() => { setEditingCell({id:ref.id,field:'reference_link'}); setCellValue(ref.reference_link||'') }}>
                              {ref.reference_link ? (
                                <>
                                  <a href={ref.reference_link} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ color:'#ff0080', fontWeight:700, textDecoration:'none', fontSize:11 }}>↗</a>
                                  <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{formatUrl(ref.reference_link)}</span>
                                </>
                              ) : <span style={{ color:'rgba(255,255,255,0.15)' }}>+ link</span>}
                            </div>
                          )}
                        </td>

                        {/* Category cell */}
                        <td style={{ ...cellStyle, minWidth:120 }}>
                          {editingCell?.id===ref.id && editingCell.field==='category' ? (
                            <select autoFocus value={cellValue} onChange={e=>setCellValue(e.target.value)}
                              onBlur={() => saveCell(ref.id,'category',cellValue)}
                              style={{ ...inputStyle, background:'#1a1a2e' }}>
                              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                          ) : (
                            <div style={{ padding:'6px 8px' }} onClick={() => { setEditingCell({id:ref.id,field:'category'}); setCellValue(ref.category||'Other') }}>
                              <span style={{ background:`${color}18`, color, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>{ref.category||'—'}</span>
                            </div>
                          )}
                        </td>

                        {/* Notes, Edit Notes, Callouts, Location, Camera, File No, Director — all inline editable */}
                        {(['script_notes','edit_notes','brand_callouts','location','camera','file_number','assigned_director'] as const).map(field => (
                          <td key={field} style={{ ...cellStyle, minWidth: field==='script_notes'||field==='edit_notes'?160:100 }}>
                            {editingCell?.id===ref.id && editingCell.field===field ? (
                              field === 'assigned_director' ? (
                                <select autoFocus value={cellValue} onChange={e=>setCellValue(e.target.value)}
                                  onBlur={() => saveCell(ref.id,field,cellValue)}
                                  style={{ ...inputStyle, background:'#1a1a2e' }}>
                                  <option value="">Unassigned</option>
                                  {DIRECTORS.map(d => <option key={d}>{d}</option>)}
                                </select>
                              ) : (
                                <input autoFocus value={cellValue} onChange={e=>setCellValue(e.target.value)}
                                  onBlur={() => saveCell(ref.id,field,cellValue)}
                                  onKeyDown={e => { if(e.key==='Enter'||e.key==='Tab') saveCell(ref.id,field,cellValue) }}
                                  style={inputStyle} />
                              )
                            ) : (
                              <div style={{ padding:'6px 8px', color:(ref as any)[field]?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.15)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:160 }}
                                onClick={() => { setEditingCell({id:ref.id,field}); setCellValue((ref as any)[field]||'') }}>
                                {(ref as any)[field] || '+'}
                              </div>
                            )}
                          </td>
                        ))}

                        {/* Status */}
                        <td style={{ ...cellStyle, minWidth:80 }}>
                          <div style={{ padding:'6px 8px' }}>
                            <span style={{ fontSize:11, fontWeight:700, color: ref.approval_status==='approved'?'#10b981':ref.approval_status==='rejected'?'#dc2626':'rgba(255,255,255,0.3)' }}>
                              {ref.approval_status==='approved'?'✓ Approved':ref.approval_status==='rejected'?'✗ Rejected':'Pending'}
                            </span>
                          </div>
                        </td>

                        {/* Delete */}
                        <td style={{ padding:'6px 8px', width:36 }}>
                          <button onClick={() => deleteRef(ref.id)} disabled={deleting===ref.id}
                            style={{ width:26, height:26, borderRadius:6, border:'none', background:'rgba(220,38,38,0.1)', color:'#fca5a5', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {deleting===ref.id ? '…' : '✕'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Quick-add row */}
                  <tr style={{ borderBottom:'none', background:'rgba(255,0,128,0.02)' }}>
                    <td style={{ padding:'8px 12px', color:'rgba(255,255,255,0.2)', fontSize:11 }}>+</td>
                    <td style={{ borderRight:'1px solid rgba(255,255,255,0.05)' }}>
                      <input ref={linkRef} value={newRow.reference_link}
                        onChange={e => { nr('reference_link',e.target.value); if(e.target.value) nr('category', detectCategory(e.target.value)) }}
                        onKeyDown={e => e.key==='Enter' && addRowReference()}
                        placeholder="Paste link and press Enter…"
                        style={{ ...inputStyle, color:'rgba(255,255,255,0.5)' }} />
                    </td>
                    <td style={{ borderRight:'1px solid rgba(255,255,255,0.05)' }}>
                      <select value={newRow.category} onChange={e=>nr('category',e.target.value)}
                        style={{ ...inputStyle, background:'transparent' }}>
                        {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </td>
                    {(['script_notes','edit_notes','brand_callouts','location','camera','file_number'] as const).map(field => (
                      <td key={field} style={{ borderRight:'1px solid rgba(255,255,255,0.05)' }}>
                        <input value={(newRow as any)[field]} onChange={e=>nr(field,e.target.value)}
                          onKeyDown={e => e.key==='Enter' && addRowReference()}
                          placeholder="+" style={{ ...inputStyle, color:'rgba(255,255,255,0.4)' }} />
                      </td>
                    ))}
                    <td style={{ borderRight:'1px solid rgba(255,255,255,0.05)' }}>
                      <select value={newRow.assigned_director} onChange={e=>nr('assigned_director',e.target.value)}
                        style={{ ...inputStyle, background:'transparent', color:'rgba(255,255,255,0.4)' }}>
                        <option value="">Director</option>
                        {DIRECTORS.map(d=><option key={d}>{d}</option>)}
                      </select>
                    </td>
                    <td colSpan={2} style={{ padding:'6px 8px' }}>
                      <button onClick={addRowReference} disabled={saving||!newRow.reference_link}
                        style={{ padding:'5px 12px', borderRadius:8, border:'none', background:'#ff0080', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:newRow.reference_link?1:0.3 }}>
                        {saving?'…':'Add'}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* Add Project Modal */}
      {showAddProject && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
          onClick={e => e.target===e.currentTarget && setShowAddProject(false)}>
          <div style={{ background:'#0f0f1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'1.75rem', width:'100%', maxWidth:400 }}>
            <h2 style={{ fontSize:18, fontWeight:700, marginBottom:'1.25rem', color:'#fff' }}>New Project / Shoot</h2>
            <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="e.g. March 100 Regular" autoFocus
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 14px', fontSize:14, color:'#fff', fontFamily:'inherit', width:'100%', outline:'none' }}
              onKeyDown={e => e.key==='Enter' && addProject()} />
            <div style={{ display:'flex', gap:8, marginTop:'1.25rem' }}>
              <button onClick={() => setShowAddProject(false)} style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>Cancel</button>
              <button onClick={addProject} disabled={saving} style={{ flex:2, padding:'11px', borderRadius:10, border:'none', background:'#ff0080', color:'#fff', cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>{saving?'Creating…':'Create Project'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export const dynamic = 'force-dynamic'
