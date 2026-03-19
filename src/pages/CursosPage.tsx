import { useEffect, useState } from 'react'
import { supabase, Curso, Personal, EstadoGeneral, NivelCurso } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Modal, ConfirmDialog, EmptyState, EstadoBadge, Spinner } from '@/components/ui'
import { Plus, Pencil, Trash2, BookOpen, Wand2, AlertTriangle, CheckCircle } from 'lucide-react'

const nivelLabel: Record<string,string> = { pre_basica:'Pre-básica', basica:'Básica', media:'Media' }
const nivelColors: Record<string,string> = { pre_basica:'badge-purple', basica:'badge-blue', media:'badge-green' }
const emptyForm = { nombre:'', nivel:'basica' as NivelCurso, año: new Date().getFullYear().toString(), letra:'', profesor_jefe_id:'', capacidad_max:'45', sala:'', estado:'activo' as EstadoGeneral }

type CursoConCount = Curso & { count?: number }

export default function CursosPage() {
  const { perfil } = useAuth()
  const [rows, setRows]       = useState<CursoConCount[]>([])
  const [personal, setPersonal] = useState<Personal[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState<'add'|'edit'|null>(null)
  const [delId, setDelId]     = useState<string|null>(null)
  const [editing, setEditing] = useState<Curso|null>(null)
  const [form, setForm]       = useState({ ...emptyForm })
  const [saving, setSaving]   = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  async function generarNivelesJardin() {
    if (!perfil?.establecimiento_id) return
    if (!confirm('¿Deseas generar automáticamente los 6 niveles de Jardín Infantil con 10 alumnos de prueba en cada uno?')) return

    setSeeding(true)
    setError('')
    setSuccess('')

    const niveles = [
      { nombre: 'Sala Cuna Menor', edad: 1 },
      { nombre: 'Sala Cuna Mayor', edad: 2 },
      { nombre: 'Nivel Medio Menor', edad: 3 },
      { nombre: 'Nivel Medio Mayor', edad: 4 },
      { nombre: 'Pre-Kinder (NT1)', edad: 5 },
      { nombre: 'Kinder (NT2)', edad: 6 },
    ]

    try {
      for (const n of niveles) {
        // 1. Crear Curso
        const { data: curso, error: cErr } = await supabase.from('cursos').insert({
          nombre: n.nombre,
          nivel: 'pre_basica',
          año: new Date().getFullYear(),
          capacidad_max: 20,
          estado: 'activo',
          establecimiento_id: perfil.establecimiento_id
        }).select().single()

        if (cErr) throw new Error(`Error en curso ${n.nombre}: ${cErr.message}`)

        // 2. Crear 10 Estudiantes
        const names = ['Sofia', 'Mateo', 'Isabella', 'Liam', 'Valentina', 'Benjamin', 'Camila', 'Lucas', 'Mia', 'Thiago']
        const lastNames = ['Gonzales', 'Rodriguez', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez']

        const students = names.map((name, i) => {
          const birth = new Date()
          birth.setFullYear(new Date().getFullYear() - n.edad)
          birth.setMonth(Math.floor(Math.random() * 12))
          birth.setDate(Math.floor(Math.random() * 28) + 1)

          return {
            rut: `${15000000 + Math.floor(Math.random() * 10000000)}-${Math.floor(Math.random() * 9)}`,
            nombre: name,
            apellido: lastNames[i] || 'Apellido',
            fecha_nacimiento: birth.toISOString().split('T')[0],
            genero: i % 2 === 0 ? 'M' : 'F',
            direccion: `Avenida Jardín #${i + 100}`,
            nacionalidad: 'Chilena',
            curso_id: curso.id,
            estado: 'activo',
            establecimiento_id: perfil.establecimiento_id
          }
        })

        const { error: sErr } = await supabase.from('estudiantes').insert(students)
        if (sErr) throw new Error(`Error en alumnos de ${n.nombre}: ${sErr.message}`)
      }
      setSuccess('Niveles y alumnos generados exitosamente.')
      load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSeeding(false)
    }
  }

  async function load() {
    setLoading(true)
    const [{ data: cursos }, { data: prof }, { data: est }] = await Promise.all([
      supabase.from('cursos').select('*, personal(nombre, apellido)').order('nivel').order('nombre'),
      supabase.from('personal').select('*').eq('estado','activo').order('apellido'),
      supabase.from('estudiantes').select('id, curso_id').eq('estado','activo'),
    ])
    const counts: Record<string,number> = {}
    est?.forEach((e: any) => { if (e.curso_id) counts[e.curso_id] = (counts[e.curso_id]??0)+1 })
    setRows((cursos??[]).map((c: any) => ({ ...c, count: counts[c.id]??0 })))
    setPersonal(prof??[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd() { setForm({...emptyForm}); setEditing(null); setError(''); setModal('add') }
  function openEdit(r: any) {
    setForm({ nombre:r.nombre, nivel:r.nivel, año:r.año.toString(), letra:r.letra??'', profesor_jefe_id:r.profesor_jefe_id??'', capacidad_max:r.capacidad_max.toString(), sala:r.sala??'', estado:r.estado })
    setEditing(r); setError(''); setModal('edit')
  }

  async function save() {
    if (!perfil?.establecimiento_id) {
      setError('No tienes un establecimiento asignado en tu perfil.')
      return
    }

    setSaving(true); setError('')
    const payload = { 
      nombre: form.nombre, 
      nivel: form.nivel, 
      año: parseInt(form.año), 
      letra: form.letra || null, 
      profesor_jefe_id: form.profesor_jefe_id || null, 
      capacidad_max: parseInt(form.capacidad_max) || 45, 
      sala: form.sala || null, 
      estado: form.estado,
      establecimiento_id: perfil.establecimiento_id
    }

    const { error: e } = editing
      ? await supabase.from('cursos').update(payload).eq('id', editing.id)
      : await supabase.from('cursos').insert([payload])

    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setModal(null); load()
  }

  async function del() {
    if (!delId) return
    setError('')
    
    // Check if there are students
    const { data: ests } = await supabase.from('estudiantes').select('id').eq('curso_id', delId).limit(1)
    if (ests && ests.length > 0) {
      setError('No se puede eliminar un curso que tiene alumnos asignados. Mueve o elimina a los alumnos primero.')
      setDelId(null)
      return
    }

    const { error: e } = await supabase.from('cursos').delete().eq('id', delId)
    if (e) setError('Error al eliminar: ' + e.message)
    else {
      setSuccess('Curso eliminado correctamente.')
      setTimeout(() => setSuccess(''), 3000)
      load()
    }
    setDelId(null)
  }

  const byNivel = (n: string) => rows.filter(r=>r.nivel===n)

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Gestión de Cursos"
        subtitle={`${rows.filter(r=>r.estado==='activo').length} cursos activos — Año ${new Date().getFullYear()}`}
        action={
          <div className="flex gap-2">
            <button 
              className="btn-secondary border-brand-200 text-brand-600 hover:bg-brand-50" 
              onClick={generarNivelesJardin}
              disabled={seeding}
            >
              <Wand2 className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`}/>
              {seeding ? 'Generando Jardín...' : 'Poblar Jardín'}
            </button>
            <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4"/>Agregar curso</button>
          </div>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-2xl flex items-center gap-3 animate-shake font-medium text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0"/>
          <p>{error}</p>
          <button className="ml-auto hover:underline" onClick={()=>setError('')}>Cerrar</button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 font-medium text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0"/>
          <p>{success}</p>
          <button className="ml-auto hover:underline" onClick={()=>setSuccess('')}>Cerrar</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(['pre_basica','basica','media'] as NivelCurso[]).map(n=>(
          <div key={n} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`${nivelColors[n]} text-xs`}>{nivelLabel[n]}</span>
              <BookOpen className="w-4 h-4 text-slate-300" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{byNivel(n).length} <span className="text-sm font-normal text-slate-400">cursos</span></p>
            <p className="text-xs text-slate-400 mt-0.5">{byNivel(n).reduce((a: any,c: any)=>a+(c.count??0),0)} alumnos</p>
          </div>
        ))}
      </div>

      {/* Cards grid por nivel */}
      {(['pre_basica','basica','media'] as NivelCurso[]).map(nivel => (
        <div key={nivel}>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{nivelLabel[nivel]}</h3>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner className="w-5 h-5 text-brand-500" /></div>
          ) : byNivel(nivel).length === 0 ? (
            <div className="card p-6 text-center text-sm text-slate-400">Sin cursos en este nivel</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {byNivel(nivel).map((r: any)=>(
                <div key={r.id} className="card p-4 hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">{r.nombre}{r.letra?' '+r.letra:''}</p>
                      <p className="text-xs text-slate-400">Sala: {r.sala??'—'}</p>
                    </div>
                    <EstadoBadge estado={r.estado} />
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Alumnos</span>
                      <span className="font-medium text-slate-700">{r.count??0} / {r.capacidad_max}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-brand-500 h-1.5 rounded-full transition-all" style={{width:`${Math.min(100,((r.count??0)/r.capacidad_max)*100)}%`}} />
                    </div>
                    <div className="flex justify-between pt-1">
                      <span>Prof. Jefe</span>
                      <span className="font-medium text-slate-700 text-right">
                        {r.personal ? `${r.personal.nombre} ${r.personal.apellido}` : 'Sin asignar'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100">
                    <button className="btn-secondary btn-sm flex-1 justify-center" onClick={()=>openEdit(r)}><Pencil className="w-3 h-3"/>Editar</button>
                    <button className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" onClick={()=>setDelId(r.id)}><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <Modal open={modal!==null} onClose={()=>setModal(null)} title={modal==='add'?'Agregar Curso':'Editar Curso'}>
        <div className="p-6 grid grid-cols-2 gap-4">
          {error && <div className="col-span-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-xl border border-red-200">{error}</div>}
          <div className="form-group">
            <label className="label">Nombre del Curso</label>
            <input className="input" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="1° Básico" />
          </div>
          <div className="form-group">
            <label className="label">Nivel</label>
            <select className="input" value={form.nivel} onChange={e=>setForm({...form,nivel:e.target.value as NivelCurso})}>
              <option value="pre_basica">Pre-básica</option>
              <option value="basica">Básica</option>
              <option value="media">Media</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Letra</label>
            <input className="input" value={form.letra} onChange={e=>setForm({...form,letra:e.target.value.toUpperCase().slice(0,1)})} placeholder="A" maxLength={1} />
          </div>
          <div className="form-group">
            <label className="label">Año</label>
            <input className="input" type="number" value={form.año} onChange={e=>setForm({...form,año:e.target.value})} />
          </div>
          <div className="form-group">
            <label className="label">Sala</label>
            <input className="input" value={form.sala} onChange={e=>setForm({...form,sala:e.target.value})} placeholder="Sala 1" />
          </div>
          <div className="form-group">
            <label className="label">Capacidad Máx.</label>
            <input className="input" type="number" value={form.capacidad_max} onChange={e=>setForm({...form,capacidad_max:e.target.value})} />
          </div>
          <div className="form-group col-span-2">
            <label className="label">Profesor Jefe</label>
            <select className="input" value={form.profesor_jefe_id} onChange={e=>setForm({...form,profesor_jefe_id:e.target.value})}>
              <option value="">— Sin asignar —</option>
              {personal.map(p=><option key={p.id} value={p.id}>{p.nombre} {p.apellido} — {p.cargo}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Estado</label>
            <select className="input" value={form.estado} onChange={e=>setForm({...form,estado:e.target.value as EstadoGeneral})}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button className="btn-secondary" onClick={()=>setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving?'Guardando...':'Guardar'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={()=>setDelId(null)} onConfirm={del} title="Eliminar Curso" message="¿Eliminar este curso? Los estudiantes asignados quedarán sin curso." />
    </div>
  )
}
