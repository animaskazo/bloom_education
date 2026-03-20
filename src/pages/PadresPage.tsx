import { useEffect, useState } from 'react'
import { supabase, Apoderado, Estudiante, Curso } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, EmptyState, Spinner, Modal, ConfirmDialog } from '@/components/ui'
import { Plus, Pencil, Trash2, Users, Phone, Mail, Search, ChevronDown, ChevronUp, UserPlus, X, Wand2, AlertTriangle, CheckCircle, GraduationCap, ChevronRight } from 'lucide-react'
import { ModalEnviarEmail } from '@/components/ModalEnviarEmail'
import { EmailTarget } from '@/hooks/useEmailApoderados'

type ApoderadoExt = Apoderado & { estudiantes?: { id: string; nombre: string; apellido: string; cursos?: { id: string; nombre: string; letra?: string } }[] }

const emptyForm = { rut: '', nombre: '', apellido: '', email: '', telefono: '', telefono_2: '', direccion: '', ocupacion: '' }

const NAMES_POOL = ['Juan', 'Pedro', 'Maria', 'Ana', 'Jose', 'Luis', 'Carla', 'Diego', 'Elena', 'Felipe', 'Gloria', 'Hugo', 'Ines', 'Jorge', 'Karen', 'Lucas', 'Marta', 'Nicolas', 'Olga', 'Pablo', 'Quintina', 'Rosa', 'Sergio', 'Teresa', 'Ursula', 'Victor', 'Walter', 'Ximena', 'Yolanda', 'Zacarias']
const LAST_NAMES_POOL = ['Gonzalez', 'Rodriguez', 'Muñoz', 'Rojas', 'Diaz', 'Perez', 'Soto', 'Contreras', 'Silva', 'Martinez', 'Sepulveda', 'Morales', 'Fuentes', 'Valenzuela', 'Araya', 'Castillo', 'Tapia', 'Zuniga', 'Pizarro', 'Guzman']

export default function PadresPage() {
  const [emailModal, setEmailModal] = useState<{ destinatarios: EmailTarget[]; contexto: string } | null>(null)

  const { perfil, selectedEstablecimientoId } = useAuth()
  const [rows, setRows] = useState<ApoderadoExt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [modal, setModal] = useState<'add' | 'edit' | 'vincular' | null>(null)
  const [editing, setEditing] = useState<Apoderado | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [availStudents, setAvailStudents] = useState<Estudiante[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [vincularSearch, setVincularSearch] = useState('')
  const [vincularCursoId, setVincularCursoId] = useState('')
  const [isTitular, setIsTitular] = useState(true)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [delId, setDelId] = useState<string | null>(null)
  const [expandedCursos, setExpandedCursos] = useState<string[]>([])

  const toggleCurso = (id: string) => {
    setExpandedCursos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function generarApoderadosPrueba() {
    if (!selectedEstablecimientoId) return
    if (!confirm('¿Deseas generar automáticamente un apoderado para cada alumno que no tenga uno asignado?')) return

    setSeeding(true)
    setError('')
    setSuccess('')

    try {
      // 1. Obtener alumnos y sus vínculos actuales
      const { data: students } = await supabase.from('estudiantes').select('id, nombre, apellido').eq('establecimiento_id', selectedEstablecimientoId)
      const { data: links } = await supabase.from('estudiante_apoderado').select('estudiante_id')

      const studentsWithParent = new Set(links?.map(l => l.estudiante_id))
      const studentsToProcess = students?.filter(s => !studentsWithParent.has(s.id)) || []

      if (studentsToProcess.length === 0) {
        setSuccess('Todos los alumnos ya tienen apoderados asignados.')
        setSeeding(false)
        return
      }

      for (const s of studentsToProcess) {
        // Crear Apoderado
        const nombre = NAMES_POOL[Math.floor(Math.random() * NAMES_POOL.length)]
        const apellido = `${LAST_NAMES_POOL[Math.floor(Math.random() * LAST_NAMES_POOL.length)]} ${LAST_NAMES_POOL[Math.floor(Math.random() * LAST_NAMES_POOL.length)]}`

        const { data: apod, error: aErr } = await supabase.from('apoderados').insert({
          nombre,
          apellido,
          rut: `${10000000 + Math.floor(Math.random() * 10000000)}-${Math.floor(Math.random() * 9)}`,
          email: `${nombre.toLowerCase()}.${apellido.split(' ')[0].toLowerCase()}@ejemplo.com`,
          telefono: `+56 9 ${Math.floor(10000000 + Math.random() * 90000000)}`,
          establecimiento_id: selectedEstablecimientoId
        }).select().single()

        if (aErr) throw new Error(`Error en apoderado para ${s.nombre}: ${aErr.message}`)

        // Vincular
        const { error: lErr } = await supabase.from('estudiante_apoderado').insert({
          apoderado_id: apod.id,
          estudiante_id: s.id,
          es_titular: true
        })

        if (lErr) throw new Error(`Error vinculando a ${s.nombre}: ${lErr.message}`)
      }

      setSuccess(`Se han generado y vinculado ${studentsToProcess.length} apoderados exitosamente.`)
      load(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSeeding(false)
    }
  }

  async function randomizarNombresExistentes() {
    if (!perfil?.establecimiento_id) return
    if (!confirm('¿Deseas cambiar los nombres de TODOS los apoderados por nombres aleatorios?')) return

    setSeeding(true)
    setError('')
    setSuccess('')

    try {
      const { data: apod } = await supabase.from('apoderados').select('id').eq('establecimiento_id', perfil.establecimiento_id)
      if (!apod) return

      for (const a of apod) {
        const nombre = NAMES_POOL[Math.floor(Math.random() * NAMES_POOL.length)]
        const apellido = `${LAST_NAMES_POOL[Math.floor(Math.random() * LAST_NAMES_POOL.length)]} ${LAST_NAMES_POOL[Math.floor(Math.random() * LAST_NAMES_POOL.length)]}`

        const { error: e } = await supabase.from('apoderados').update({ nombre, apellido }).eq('id', a.id)
        if (e) throw new Error(`Error actualizando: ${e.message}`)
      }
      setSuccess('Todos los nombres han sido randomizados.')
      load(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSeeding(false)
    }
  }

  async function load(silent = false) {
    if (!selectedEstablecimientoId) return
    try {
      if (!silent) setLoading(true)
      const { data: apod } = await supabase.from('apoderados').select('*').eq('establecimiento_id', selectedEstablecimientoId).order('apellido')
      const { data: rel } = await supabase
        .from('estudiante_apoderado')
        .select('apoderado_id, es_titular, estudiantes(id, nombre, apellido, cursos(id, nombre, letra))')

      const map: Record<string, any[]> = {}
      rel?.forEach(r => {
        if (r.apoderado_id) {
          if (!map[r.apoderado_id]) map[r.apoderado_id] = []
          if (r.estudiantes) map[r.apoderado_id].push(r.estudiantes)
        }
      })
      setRows((apod ?? []).map(a => ({ ...a, estudiantes: map[a.id] ?? [] })))

      const { data: ests } = await supabase.from('estudiantes').select('*, cursos(id, nombre, letra)').eq('establecimiento_id', selectedEstablecimientoId)
      setAvailStudents(ests ?? [])

      const { data: crs } = await supabase.from('cursos').select('*').eq('estado', 'activo').eq('establecimiento_id', selectedEstablecimientoId).order('nombre')
      setCursos(crs ?? [])
      // Expand only the first course by default if none are expanded
      if (crs && crs.length > 0 && expandedCursos.length === 0) setExpandedCursos([crs[0].id])
      else if (expandedCursos.length === 0) setExpandedCursos(['unassigned'])
    } catch (e: any) {
      console.error(e)
      setError('Error al cargar datos')
    } finally {
      if (!silent) setLoading(false)
    }
  }
  useEffect(() => { load() }, [selectedEstablecimientoId])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  function openAdd() { setForm({ ...emptyForm }); setEditing(null); setError(''); setModal('add') }
  function openEdit(r: any) {
    setForm({ rut: r.rut, nombre: r.nombre, apellido: r.apellido, email: r.email ?? '', telefono: r.telefono ?? '', telefono_2: r.telefono_2 ?? '', direccion: r.direccion ?? '', ocupacion: r.ocupacion ?? '' })
    setEditing(r); setError(''); setModal('edit')
  }

  async function save() {
    if (!selectedEstablecimientoId) {
      setError('No hay un establecimiento seleccionado.')
      return
    }

    setSaving(true); setError('')
    try {
      const payload = {
        rut: form.rut,
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email || null,
        telefono: form.telefono || null,
        telefono_2: form.telefono_2 || null,
        direccion: form.direccion || null,
        ocupacion: form.ocupacion || null,
        establecimiento_id: selectedEstablecimientoId
      }

      const { error: e } = editing
        ? await supabase.from('apoderados').update(payload).eq('id', editing.id)
        : await supabase.from('apoderados').insert([payload])

      if (e) { setError(e.message); return }
      setModal(null)
      setSuccess(editing ? 'Apoderado actualizado correctamente' : 'Apoderado creado correctamente')
      await load(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function del() {
    if (!delId) return
    await supabase.from('apoderados').delete().eq('id', delId)
    setSuccess('Registro de apoderado eliminado')
    setDelId(null); load(true)
  }

  async function vincular() {
    if (!editing || !selectedStudent) return
    setSaving(true); setError('')

    const { error: e } = await supabase.from('estudiante_apoderado').upsert({
      apoderado_id: editing.id,
      estudiante_id: selectedStudent,
      es_titular: isTitular
    }, { onConflict: 'apoderado_id,estudiante_id' }) // Ajusta según el nombre de tu constraint si es necesario

    if (e) {
      setError(e.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setModal(null)
    setSelectedStudent('')
    setSuccess('Alumno vinculado correctamente')
    load(true)
  }

  async function desvincular(apId: string, estId: string) {
    const { error: e } = await supabase.from('estudiante_apoderado').delete().eq('apoderado_id', apId).eq('estudiante_id', estId)
    if (!e) {
      setSuccess('Vínculo eliminado')
      load(true)
    }
  }

  const filtered = rows.filter(r =>
    `${r.nombre} ${r.apellido} ${r.rut} ${r.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const Info = ({ label, value, mono = false }: any) => (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-slate-700 font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</p>
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Gestión de Apoderados"
        subtitle={`${rows.length} apoderados registrados`}
        action={
          <div className="flex gap-2">
            <button
              className="btn-secondary border-brand-200 text-brand-600 hover:bg-brand-50"
              onClick={generarApoderadosPrueba}
              disabled={seeding}
              title="Crea apoderados para alumnos sin uno"
            >
              <Wand2 className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
              Poblar
            </button>
            <button
              className="btn-secondary border-brand-200 text-brand-600 hover:bg-brand-50"
              onClick={() => setEmailModal({
                destinatarios: rows.filter(r => r.email).map(r => ({ nombre: `${r.nombre} ${r.apellido}`, email: r.email! })),
                contexto: 'todos los apoderados del establecimiento'
              })}
            >
              <Mail className="w-4 h-4" />
              Enviar a todos
            </button>
            <button
              className="btn-secondary border-brand-200 text-brand-600 hover:bg-brand-50"
              onClick={randomizarNombresExistentes}
              disabled={seeding}
              title="Cambia todos los nombres por aleatorios"
            >
              <Users className="w-4 h-4" />
              Randomizar
            </button>
            <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Agregar apoderado</button>
          </div>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl flex items-center gap-3 animate-shake font-medium text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
          <button className="ml-auto hover:underline" onClick={() => setError('')}>Cerrar</button>
        </div>
      )}


      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar apoderado..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="card py-12 flex justify-center"><Spinner className="w-6 h-6 text-brand-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState icon={Users} title="Sin apoderados" description="No se encontraron apoderados que coincidan." action={<button className="btn-primary btn-sm" onClick={openAdd}><Plus className="w-3.5 h-3.5" />Agregar</button>} />
          </div>
        ) : (
          (() => {
            const grouped: Record<string, { id?: string; nombre: string; letra?: string; nivel?: string; apoderados: ApoderadoExt[] }> = {
              unassigned: { nombre: 'Sin Alumnos / Sin Curso', apoderados: [] }
            }
            cursos.forEach(c => { grouped[c.id] = { ...c, apoderados: [] } })

            filtered.forEach(r => {
              if (!r.estudiantes || r.estudiantes.length === 0) {
                grouped.unassigned.apoderados.push(r)
              } else {
                // If parent has multiple kids in different courses, they appear in each
                const seenCursos = new Set<string>()
                r.estudiantes.forEach(est => {
                  const cId = (est.cursos as any)?.id || 'unassigned'
                  if (!seenCursos.has(cId)) {
                    if (grouped[cId]) grouped[cId].apoderados.push(r)
                    else {
                      // Handle inactive/missing course grouping
                      const cName = (est.cursos as any)?.nombre || 'Curso Desconocido'
                      if (!grouped[cId]) grouped[cId] = { nombre: cName, apoderados: [r] }
                      else grouped[cId].apoderados.push(r)
                    }
                    seenCursos.add(cId)
                  }
                })
              }
            })

            const nivelLabel: Record<string, string> = { pre_basica: 'Pre-básica', basica: 'Básica', media: 'Media' }

            return Object.entries(grouped)
              .filter(([_, data]) => data.apoderados.length > 0)
              .map(([id, data]) => (
                <div key={id} className="card overflow-hidden border-slate-100 shadow-sm">
                  <div
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${expandedCursos.includes(id) ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}
                    onClick={() => toggleCurso(id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-brand-500 rounded-full" />
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">{data.nombre}{data.letra ? ` ${data.letra}` : ''}</h4>
                      <span className="text-[10px] bg-white text-slate-500 px-2 py-0.5 rounded-full font-bold shadow-sm">
                        {data.apoderados.length} Apoderados
                      </span>
                      <button
                        className="btn-ghost btn-sm flex items-center gap-1 text-brand-600 text-xs"
                        onClick={e => {
                          e.stopPropagation()
                          setEmailModal({
                            destinatarios: data.apoderados.filter(r => r.email).map(r => ({ nombre: `${r.nombre} ${r.apellido}`, email: r.email! })),
                            contexto: `apoderados de ${data.nombre}${data.letra ? ' ' + data.letra : ''}`
                          })
                        }}
                      >
                        <Mail className="w-3.5 h-3.5" /> Email al curso
                      </button>
                    </div>
                    {expandedCursos.includes(id) ? (
                      <ChevronDown className="w-5 h-5 text-slate-300" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Expandir</span>
                        <ChevronRight className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                  </div>

                  {expandedCursos.includes(id) && (
                    <div className="divide-y divide-slate-100 animate-fade-in border-t border-slate-100">
                      {data.apoderados.map(r => (
                        <div key={r.id} className="group">
                          <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => setExpanded(expanded === r.id + id ? null : r.id + id)}>
                            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-xs flex-shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                              {r.nombre[0]}{r.apellido[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 text-sm">{r.nombre} {r.apellido}</p>
                              <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{r.rut}</p>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="hidden sm:flex flex-wrap gap-1 max-w-[200px] justify-end">
                                {r.estudiantes?.filter(e => (e.cursos?.id || 'unassigned') === id).map((e, idx) => (
                                  <span key={idx} className="text-[10px] bg-white border border-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
                                    {e.nombre}
                                  </span>
                                ))}
                              </div>
                              <div className="flex gap-1">
                                <button className="btn-ghost btn-sm p-1.5" onClick={e => { e.stopPropagation(); openEdit(r) }}><Pencil className="w-3.5 h-3.5" /></button>
                                <button className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" onClick={e => { e.stopPropagation(); setDelId(r.id) }}><Trash2 className="w-3.5 h-3.5" /></button>
                                <button
                                  className="btn-ghost btn-sm p-1.5 text-brand-500 hover:bg-brand-50"
                                  title="Enviar email"
                                  onClick={e => {
                                    e.stopPropagation()
                                    setEmailModal({
                                      destinatarios: r.email ? [{ nombre: `${r.nombre} ${r.apellido}`, email: r.email }] : [],
                                      contexto: `${r.nombre} ${r.apellido}`
                                    })
                                  }}
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {expanded === r.id + id ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                            </div>
                          </div>
                          {expanded === r.id + id && (
                            <div className="bg-slate-50/80 px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm animate-fade-in border-y border-slate-100/50">
                              <Info label="RUT" value={r.rut} mono />
                              <Info label="Teléfono" value={r.telefono} />
                              <Info label="Email" value={r.email} />
                              <div className="col-span-2 md:col-span-3">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Todos sus Pupilos</p>
                                  <button className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1" onClick={() => { setEditing(r); setModal('vincular'); setError('') }}>
                                    <UserPlus className="w-3 h-3" /> Vincular alumno
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {(r.estudiantes ?? []).length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No tiene alumnos asignados.</p>
                                  ) : (
                                    (r.estudiantes ?? []).map((e: any, i: number) => (
                                      <div key={i} className="badge-blue pr-1 flex items-center gap-1.5 shadow-sm border-brand-100">
                                        {e.nombre} {e.apellido} {e.cursos ? `· ${e.cursos.nombre}${e.cursos.letra ? ' ' + e.cursos.letra : ''}` : ''}
                                        <button className="p-0.5 hover:bg-blue-200 rounded-full transition-colors" onClick={() => desvincular(r.id, e.id)}>
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
          })()
        )}
      </div>

      {/* Modal Vincular Pupilo */}
      <Modal open={modal === 'vincular'} onClose={() => setModal(null)} title={`Vincular alumno a ${editing?.nombre}`}>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">Busca y selecciona un alumno para vincularlo.</p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Nombre o RUT..."
                value={vincularSearch}
                onChange={e => setVincularSearch(e.target.value)}
              />
            </div>
            <select className="input w-40" value={vincularCursoId} onChange={e => setVincularCursoId(e.target.value)}>
              <option value="">Todos los cursos</option>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.letra}</option>)}
            </select>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="max-h-60 overflow-y-auto bg-slate-50">
              {availStudents
                .filter(s => {
                  const alreadyLinked = (editing as any)?.estudiantes?.some((e: any) => e.id === s.id)
                  const matchesSearch = `${s.nombre} ${s.apellido} ${s.rut}`.toLowerCase().includes(vincularSearch.toLowerCase())
                  const matchesCurso = vincularCursoId ? s.curso_id === vincularCursoId : true
                  return !alreadyLinked && matchesSearch && matchesCurso
                })
                .map(s => (
                  <label key={s.id} className={`flex items-center justify-between p-3 border-b border-white last:border-0 cursor-pointer transition-colors ${selectedStudent === s.id ? 'bg-brand-50 border-brand-100' : 'hover:bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="student"
                        className="text-brand-600 focus:ring-brand-500"
                        checked={selectedStudent === s.id}
                        onChange={() => setSelectedStudent(s.id)}
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{s.nombre} {s.apellido}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{s.rut} · {(s as any).cursos?.nombre} {(s as any).cursos?.letra}</p>
                      </div>
                    </div>
                  </label>
                ))
              }
              {availStudents.filter(s => {
                const alreadyLinked = (editing as any)?.estudiantes?.some((e: any) => e.id === s.id)
                const matchesSearch = `${s.nombre} ${s.apellido} ${s.rut}`.toLowerCase().includes(vincularSearch.toLowerCase())
                const matchesCurso = vincularCursoId ? s.curso_id === vincularCursoId : true
                return !alreadyLinked && matchesSearch && matchesCurso
              }).length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm">No se encontraron alumnos disponibles</div>
                )}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
            <input type="checkbox" className="rounded text-brand-600 focus:ring-brand-500" checked={isTitular} onChange={e => setIsTitular(e.target.checked)} />
            <span className="text-sm text-slate-700 font-medium text-xs">Es apoderado titular (responsable de pagos)</span>
          </label>

          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-xl border border-red-200">{error}</div>}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={vincular} disabled={saving || !selectedStudent}>
              {saving ? 'Vinculando...' : 'Vincular Alumno'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'Agregar Apoderado' : 'Editar Apoderado'} size="lg">
        <div className="p-6 grid grid-cols-2 gap-4">
          {error && <div className="col-span-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-xl border border-red-200">{error}</div>}
          {[
            ['RUT', 'rut', 'text'], ['Ocupación', 'ocupacion', 'text'],
            ['Nombre', 'nombre', 'text'], ['Apellido', 'apellido', 'text'],
            ['Email', 'email', 'email'], ['Teléfono', 'telefono', 'text']
          ].map(([label, key, type]: any, i: number) => (
            <div key={i} className="form-group">
              <label className="label">{label}</label>
              <input className="input" type={type} value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}
          <div className="form-group col-span-2">
            <label className="label">Dirección</label>
            <input className="input" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={del} title="Eliminar Apoderado" message="¿Estás seguro?" />
      {emailModal && (
        <ModalEnviarEmail
          open={!!emailModal}
          onClose={() => setEmailModal(null)}
          destinatarios={emailModal.destinatarios}
          contexto={emailModal.contexto}
        />
      )}

      {success && (
        <div className="fixed bottom-8 right-8 z-50 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 font-medium text-sm animate-fade-in shadow-2xl max-w-xs border-l-4 border-l-emerald-500">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
            <CheckCircle className="w-4 h-4" />
          </div>
          <p>{success}</p>
          <button className="ml-auto hover:underline text-xs" onClick={() => setSuccess('')}>Cerrar</button>
        </div>
      )}
    </div>
  )
}
