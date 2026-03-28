import { useEffect, useState } from 'react'
import { supabase, PagoApoderado, EstadoPago } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Modal, ConfirmDialog, EmptyState, EstadoBadge, Spinner } from '@/components/ui'
import { Plus, Pencil, Trash2, CreditCard, Search, Filter, CheckCircle, ChevronDown, ChevronRight, User, GraduationCap, DollarSign, Wand2, AlertTriangle, FileText, Download, ExternalLink, Calendar, Send } from 'lucide-react'
import { format, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { ModalEnviarEmail } from '@/components/ModalEnviarEmail'
import { MensajeTarget } from '@/contexts/MensajeriaContext'

const emptyForm = { apoderado_id:'', estudiante_id:'', concepto:'Mensualidad', monto:'85000', mes_periodo:'', fecha_vencimiento:'', estado:'pendiente' as EstadoPago, metodo_pago:'', notas:'', comprobante_url:'' }
const CONCEPTOS = ['Mensualidad','Matrícula','Material Didáctico','Alimentación','Extracurricular','Otro']
const METODOS = ['Transferencia','Efectivo','Cheque','WebPay','Otro']

export default function PagosPage() {
  const { perfil, selectedEstablecimientoId } = useAuth()
  const [rows, setRows]     = useState<PagoApoderado[]>([])
  const [apoderados, setApoderados] = useState<any[]>([])
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<EstadoPago|''>('')
  const [modal, setModal]   = useState<'add'|'edit'|'quick'|null>(null)
  const [delId, setDelId]   = useState<string|null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [editing, setEditing] = useState<PagoApoderado|null>(null)
  const [form, setForm]     = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [generating, setGenerating] = useState(false)
  const [clearing, setClearing]     = useState(false)
  const [expandedApod, setExpandedApod] = useState<string[]>([])
  const [expandedEst, setExpandedEst]   = useState<string[]>([])
  const [view, setView] = useState<'list' | 'grid'>('grid')
  const [cursos, setCursos] = useState<any[]>([])
  const [quickPay, setQuickPay] = useState<PagoApoderado | null>(null)
  const [quickPayData, setQuickPayData] = useState({ metodo_pago: 'Transferencia', fecha_pago: new Date().toISOString().split('T')[0] })
  const [expandedCursos, setExpandedCursos] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [emailModal, setEmailModal] = useState<{ 
    destinatarios: MensajeTarget[], 
    contexto: string,
    initialAsunto?: string,
    initialMensaje?: string
  } | null>(null)

  const toggleCurso = (id: string) => setExpandedCursos(prev => prev.includes(id) ? prev.filter(i => i!==id) : [...prev, id])

  const MESES_ES = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const isVencido = (p: PagoApoderado | null) => {
    if (!p || p.estado !== 'pendiente') return false
    const today = new Date().toLocaleDateString('sv-SE')
    return p.fecha_vencimiento < today
  }

  const getDeudores = (items: PagoApoderado[]) => {
    const debtorsMap = new Map<string, MensajeTarget>()
    items.filter(isVencido).forEach(p => {
        const apo = (p as any).apoderados
        if (apo && (apo.email || apo.telefono)) {
            debtorsMap.set(apo.id, {
                nombre: `${apo.nombre} ${apo.apellido}`,
                email: apo.email || undefined,
                telefono: apo.telefono || undefined
            })
        }
    })
    return Array.from(debtorsMap.values())
  }

  const toggleApod = (id: string) => setExpandedApod(prev => prev.includes(id) ? prev.filter(i => i!==id) : [...prev, id])
  const toggleEst = (id: string) => setExpandedEst(prev => prev.includes(id) ? prev.filter(i => i!==id) : [...prev, id])

  async function uploadComprobante(f: File) {
    const fileExt = f.name.split('.').pop()
    if (!selectedEstablecimientoId) throw new Error('No hay establecimiento seleccionado')
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    // Organizado por carpeta de comprobantes y luego por establecimiento
    const filePath = `comprobantes/${selectedEstablecimientoId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('mi-bucket')
      .upload(filePath, f, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('mi-bucket')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  async function handleQuickPay() {
    if (!quickPay) return
    setSaving(true)
    setError('')
    
    try {
        let url = null
        if (file) {
            setUploading(true)
            url = await uploadComprobante(file)
            setUploading(false)
        }

        const { error } = await supabase.from('pagos_apoderados').update({ 
            estado:'pagado', 
            fecha_pago: quickPayData.fecha_pago,
            metodo_pago: quickPayData.metodo_pago,
            comprobante_url: url
        }).eq('id', quickPay.id)
        
        if (error) throw error
        
        setQuickPay(null)
        setFile(null)
        setSuccess('Pago registrado correctamente')
        load(true)
    } catch (e: any) {
        setError(e.message)
    } finally {
        setSaving(false)
        setUploading(false)
    }
  }

  async function generarPagosAnuales() {
    if (!selectedEstablecimientoId) return
    if (!confirm('¿Estás seguro de generar las 10 mensualidades (Marzo a Diciembre) para todos los alumnos activos?')) return

    setGenerating(true)
    setError('')
    
    try {
        const { data: est } = await supabase.from('establecimientos').select('valor_mensualidad').eq('id', selectedEstablecimientoId).single()
        const monto = est?.valor_mensualidad || 0
        
        if (!monto || monto <= 0) {
            setError('Debes configurar un Valor de Mensualidad mayor a 0 en la sección de Configuración.')
            setGenerating(false)
            return
        }

        const { data: ests } = await supabase.from('estudiantes').select('id, nombre, apellido').eq('establecimiento_id', selectedEstablecimientoId).eq('estado', 'activo')
        const { data: rels } = await supabase.from('estudiante_apoderado').select('estudiante_id, apoderado_id').eq('es_titular', true)

        if (!ests || ests.length === 0) {
            setError('No hay alumnos activos para generar cobros.')
            setGenerating(false)
            return
        }

        const mapTitular: Record<string, string> = {}
        rels?.forEach(r => mapTitular[r.estudiante_id] = r.apoderado_id)

        const year = new Date().getFullYear()
        const allPayments: any[] = []

        ests.forEach(est => {
            const apoderadoId = mapTitular[est.id]
            if (!apoderadoId) return 

            MESES_ES.forEach((mes, idx) => {
                const monthIndex = idx + 2
                const dueDate = new Date(year, monthIndex, 5)

                allPayments.push({
                    apoderado_id: apoderadoId,
                    estudiante_id: est.id,
                    establecimiento_id: selectedEstablecimientoId,
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
        setSuccess(`Se han generado ${allPayments.length} mensualidades exitosamente.`)
        await load(true)
    } catch (e: any) {
        setError('Error al generar pagos: ' + e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function limpiarPagos() {
    if (!selectedEstablecimientoId) return
    try {
      setClearing(true)
      setError('')
      // Filter by establishment to ensure authorization
      const { error } = await supabase
        .from('pagos_apoderados')
        .delete()
        .eq('establecimiento_id', selectedEstablecimientoId)
      
      if (error) throw error
      
      setSuccess('Se han eliminado todos los pagos correctamente.')
      load(true)
    } catch (e: any) {
      console.error('Error clearing payments:', e)
      setError(`Error al eliminar los pagos: ${e.message}`)
    } finally {
      setClearing(false)
      setConfirmClear(false)
    }
  }

  async function load(silent = false) {
    if (!selectedEstablecimientoId) return
    if (!silent) setLoading(true)
    const [{ data: pagos }, { data: apod }, { data: est }, { data: cur }] = await Promise.all([
      supabase.from('pagos_apoderados').select('*, apoderados(nombre,apellido,rut,email,telefono), estudiantes(nombre,apellido,rut,curso_id)').eq('establecimiento_id', selectedEstablecimientoId).order('fecha_vencimiento'),
      supabase.from('apoderados').select('id,nombre,apellido,rut').eq('establecimiento_id', selectedEstablecimientoId).order('apellido'),
      supabase.from('estudiantes').select('id,nombre,apellido,rut,curso_id').eq('estado','activo').eq('establecimiento_id', selectedEstablecimientoId).order('apellido'),
      supabase.from('cursos').select('id,nombre').eq('establecimiento_id', selectedEstablecimientoId).order('nombre')
    ])
    setRows(pagos??[]); setApoderados(apod??[]); setEstudiantes(est??[]); setCursos(cur??[])
    // Only set default if currently empty to preserve state on silent refresh
    if (cur && cur.length > 0 && expandedCursos.length === 0) setExpandedCursos([cur[0].id])
    else if (expandedCursos.length === 0) setExpandedCursos(['unassigned'])
    if (!silent) setLoading(false)
  }
  useEffect(() => { load() }, [selectedEstablecimientoId])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  function openAdd() { setForm({...emptyForm, comprobante_url:''}); setEditing(null); setError(''); setModal('add'); setFile(null) }
  function openEdit(r: any) {
    setForm({ apoderado_id:r.apoderado_id, estudiante_id:r.estudiante_id, concepto:r.concepto, monto:r.monto.toString(), mes_periodo:r.mes_periodo??'', fecha_vencimiento:r.fecha_vencimiento, estado:r.estado, metodo_pago:r.metodo_pago??'', notas:r.notas??'', comprobante_url:r.comprobante_url??'' })
    setEditing(r); setError(''); setModal('edit'); setFile(null)
  }

  async function marcarPagado(id: string) {
    await supabase.from('pagos_apoderados').update({ estado:'pagado', fecha_pago: new Date().toISOString().split('T')[0] }).eq('id', id)
    setSuccess('Estado actualizado')
    load(true)
  }

  async function save() {
    if (!selectedEstablecimientoId) {
      setError('No hay un establecimiento seleccionado.')
      return
    }

    setSaving(true); setError('')
    
    try {
        let url = form.comprobante_url
        if (file) {
            setUploading(true)
            url = await uploadComprobante(file)
            setUploading(false)
        }

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
            comprobante_url: url,
            establecimiento_id: perfil.establecimiento_id
        }

        const { error: e } = editing
            ? await supabase.from('pagos_apoderados').update(payload).eq('id', editing.id)
            : await supabase.from('pagos_apoderados').insert([payload])

        if (e) throw e
        
        setSaving(false)
        setModal(null)
        setFile(null)
        setSuccess(editing ? 'Pago actualizado' : 'Pago creado')
        load(true)
    } catch (e: any) {
        setError(e.message)
        setSaving(false)
        setUploading(false)
    }
  }

  async function del() {
    if (!delId) return
    await supabase.from('pagos_apoderados').delete().eq('id', delId)
    setSuccess('Registro de pago eliminado')
    setDelId(null); load(true)
  }

  const filtered = rows.filter(r => {
    const q = `${(r as any).apoderados?.nombre} ${(r as any).apoderados?.apellido} ${(r as any).estudiantes?.nombre} ${r.concepto}`.toLowerCase().includes(search.toLowerCase())
    const e = filterEstado ? r.estado === filterEstado : true
    return q && e
  })

  const totals = {
    total: rows.reduce((a,r)=>a+Number(r.monto),0),
    pagado: rows.filter(r=>r.estado==='pagado').reduce((a,r)=>a+Number(r.monto),0),
    pendiente: rows.filter(r=>r.estado==='pendiente' && !isVencido(r)).reduce((a,r)=>a+Number(r.monto),0),
    vencido: rows.filter(r=>r.estado==='vencido' || isVencido(r)).reduce((a,r)=>a+Number(r.monto),0),
  }
  const fmt = (n:number) => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n)

  // Agrupación para Lista
  const groupedList = filtered.reduce((acc, r) => {
    const apId = r.apoderado_id;
    if (!acc[apId]) acc[apId] = { apoderado: (r as any).apoderados, estudiantes: {} };
    const estId = r.estudiante_id;
    if (!acc[apId].estudiantes[estId]) acc[apId].estudiantes[estId] = { estudiante: (r as any).estudiantes, pagos: [] };
    acc[apId].estudiantes[estId].pagos.push(r);
    return acc;
  }, {} as Record<string, any>);

  // Agrupación para Grilla: Curso -> [Estudiantes con sus 10 pagos]
  const gridData = cursos.map(curso => {
    const estsEnCurso = estudiantes.filter(e => e.curso_id === curso.id);
    const dataAlumnos = estsEnCurso.map(est => {
        const pagosEst = rows.filter(p => p.estudiante_id === est.id && p.concepto === 'Mensualidad');
        return {
            ...est,
            pagos: MESES_ES.map(mes => {
                const p = pagosEst.find(p => p.mes_periodo?.startsWith(mes));
                return p || null;
            })
        }
    });
    return { ...curso, alumnos: dataAlumnos };
  }).filter(c => c.alumnos.length > 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Pagos y Cobranza"
        subtitle="Control de mensualidades y cobros a apoderados"
        action={
          <div className="flex gap-2">
            <button 
              className="btn-ghost text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100" 
              onClick={() => setConfirmClear(true)}
              disabled={clearing || generating}
              title="Eliminar todos los pagos"
            >
              <Trash2 className={`w-4 h-4 ${clearing ? 'animate-pulse' : ''}`}/>
            </button>
            <button 
              className="btn-secondary border-brand-200 text-brand-600 hover:bg-brand-50" 
              onClick={generarPagosAnuales}
              disabled={generating || clearing}
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
          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button 
                onClick={() => setView('grid')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${view === 'grid' ? 'bg-white shadow-sm text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Grilla de Cursos
             </button>
             <button 
                onClick={() => setView('list')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
             >
                Lista de Cobros
             </button>
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
              <input className="input pl-9 w-48" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            {view === 'list' && (
                <select className="input w-36" value={filterEstado} onChange={e=>setFilterEstado(e.target.value as any)}>
                    <option value="">Todos los estados</option>
                    {['pendiente', 'pagado', 'vencido', 'anulado'].map(st => <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>)}
                </select>
            )}
            <button 
              className="btn-primary-outline btn-sm animate-pulse shadow-brand-100 flex items-center gap-2"
              onClick={() => {
                  const items = rows
                  const vencidos = items.filter(isVencido)
                  if (vencidos.length === 0) return alert('No hay pagos vencidos actualmente.')
                  
                  const deudores = getDeudores(items)
                  if (deudores.length === 0) return alert('Se encontraron pagos vencidos pero los apoderados no tienen e-mail ni teléfono registrados.')
                  
                  setEmailModal({
                      destinatarios: deudores,
                      contexto: 'Recordatorio Global de Pagos Pendientes',
                      initialAsunto: 'Recordatorio de Mensualidades Pendientes',
                      initialMensaje: 'Estimado apoderado, le informamos que existen pagos pendientes. Por favor ponerse al día o comunicarse con nosotros si tiene alguna dificultad.'
                  })
              }}
            >
              <Send className="w-4 h-4" /> 
              <span>Recordatorio Global ({rows.filter(isVencido).length})</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="w-6 h-6 text-brand-500"/></div>
        ) : view === 'grid' ? (
           <div className="overflow-x-auto p-4">
              <div className="space-y-4">
                 {gridData.map(curso => (
                    <div key={curso.id} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white hover:border-slate-200 transition-all">
                       <div 
                          className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${expandedCursos.includes(curso.id) ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}
                          onClick={() => toggleCurso(curso.id)}
                       >
                          <div className="flex items-center gap-3">
                             <div className="w-2 h-6 bg-brand-500 rounded-full" />
                             <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">{curso.nombre}</h3>
                             <span className="text-[10px] bg-white text-slate-500 px-2 py-0.5 rounded-full font-bold shadow-sm">{curso.alumnos.length} Alumnos</span>
                             <button
                                className="btn-ghost btn-sm flex items-center gap-1 text-brand-600 text-xs ml-2"
                                onClick={e => {
                                    e.stopPropagation()
                                    const items = rows.filter(p => p.estudiante_id && estudiantes.find(est => est.id === p.estudiante_id && est.curso_id === curso.id))
                                    const vencidos = items.filter(isVencido)
                                    if (vencidos.length === 0) return alert('No hay pagos vencidos en este curso.')
                                    
                                    const deudores = getDeudores(items)
                                    if (deudores.length === 0) return alert('Se encontraron pagos vencidos pero los apoderados no tienen e-mail ni teléfono registrados.')
                                    
                                    setEmailModal({
                                        destinatarios: deudores,
                                        contexto: `Recordatorio de Pago - ${curso.nombre}`,
                                        initialAsunto: `Pendiente: ${curso.nombre}`,
                                        initialMensaje: 'Estimado apoderado, le informamos que existen pagos pendientes. Por favor ponerse al día o comunicarse con nosotros si tiene alguna dificultad.'
                                    })
                                }}
                             >
                                <Send className="w-3.5 h-3.5" /> Enviar aviso curso
                             </button>
                          </div>
                          {expandedCursos.includes(curso.id) ? (
                            <ChevronDown className="w-5 h-5 text-slate-300"/>
                          ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Click para expandir</span>
                                <ChevronRight className="w-5 h-5 text-slate-300"/>
                            </div>
                          )}
                       </div>

                       {expandedCursos.includes(curso.id) && (
                        <div className="p-6 animate-fade-in overflow-x-auto">
                          <table className="w-full border-collapse table-fixed">
                              <thead>
                                <tr>
                                    <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-l-xl border-b border-slate-100 w-1/4">Alumno</th>
                                    {MESES_ES.map(m => (
                                      <th key={m} className="text-center py-3 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100 w-10">{m.slice(0,3)}</th>
                                    ))}
                                    <th className="text-right py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-r-xl border-b border-slate-100 w-16">%</th>
                                </tr>
                              </thead>
                              <tbody>
                                {curso.alumnos.map((alum: any) => {
                                    const payCount = alum.pagos.filter((p: any) => p?.estado === 'pagado').length;
                                    return (
                                      <tr key={alum.id} className="group hover:bg-slate-50/50 transition-colors">
                                          <td className="py-4 px-4 border-b border-slate-50 truncate">
                                            <div className="flex flex-col truncate">
                                                <span className="text-sm font-semibold text-slate-700 capitalize truncate">{alum.nombre.toLowerCase()} {alum.apellido.toLowerCase()}</span>
                                                <span className="text-[9px] text-slate-400 font-mono tracking-tighter uppercase">{alum.rut}</span>
                                            </div>
                                          </td>
                                          {alum.pagos.map((p: any, idx: number) => (
                                            <td key={idx} className="py-4 px-1 border-b border-slate-50 text-center">
                                                {!p ? (
                                                  <div className="w-7 h-7 mx-auto rounded-lg bg-slate-100/50 border border-dashed border-slate-200" title="No generado" />
                                                ) : (
                                                  <div className="relative w-fit mx-auto">
                                                    <div 
                                                        onClick={() => p.estado === 'pendiente' ? setQuickPay(p) : openEdit(p)}
                                                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-sm cursor-pointer
                                                          ${p.estado === 'pagado' ? 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600' : 
                                                            isVencido(p) ? 'bg-red-500 text-white shadow-red-200 animate-pulse hover:bg-red-600' : 
                                                            p.estado === 'vencido' ? 'bg-red-500 text-white shadow-red-100 hover:bg-red-600' : 
                                                            'bg-white border border-slate-200 text-slate-300 hover:border-brand-300 hover:text-brand-500'}
                                                        `}
                                                        title={p.estado === 'pagado' ? `Pagado: ${p.fecha_pago} (${p.metodo_pago})` : isVencido(p) ? 'Pago VENCIDO' : `${MESES_ES[idx]}: ${p.estado.toUpperCase()}`}
                                                    >
                                                        {p.estado === 'pagado' ? <CheckCircle className="w-4 h-4"/> : <DollarSign className="w-4 h-4 opacity-40 group-hover:opacity-100"/>}
                                                    </div>
                                                    {p.comprobante_url && (
                                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                                                        <FileText className="w-2 h-2 text-brand-600" />
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                            </td>
                                          ))}
                                          <td className="py-4 px-4 border-b border-slate-50 text-right">
                                            <span className={`text-xs font-bold ${payCount === 10 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                {payCount}/10
                                            </span>
                                          </td>
                                      </tr>
                                    )
                                })}
                              </tbody>
                          </table>
                        </div>
                       )}
                    </div>
                 ))}
              </div>
           </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CreditCard} title="Sin cobros" description="No hay registros de pago." action={<button className="btn-primary btn-sm" onClick={openAdd}><Plus className="w-3.5 h-3.5"/>Crear cobro</button>} />
        ) : (
          <div className="p-4 space-y-4">
            {Object.entries(groupedList).map(([apId, data]: [string, any]) => (
              <div key={apId} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white hover:border-slate-200 transition-all">
                {/* NIVEL 1: APODERADO */}
                <div 
                  className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${expandedApod.includes(apId) ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}
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
                  <div className="p-6 pt-0 space-y-4 animate-fade-in">
                    {Object.entries(data.estudiantes).map(([estId, estData]: [string, any]) => (
                      <div key={estId} className="ml-6 border-l-2 border-slate-100 pl-6 space-y-3">
                        {/* NIVEL 2: ALUMNO */}
                        <div 
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
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
                                  <th className="text-center">Comprobante</th>
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
                                    <td>
                                      {isVencido(p) ? (
                                        <span className="badge-red animate-pulse flex items-center gap-1 w-fit">
                                          <AlertTriangle className="w-3 h-3"/> Vencido
                                        </span>
                                      ) : (
                                        <EstadoBadge estado={p.estado}/>
                                      )}
                                    </td>
                                    <td className="text-center">
                                      {p.comprobante_url ? (
                                        <button 
                                          onClick={() => openEdit(p)}
                                          className="inline-flex items-center justify-center p-1.5 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 transition-colors" 
                                          title="Ver comprobante"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                        </button>
                                      ) : '—'}
                                    </td>
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

      <Modal open={modal!==null} onClose={() => setModal(null)} title={editing?.estado === 'pagado' ? 'Detalle de Pago' : (modal === 'add' ? 'Nuevo Cobro' : 'Editar Cobro')} size="lg">
        <div className="p-6">
          {editing?.estado === 'pagado' ? (
              <div className="space-y-6">
                  {/* Ficha de Pago (Read Only) */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                  <CheckCircle className="w-6 h-6" />
                              </div>
                              <div>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Monto Pagado</p>
                                  <p className="text-2xl font-black text-slate-800 leading-none">{fmt(Number(editing.monto))}</p>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-slate-200/60">
                              <div>
                                 <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                                     <GraduationCap className="w-3 h-3" /> Alumno
                                 </p>
                                 <p className="text-sm font-bold text-slate-700 capitalize">
                                     {editing.estudiantes?.nombre.toLowerCase()} {editing.estudiantes?.apellido.toLowerCase()}
                                 </p>
                              </div>
                              <div>
                                 <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                                     <Calendar className="w-3 h-3" /> Período
                                 </p>
                                 <p className="text-sm font-bold text-slate-700">
                                     {editing.mes_periodo || 'Mensualidad'}
                                 </p>
                              </div>
                              <div>
                                 <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1 text-purple-500">
                                     <CreditCard className="w-3 h-3" /> Método
                                 </p>
                                 <p className="text-sm font-semibold text-slate-600">
                                     {editing.metodo_pago || 'No especificado'}
                                 </p>
                              </div>
                              <div>
                                 <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                                     <Calendar className="w-3 h-3" /> Fecha de Pago
                                 </p>
                                 <p className="text-sm font-semibold text-slate-600">
                                     {editing.fecha_pago ? format(new Date(editing.fecha_pago), 'dd/MM/yyyy') : '—'}
                                 </p>
                              </div>
                          </div>
                          
                          {editing.notas && (
                              <div className="pt-4 border-t border-slate-200/60 font-medium text-xs text-slate-400 italic">
                                  "{editing.notas}"
                              </div>
                          )}
                      </div>

                      {/* Preview en el mismo modal */}
                      <div className="w-full md:w-64 flex flex-col gap-2">
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Comprobante de Pago</p>
                          {editing.comprobante_url ? (
                              <a 
                                href={editing.comprobante_url}
                                target="_blank"
                                rel="noreferrer"
                                className="aspect-[3/4] rounded-xl bg-slate-900 border border-slate-200 overflow-hidden cursor-pointer group relative shadow-inner block"
                              >
                                  {editing.comprobante_url.toLowerCase().endsWith('.pdf') ? (
                                      <iframe src={editing.comprobante_url} className="w-full h-full border-0 pointer-events-none" title="Comprobante PDF" />
                                  ) : (
                                      <img src={editing.comprobante_url} alt="Comprobante" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                  )}
                                  <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/20 flex flex-col items-center justify-center transition-all">
                                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white p-2 scale-0 group-hover:scale-110 transition-transform shadow-lg border border-white/30">
                                          <ExternalLink className="w-5 h-5 shadow-sm" />
                                      </div>
                                      <p className="text-white text-[10px] font-black mt-2 opacity-0 group-hover:opacity-100 uppercase tracking-widest drop-shadow-md">Abrir pantalla completa</p>
                                  </div>
                              </a>
                          ) : (
                              <div className="aspect-[3/4] rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 gap-2">
                                  <FileText className="w-8 h-8" />
                                  <p className="text-[10px] font-bold uppercase">Sin imagen</p>
                              </div>
                          )}
                      </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <button className="btn-ghost text-slate-400 hover:text-brand-600 hover:bg-brand-50 text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2" onClick={() => {
                            const e = editing;
                            setModal(null);
                            setTimeout(() => {
                                setForm({ apoderado_id:e.apoderado_id, estudiante_id:e.estudiante_id, concepto:e.concepto, monto:e.monto.toString(), mes_periodo:e.mes_periodo??'', fecha_vencimiento:e.fecha_vencimiento, estado:e.estado, metodo_pago:e.metodo_pago??'', notas:e.notas??'', comprobante_url:e.comprobante_url??'' })
                                setEditing(e);
                                setModal('edit');
                                setEditing({...e, estado: 'pendiente'});
                            }, 10);
                        }}>
                            <Pencil className="w-3.5 h-3.5" /> 
                            <span>Editar datos</span>
                        </button>
                        {isVencido(editing) && (
                            <button 
                                className="btn-ghost text-red-500 hover:bg-red-50 text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-2"
                                onClick={() => {
                                    const apo = (editing as any).apoderados
                                    if (!apo || (!apo.email && !apo.telefono)) return alert('Apoderado no tiene datos de contacto')
                                    setEmailModal({
                                        destinatarios: [{ nombre: `${apo.nombre} ${apo.apellido}`, email: apo.email || undefined, telefono: apo.telefono || undefined }],
                                        contexto: `Recordatorio de Pago - ${editing.mes_periodo || 'Cuota'}`,
                                        initialAsunto: `Cobro Pendiente: ${editing.mes_periodo || 'Mensualidad'}`,
                                        initialMensaje: `Estimado apoderado, le informamos que tiene un pago pendiente correspondiente a ${editing.mes_periodo || 'la mensualidad'} por un monto de ${fmt(Number(editing.monto))}, el cual venció el ${format(new Date(editing.fecha_vencimiento), 'dd/MM/yyyy')}. Por favor ponerse al día o comunicarse con nosotros si tiene alguna dificultad.`
                                    })
                                }}
                            >
                                <Send className="w-3.5 h-3.5" />
                                <span>Enviar recordatorio</span>
                            </button>
                        )}
                      </div>

                      <div className="flex gap-2">
                          <button className="btn-secondary" onClick={() => setModal(null)}>Cerrar</button>
                          {editing.comprobante_url && (
                              <a href={editing.comprobante_url} download target="_blank" rel="noreferrer" className="btn-primary">
                                  <Download className="w-4 h-4 mr-2" /> Descargar
                              </a>
                          )}
                      </div>
                  </div>
              </div>
          ) : (
              <div className="grid grid-cols-2 gap-4">
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
                <div className="form-group col-span-2">
                  <label className="label">Comprobante de Pago</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input 
                        type="file" 
                        className="hidden" 
                        id="file-upload" 
                        accept="image/*,.pdf"
                        onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                      />
                      <label 
                        htmlFor="file-upload" 
                        className="btn-secondary w-full justify-center cursor-pointer"
                      >
                        {file ? file.name : (form.comprobante_url ? 'Cambiar archivo' : 'Seleccionar archivo')}
                      </label>
                      {(file || form.comprobante_url) && (
                        <button 
                          type="button" 
                          onClick={() => { setFile(null); setForm({...form, comprobante_url:''}) }} 
                          className="absolute -right-2 -top-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center border border-red-200 shadow-sm hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {form.comprobante_url && !file && (
                      <div className="flex items-center gap-2">
                          <div 
                              className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-400"
                          >
                              {form.comprobante_url.toLowerCase().endsWith('.pdf') ? (
                                  <FileText className="w-5 h-5" />
                              ) : (
                                  <img src={form.comprobante_url} alt="Thumbnail" className="w-full h-full object-cover" />
                              )}
                          </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Sube una imagen o PDF del comprobante de transferencia o depósito.</p>
                </div>
                <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                  <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </div>
          )}
        </div>
      </Modal>

      <Modal open={quickPay!==null} onClose={() => setQuickPay(null)} title="Registrar Pago" size="md">
        <div className="p-8 space-y-8">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Monto del cobro</p>
                    <p className="text-2xl font-black text-slate-800 leading-none">{fmt(Number(quickPay?.monto || 0))}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/60">
                <div>
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                       <GraduationCap className="w-3 h-3" /> Alumno
                   </p>
                   <p className="text-xs font-bold text-slate-700 capitalize">
                       {(quickPay as any)?.estudiantes?.nombre.toLowerCase()} {(quickPay as any)?.estudiantes?.apellido.toLowerCase()}
                   </p>
                </div>
                <div>
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                       <Calendar className="w-3 h-3" /> Período
                   </p>
                   <p className="text-xs font-bold text-slate-700">
                       {quickPay?.mes_periodo || 'Mensualidad'}
                   </p>
                </div>
            </div>
          </div>
          
          <div className="space-y-4">
              <div className="form-group">
                <label className="label">Método de Pago</label>
                <select className="input bg-white" value={quickPayData.metodo_pago} onChange={e => setQuickPayData({...quickPayData, metodo_pago: e.target.value})}>
                  {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Fecha de Pago</label>
                <input className="input bg-white" type="date" value={quickPayData.fecha_pago} onChange={e => setQuickPayData({...quickPayData, fecha_pago: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="label">Comprobante (Opcional)</label>
                <div className="relative">
                    <input 
                      type="file" 
                      id="quick-file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                    />
                    <label 
                        htmlFor="quick-file"
                        className="flex items-center gap-2 w-full p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-brand-300 transition-colors text-xs font-medium text-slate-600"
                    >
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="truncate flex-1">{file ? file.name : 'Sube una foto o PDF'}</span>
                    </label>
                </div>
              </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <div>
                {isVencido(quickPay!) && (
                    <button 
                        className="btn-ghost text-red-500 hover:bg-red-50 text-xs px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                        onClick={() => {
                            const apo = (quickPay as any).apoderados
                            if (!apo || (!apo.email && !apo.telefono)) return alert('Apoderado no tiene datos de contacto')
                            setEmailModal({
                                destinatarios: [{ nombre: `${apo.nombre} ${apo.apellido}`, email: apo.email || undefined, telefono: apo.telefono || undefined }],
                                contexto: `Recordatorio de Pago - ${quickPay!.mes_periodo || 'Cuota'}`,
                                initialAsunto: `Cobro Pendiente: ${quickPay!.mes_periodo || 'Mensualidad'}`,
                                initialMensaje: `Estimado apoderado, le informamos que tiene un pago pendiente correspondiente a ${quickPay!.mes_periodo || 'la mensualidad'} por un monto de ${fmt(Number(quickPay!.monto))}, el cual venció el ${format(new Date(quickPay!.fecha_vencimiento), 'dd/MM/yyyy')}. Por favor ponerse al día o comunicarse con nosotros si tiene alguna dificultad.`
                            })
                        }}
                    >
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar recordatorio</span>
                    </button>
                )}
            </div>
            <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setQuickPay(null)}>Cancelar</button>
                <button className="btn-primary" onClick={handleQuickPay} disabled={saving}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {saving ? 'Procesando...' : 'Confirmar Pago'}
                </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog 
        open={!!delId} 
        onClose={() => setDelId(null)} 
        onConfirm={del} 
        title="Eliminar Cobro" 
        message="¿Eliminar este registro de pago?" 
        confirmLabel="Sí, eliminar"
      />
      {/* Confirmar Limpiar Todo */}
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={limpiarPagos}
        title="¿Eliminar todos los pagos?"
        message="Esta acción eliminará todos los registros de mensualidades de todos los alumnos de forma permanente. ¿Estás seguro de que deseas continuar?"
        confirmLabel="Sí, eliminar todo"
        loading={clearing}
      />

      {emailModal && (
        <ModalEnviarEmail
          open={!!emailModal}
          onClose={() => setEmailModal(null)}
          destinatarios={emailModal.destinatarios}
          contexto={emailModal.contexto}
          initialAsunto={emailModal.initialAsunto}
          initialMensaje={emailModal.initialMensaje}
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
