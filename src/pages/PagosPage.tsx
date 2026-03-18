import { useEffect, useState } from 'react'
import { supabase, PagoApoderado, EstadoPago } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Modal, ConfirmDialog, EmptyState, EstadoBadge, Spinner } from '@/components/ui'
import { Plus, Pencil, Trash2, CreditCard, Search, Filter, CheckCircle, ChevronDown, ChevronRight, User, GraduationCap, DollarSign, Wand2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const emptyForm = { apoderado_id:'', estudiante_id:'', concepto:'Mensualidad', monto:'85000', mes_periodo:'', fecha_vencimiento:'', estado:'pendiente' as EstadoPago, metodo_pago:'', notas:'' }
const CONCEPTOS = ['Mensualidad','Matrícula','Material Didáctico','Alimentación','Extracurricular','Otro']
const METODOS = ['Transferencia','Efectivo','Cheque','WebPay','Otro']

export default function PagosPage() {
  const { perfil } = useAuth()
  const [rows, setRows]     = useState<PagoApoderado[]>([])
  const [apoderados, setApoderados] = useState<any[]>([])
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<EstadoPago|''>('')
  const [modal, setModal]   = useState<'add'|'edit'|null>(null)
  const [delId, setDelId]   = useState<string|null>(null)
  const [editing, setEditing] = useState<PagoApoderado|null>(null)
  const [form, setForm]     = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [generating, setGenerating] = useState(false)
  const [expandedApod, setExpandedApod] = useState<string[]>([])
  const [expandedEst, setExpandedEst]   = useState<string[]>([])

  const toggleApod = (id: string) => setExpandedApod(prev => prev.includes(id) ? prev.filter(i => i!==id) : [...prev, id])
  const toggleEst = (id: string) => setExpandedEst(prev => prev.includes(id) ? prev.filter(i => i!==id) : [...prev, id])

  async function generarPagosAnuales() {
    if (!perfil?.establecimiento_id) return
    if (!confirm('¿Estás seguro de generar las 10 mensualidades (Marzo a Diciembre) para todos los alumnos activos?')) return

    setGenerating(true)
    setError('')
    
    try {
        const { data: est } = await supabase.from('establecimientos').select('valor_mensualidad').eq('id', perfil.establecimiento_id).single()
        const monto = est?.valor_mensualidad || 0
        
        if (!monto || monto <= 0) {
            setError('Debes configurar un Valor de Mensualidad mayor a 0 en la sección de Configuración.')
            setGenerating(false)
            return
        }

        const { data: ests } = await supabase.from('estudiantes').select('id, nombre, apellido').eq('establecimiento_id', perfil.establecimiento_id).eq('estado', 'activo')
        const { data: rels } = await supabase.from('estudiante_apoderado').select('estudiante_id, apoderado_id').eq('es_titular', true)

        if (!ests || ests.length === 0) {
            setError('No hay alumnos activos para generar cobros.')
            setGenerating(false)
            return
        }

        const mapTitular: Record<string, string> = {}
        rels?.forEach(r => mapTitular[r.estudiante_id] = r.apoderado_id)

        const meses = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        const year = new Date().getFullYear()
        const allPayments: any[] = []

        ests.forEach(est => {
            const apoderadoId = mapTitular[est.id]
            if (!apoderadoId) return 

            meses.forEach((mes, idx) => {
                const monthIndex = idx + 2
                const dueDate = new Date(year, monthIndex, 5)

                allPayments.push({
                    apoderado_id: apoderadoId,
                    estudiante_id: est.id,
                    establecimiento_id: perfil.establecimiento_id,
                    concepto: 'Mensualidad',
                    monto: monto,
                    mes_periodo: `${mes} ${year}`,
                    fecha_vencimiento: dueDate.toISOString().split('T')[0],
                    estado: 'pendiente'
                })
            })
        })

        if (allPayments.length === 0) {
            setError('No se encontraron apoderados vinculados como TITULARES. Vincula uno en "Gestión de Apoderados" primero.')
            setGenerating(false)
            return
        }

        const { error: insErr } = await supabase.from('pagos_apoderados').insert(allPayments)
        if (insErr) throw insErr

        await load()
    } catch (e: any) {
        setError('Error al generar pagos: ' + e.message)
    } finally {
        setGenerating(false)
    }
  }

  async function load() {
    setLoading(true)
    const [{ data: pagos }, { data: apod }, { data: est }] = await Promise.all([
      supabase.from('pagos_apoderados').select('*, apoderados(nombre,apellido,rut), estudiantes(nombre,apellido,rut)').order('fecha_vencimiento'),
      supabase.from('apoderados').select('id,nombre,apellido,rut').order('apellido'),
      supabase.from('estudiantes').select('id,nombre,apellido,rut').eq('estado','activo').order('apellido'),
    ])
    setRows(pagos??[]); setApoderados(apod??[]); setEstudiantes(est??[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd() { setForm({...emptyForm}); setEditing(null); setError(''); setModal('add') }
  function openEdit(r: any) {
    setForm({ apoderado_id:r.apoderado_id, estudiante_id:r.estudiante_id, concepto:r.concepto, monto:r.monto.toString(), mes_periodo:r.mes_periodo??'', fecha_vencimiento:r.fecha_vencimiento, estado:r.estado, metodo_pago:r.metodo_pago??'', notas:r.notas??'' })
    setEditing(r); setError(''); setModal('edit')
  }

  async function marcarPagado(id: string) {
    await supabase.from('pagos_apoderados').update({ estado:'pagado', fecha_pago: new Date().toISOString().split('T')[0] }).eq('id', id)
    load()
  }

  async function save() {
    if (!perfil?.establecimiento_id) {
      setError('No tienes un establecimiento asignado.')
      return
    }

    setSaving(true); setError('')
    const payload = { 
      apoderado_id:form.apoderado_id, 
      estudiante_id:form.estudiante_id, 
      concepto:form.concepto, 
      monto:parseFloat(form.monto), 
      mes_periodo:form.mes_periodo||null, 
      fecha_vencimiento:form.fecha_vencimiento, 
      estado:form.estado, 
      metodo_pago:form.metodo_pago||null, 
      notas:form.notas||null,
      establecimiento_id: perfil.establecimiento_id
    }

    const { error: e } = editing
      ? await supabase.from('pagos_apoderados').update(payload).eq('id', editing.id)
      : await supabase.from('pagos_apoderados').insert([payload])

    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setModal(null); load()
  }

  async function del() {
    if (!delId) return
    await supabase.from('pagos_apoderados').delete().eq('id', delId)
    setDelId(null); load()
  }

  const filtered = rows.filter(r => {
    const q = `${(r as any).apoderados?.nombre} ${(r as any).apoderados?.apellido} ${(r as any).estudiantes?.nombre} ${r.concepto}`.toLowerCase().includes(search.toLowerCase())
    const e = filterEstado ? r.estado === filterEstado : true
    return q && e
  })

  const totals = {
    total: rows.reduce((a,r)=>a+Number(r.monto),0),
    pagado: rows.filter(r=>r.estado==='pagado').reduce((a,r)=>a+Number(r.monto),0),
    pendiente: rows.filter(r=>r.estado==='pendiente').reduce((a,r)=>a+Number(r.monto),0),
    vencido: rows.filter(r=>r.estado==='vencido').reduce((a,r)=>a+Number(r.monto),0),
  }
  const fmt = (n:number) => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n)

  // Agrupación de datos: Apoderado > Alumno > Pagos
  const grouped = filtered.reduce((acc, r) => {
    const apId = r.apoderado_id;
    if (!acc[apId]) acc[apId] = { apoderado: (r as any).apoderados, estudiantes: {} };
    const estId = r.estudiante_id;
    if (!acc[apId].estudiantes[estId]) acc[apId].estudiantes[estId] = { estudiante: (r as any).estudiantes, pagos: [] };
    acc[apId].estudiantes[estId].pagos.push(r);
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Pagos y Cobranza"
        subtitle="Control de mensualidades y cobros a apoderados"
        action={
          <div className="flex gap-2">
            <button 
              className="btn-secondary border-brand-200 text-brand-600 hover:bg-brand-50" 
              onClick={generarPagosAnuales}
              disabled={generating}
            >
              <Wand2 className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`}/>
              {generating ? 'Generando...' : 'Generar Año Escolar'}
            </button>
            <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4"/>Nuevo cobro</button>
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

      {/* Resumen financiero */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Total Facturado', val:fmt(totals.total),    cls:'text-slate-700' },
          { label:'Cobrado',         val:fmt(totals.pagado),   cls:'text-emerald-600' },
          { label:'Pendiente',       val:fmt(totals.pendiente),cls:'text-amber-600' },
          { label:'Vencido',         val:fmt(totals.vencido),  cls:'text-red-600' },
        ].map(s=>(
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.cls}`}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header flex-wrap gap-2">
          <h3 className="section-title">Listado de Cobros Agrupados</h3>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
              <input className="input pl-9 w-48" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <select className="input w-36" value={filterEstado} onChange={e=>setFilterEstado(e.target.value as any)}>
              <option value="">Todos los estados</option>
              {['pendiente', 'pagado', 'vencido', 'anulado'].map(st => <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="w-6 h-6 text-brand-500"/></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CreditCard} title="Sin cobros" description="No hay registros de pago." action={<button className="btn-primary btn-sm" onClick={openAdd}><Plus className="w-3.5 h-3.5"/>Crear cobro</button>} />
        ) : (
          <div className="p-2 space-y-3">
            {Object.entries(grouped).map(([apId, data]: [string, any]) => (
              <div key={apId} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white hover:border-slate-200 transition-all">
                {/* NIVEL 1: APODERADO */}
                <div 
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${expandedApod.includes(apId) ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}
                  onClick={() => toggleApod(apId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                      <User className="w-5 h-5"/>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{data.apoderado?.nombre} {data.apoderado?.apellido}</h4>
                      <p className="text-xs text-slate-400 font-mono">{data.apoderado?.rut} · {Object.keys(data.estudiantes).length} pupilo(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Deuda Total</p>
                      <p className="font-bold text-amber-600">
                        {fmt(Object.values(data.estudiantes as Record<string,any>).reduce((sum, est) => 
                          sum + est.pagos.filter((p:any) => p.estado !== 'pagado').reduce((s:number,p:any)=>s+Number(p.monto), 0), 0)
                        )}
                      </p>
                    </div>
                    {expandedApod.includes(apId) ? <ChevronDown className="w-5 h-5 text-slate-300"/> : <ChevronRight className="w-5 h-5 text-slate-300"/>}
                  </div>
                </div>

                {expandedApod.includes(apId) && (
                  <div className="p-4 pt-0 space-y-3 animate-fade-in">
                    {Object.entries(data.estudiantes).map(([estId, estData]: [string, any]) => (
                      <div key={estId} className="ml-6 border-l-2 border-slate-100 pl-4 space-y-2">
                        {/* NIVEL 2: ALUMNO */}
                        <div 
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => toggleEst(estId)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                              <GraduationCap className="w-4 h-4"/>
                            </div>
                            <span className="font-semibold text-sm text-slate-700">{estData.estudiante?.nombre} {estData.estudiante?.apellido}</span>
                            <span className="badge-blue text-[10px]">{estData.pagos.length} pagos</span>
                          </div>
                          {expandedEst.includes(estId) ? <ChevronDown className="w-4 h-4 text-slate-300"/> : <ChevronRight className="w-4 h-4 text-slate-300"/>}
                        </div>

                        {/* NIVEL 3: DETALLE DE PAGOS */}
                        {expandedEst.includes(estId) && (
                          <div className="ml-2 overflow-hidden rounded-xl border border-slate-50 shadow-inner bg-slate-50/30 animate-fade-in">
                            <table className="table table-sm bg-transparent">
                              <thead>
                                <tr className="bg-white/50">
                                  <th>Período</th>
                                  <th>Concepto</th>
                                  <th>Monto</th>
                                  <th>Vencimiento</th>
                                  <th>Estado</th>
                                  <th className="text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {estData.pagos.map((p: any) => (
                                  <tr key={p.id} className="hover:bg-white/50 transition-colors">
                                    <td className="font-medium text-xs text-slate-600">{p.mes_periodo}</td>
                                    <td className="text-xs">{p.concepto}</td>
                                    <td className="font-bold text-xs">{fmt(Number(p.monto))}</td>
                                    <td className="text-[11px]">{format(new Date(p.fecha_vencimiento), 'dd/MM/yyyy')}</td>
                                    <td><EstadoBadge estado={p.estado}/></td>
                                    <td>
                                      <div className="flex justify-end gap-1">
                                        {p.estado === 'pendiente' && (
                                          <button className="btn-ghost btn-sm p-1 text-emerald-600 hover:bg-emerald-50" title="Marcar pagado" onClick={()=>marcarPagado(p.id)}><CheckCircle className="w-3 h-3"/></button>
                                        )}
                                        <button className="btn-ghost btn-sm p-1" onClick={()=>openEdit(p)}><Pencil className="w-3 h-3"/></button>
                                        <button className="btn-ghost btn-sm p-1 text-red-500 hover:bg-red-50" onClick={()=>setDelId(p.id)}><Trash2 className="w-3 h-3"/></button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal!==null} onClose={() => setModal(null)} title={modal === 'add' ? 'Nuevo Cobro' : 'Editar Cobro'} size="lg">
        <div className="p-6 grid grid-cols-2 gap-4">
          {error && <div className="col-span-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-xl border border-red-200">{error}</div>}
          <div className="form-group col-span-2">
            <label className="label">Apoderado</label>
            <select className="input" value={form.apoderado_id} onChange={e => setForm({...form, apoderado_id: e.target.value})}>
              <option value="">— Seleccionar apoderado —</option>
              {apoderados.map(a => <option key={a.id} value={a.id}>{a.nombre} {a.apellido} — {a.rut}</option>)}
            </select>
          </div>
          <div className="form-group col-span-2">
            <label className="label">Alumno</label>
            <select className="input" value={form.estudiante_id} onChange={e => setForm({...form, estudiante_id: e.target.value})}>
              <option value="">— Seleccionar alumno —</option>
              {estudiantes.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Concepto</label>
            <select className="input" value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})}>
              {CONCEPTOS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Período (ej: Marzo 2025)</label>
            <input className="input" value={form.mes_periodo} onChange={e => setForm({...form, mes_periodo: e.target.value})} placeholder="Marzo 2025"/>
          </div>
          <div className="form-group">
            <label className="label">Monto ($)</label>
            <input className="input" type="number" value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="label">Fecha de Vencimiento</label>
            <input className="input" type="date" value={form.fecha_vencimiento} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="label">Estado</label>
            <select className="input" value={form.estado} onChange={e => setForm({...form, estado: e.target.value as EstadoPago})}>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Método de Pago</label>
            <select className="input" value={form.metodo_pago} onChange={e => setForm({...form, metodo_pago: e.target.value})}>
              <option value="">— Seleccionar —</option>
              {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group col-span-2">
            <label className="label">Notas</label>
            <input className="input" value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} placeholder="Observaciones opcionales"/>
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={del} title="Eliminar Cobro" message="¿Eliminar este registro de pago?" />
    </div>
  )
}
