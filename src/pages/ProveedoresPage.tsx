import { useEffect, useState } from 'react'
import { supabase, Proveedor, PagoProveedor, EstadoPago, EstadoGeneral } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Modal, ConfirmDialog, EmptyState, EstadoBadge, Spinner } from '@/components/ui'
import { Plus, Pencil, Trash2, Package, CheckCircle, Search, Building2 } from 'lucide-react'
import { format } from 'date-fns'

const emptyPago = { proveedor_id:'', concepto:'', monto:'', fecha_emision: new Date().toISOString().split('T')[0], fecha_vencimiento:'', estado:'pendiente' as EstadoPago, numero_factura:'', notas:'' }
const emptyProv = { rut:'', razon_social:'', nombre_fantasia:'', rubro:'', contacto_nombre:'', contacto_email:'', contacto_telefono:'', direccion:'', banco:'', cuenta_bancaria:'' }
const RUBROS = ['Aseo y Mantención','Material Escolar','Alimentación','Transporte','Tecnología','Construcción','Servicios Profesionales','Otro']

export default function ProveedoresPage() {
  const { perfil, selectedEstablecimientoId }             = useAuth()
  const [tab, setTab]           = useState<'pagos'|'proveedores'>('pagos')
  const [pagos, setPagos]       = useState<PagoProveedor[]>([])
  const [provs, setProvs]       = useState<Proveedor[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterEstado, setFilterEstado] = useState<EstadoPago|''>('')
  const [modalPago, setModalPago] = useState<'add'|'edit'|null>(null)
  const [modalProv, setModalProv] = useState<'add'|'edit'|null>(null)
  const [editingPago, setEditingPago] = useState<PagoProveedor|null>(null)
  const [editingProv, setEditingProv] = useState<Proveedor|null>(null)
  const [formPago, setFormPago] = useState({ ...emptyPago })
  const [formProv, setFormProv] = useState({ ...emptyProv })
  const [delPago, setDelPago]   = useState<string|null>(null)
  const [delProv, setDelProv]   = useState<string|null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function load() {
    if (!selectedEstablecimientoId) return
    setLoading(true)
    const [{ data: pg }, { data: pr }] = await Promise.all([
      supabase.from('pagos_proveedores').select('*, proveedores(razon_social,nombre_fantasia,rut)').eq('establecimiento_id', selectedEstablecimientoId).order('fecha_vencimiento'),
      supabase.from('proveedores').select('*').eq('establecimiento_id', selectedEstablecimientoId).order('razon_social'),
    ])
    setPagos(pg??[]); setProvs(pr??[])
    setLoading(false)
  }
  useEffect(() => { load() }, [selectedEstablecimientoId])

  async function savePago() {
    if (!selectedEstablecimientoId) { setError('No hay colegio seleccionado.'); return }
    setSaving(true); setError('')
    const payload = { 
        proveedor_id:formPago.proveedor_id, 
        concepto:formPago.concepto, 
        monto:parseFloat(formPago.monto), 
        fecha_emision:formPago.fecha_emision, 
        fecha_vencimiento:formPago.fecha_vencimiento, 
        estado:formPago.estado, 
        numero_factura:formPago.numero_factura||null, 
        notas:formPago.notas||null,
        establecimiento_id: selectedEstablecimientoId
    }
    const { error: e } = editingPago
      ? await supabase.from('pagos_proveedores').update(payload).eq('id', editingPago.id)
      : await supabase.from('pagos_proveedores').insert([payload])
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setModalPago(null); load()
  }

  async function saveProv() {
    if (!selectedEstablecimientoId) { setError('No hay colegio seleccionado.'); return }
    setSaving(true); setError('')
    const payload = { 
        rut:formProv.rut, 
        razon_social:formProv.razon_social, 
        nombre_fantasia:formProv.nombre_fantasia||null, 
        rubro:formProv.rubro||null, 
        contacto_nombre:formProv.contacto_nombre||null, 
        contacto_email:formProv.contacto_email||null, 
        contacto_telefono:formProv.contacto_telefono||null, 
        direccion:formProv.direccion||null, 
        banco:formProv.banco||null, 
        cuenta_bancaria:formProv.cuenta_bancaria||null,
        establecimiento_id: selectedEstablecimientoId
    }
    const { error: e } = editingProv
      ? await supabase.from('proveedores').update(payload).eq('id', editingProv.id)
      : await supabase.from('proveedores').insert([payload])
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setModalProv(null); load()
  }

  async function marcarPagado(id: string) {
    await supabase.from('pagos_proveedores').update({ estado:'pagado', fecha_pago: new Date().toISOString().split('T')[0] }).eq('id', id)
    load()
  }

  const fmt = (n:number) => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n)

  const filteredPagos = pagos.filter(r => {
    const q = `${(r as any).proveedores?.razon_social} ${r.concepto} ${r.numero_factura}`.toLowerCase().includes(search.toLowerCase())
    return q && (filterEstado ? r.estado===filterEstado : true)
  })

  const totals = {
    pendiente: pagos.filter(r=>r.estado==='pendiente').reduce((a:any,r:any)=>a+Number(r.monto),0),
    pagado: pagos.filter(r=>r.estado==='pagado').reduce((a:any,r:any)=>a+Number(r.monto),0),
    vencido: pagos.filter(r=>r.estado==='vencido').reduce((a:any,r:any)=>a+Number(r.monto),0),
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Gestión de Proveedores"
        subtitle="Control de pagos y facturas a proveedores"
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={()=>{setFormProv({...emptyProv});setEditingProv(null);setError('');setModalProv('add')}}><Building2 className="w-4 h-4"/>Proveedor</button>
            <button className="btn-primary" onClick={()=>{setFormPago({...emptyPago});setEditingPago(null);setError('');setModalPago('add')}}><Plus className="w-4 h-4"/>Nueva factura</button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4"><p className="text-xs text-slate-400 mb-1">Por pagar</p><p className="text-xl font-bold text-amber-600">{fmt(totals.pendiente)}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-400 mb-1">Pagado</p><p className="text-xl font-bold text-emerald-600">{fmt(totals.pagado)}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-400 mb-1">Vencido</p><p className="text-xl font-bold text-red-600">{fmt(totals.vencido)}</p></div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={()=>setTab('pagos')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab==='pagos'?'bg-white shadow-sm text-slate-900':'text-slate-500 hover:text-slate-700'}`}>Facturas y Pagos</button>
        <button onClick={()=>setTab('proveedores')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab==='proveedores'?'bg-white shadow-sm text-slate-900':'text-slate-500 hover:text-slate-700'}`}>Proveedores</button>
      </div>

      {tab==='pagos' && (
        <div className="card">
          <div className="card-header flex-wrap gap-2">
            <h3 className="section-title">Facturas</h3>
            <div className="flex gap-2 ml-auto flex-wrap">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input className="input pl-9 w-44" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
              <select className="input w-36" value={filterEstado} onChange={e=>setFilterEstado(e.target.value as any)}>
                <option value="">Todos</option><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option><option value="vencido">Vencido</option>
              </select>
            </div>
          </div>
          <div className="table-wrapper">
            {loading ? <div className="flex justify-center py-12"><Spinner className="w-6 h-6 text-brand-500"/></div>
            : filteredPagos.length===0 ? <EmptyState icon={Package} title="Sin facturas" description="No hay facturas registradas." />
            : (
              <table className="table">
                <thead><tr><th>Proveedor</th><th>Concepto</th><th>N° Factura</th><th>Monto</th><th>Vencimiento</th><th>Estado</th><th className="text-right">Acciones</th></tr></thead>
                <tbody>
                  {filteredPagos.map((r:any)=>(
                    <tr key={r.id}>
                      <td><p className="font-medium text-slate-800">{r.proveedores?.razon_social}</p><p className="text-xs text-slate-400 font-mono">{r.proveedores?.rut}</p></td>
                      <td>{r.concepto}</td>
                      <td className="font-mono text-xs text-slate-500">{r.numero_factura??'—'}</td>
                      <td className="font-semibold">{fmt(Number(r.monto))}</td>
                      <td className={`text-sm ${r.estado==='vencido'?'text-red-600 font-medium':''}`}>{format(new Date(r.fecha_vencimiento),'dd/MM/yyyy')}</td>
                      <td><EstadoBadge estado={r.estado}/></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {r.estado==='pendiente' && <button className="btn-ghost btn-sm p-1.5 text-emerald-600 hover:bg-emerald-50" onClick={()=>marcarPagado(r.id)}><CheckCircle className="w-3.5 h-3.5"/></button>}
                          <button className="btn-ghost btn-sm p-1.5" onClick={()=>{setFormPago({proveedor_id:r.proveedor_id,concepto:r.concepto,monto:r.monto.toString(),fecha_emision:r.fecha_emision,fecha_vencimiento:r.fecha_vencimiento,estado:r.estado,numero_factura:r.numero_factura??'',notas:r.notas??''});setEditingPago(r);setError('');setModalPago('edit')}}><Pencil className="w-3.5 h-3.5"/></button>
                          <button className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" onClick={()=>setDelPago(r.id)}><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab==='proveedores' && (
        <div className="card">
          <div className="card-header"><h3 className="section-title">Proveedores Registrados</h3></div>
          <div className="table-wrapper">
            {loading ? <div className="flex justify-center py-12"><Spinner className="w-6 h-6 text-brand-500"/></div>
            : provs.length===0 ? <EmptyState icon={Building2} title="Sin proveedores" />
            : (
              <table className="table">
                <thead><tr><th>Razón Social</th><th>RUT</th><th>Rubro</th><th>Contacto</th><th>Estado</th><th className="text-right">Acciones</th></tr></thead>
                <tbody>
                  {provs.map(r=>(
                    <tr key={r.id}>
                      <td><p className="font-medium text-slate-800">{r.razon_social}</p>{r.nombre_fantasia&&<p className="text-xs text-slate-400">{r.nombre_fantasia}</p>}</td>
                      <td className="font-mono text-xs">{r.rut}</td>
                      <td>{r.rubro??'—'}</td>
                      <td><p className="text-sm">{r.contacto_nombre??'—'}</p>{r.contacto_email&&<p className="text-xs text-slate-400">{r.contacto_email}</p>}</td>
                      <td><EstadoBadge estado={r.estado}/></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button className="btn-ghost btn-sm p-1.5" onClick={()=>{setFormProv({rut:r.rut,razon_social:r.razon_social,nombre_fantasia:r.nombre_fantasia??'',rubro:r.rubro??'',contacto_nombre:r.contacto_nombre??'',contacto_email:r.contacto_email??'',contacto_telefono:r.contacto_telefono??'',direccion:r.direccion??'',banco:r.banco??'',cuenta_bancaria:r.cuenta_bancaria??''});setEditingProv(r);setError('');setModalProv('edit')}}><Pencil className="w-3.5 h-3.5"/></button>
                          <button className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" onClick={()=>setDelProv(r.id)}><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <Modal open={modalPago!==null} onClose={()=>setModalPago(null)} title={editingPago?'Editar Factura':'Nueva Factura'} size="lg">
        <div className="p-6 grid grid-cols-2 gap-4">
          {error&&<div className="col-span-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-xl border border-red-200">{error}</div>}
          <div className="form-group col-span-2">
            <label className="label">Proveedor</label>
            <select className="input" value={formPago.proveedor_id} onChange={e=>setFormPago({...formPago,proveedor_id:e.target.value})}>
              <option value="">— Seleccionar proveedor —</option>
              {provs.map(p=><option key={p.id} value={p.id}>{p.razon_social} — {p.rut}</option>)}
            </select>
          </div>
          {[['Concepto','concepto','text'],['N° Factura','numero_factura','text'],['Monto ($)','monto','number'],['Estado','estado','estado'],['Fecha Emisión','fecha_emision','date'],['Fecha Vencimiento','fecha_vencimiento','date']].map(([label,key,type]:any)=>(
            <div key={key} className="form-group">
              <label className="label">{label}</label>
              {type==='estado'
                ? <select className="input" value={(formPago as any)[key]} onChange={e=>setFormPago({...formPago,[key]:e.target.value})}>
                    <option value="pendiente">Pendiente</option><option value="pagado">Pagado</option><option value="vencido">Vencido</option><option value="anulado">Anulado</option>
                  </select>
                : <input className="input" type={type} value={(formPago as any)[key]} onChange={e=>setFormPago({...formPago,[key]:e.target.value})} />
              }
            </div>
          ))}
          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button className="btn-secondary" onClick={()=>setModalPago(null)}>Cancelar</button>
            <button className="btn-primary" onClick={savePago} disabled={saving}>{saving?'Guardando...':'Guardar'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={modalProv!==null} onClose={()=>setModalProv(null)} title={editingProv?'Editar Proveedor':'Agregar Proveedor'} size="lg">
        <div className="p-6 grid grid-cols-2 gap-4">
          {error&&<div className="col-span-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-xl border border-red-200">{error}</div>}
          {[['RUT','rut'],['Razón Social','razon_social'],['Nombre Fantasía','nombre_fantasia'],['Contacto','contacto_nombre'],['Email','contacto_email'],['Teléfono','contacto_telefono'],['Banco','banco'],['Cuenta Bancaria','cuenta_bancaria']].map(([label,key]:any)=>(
            <div key={key} className="form-group">
              <label className="label">{label}</label>
              <input className="input" value={(formProv as any)[key]} onChange={e=>setFormProv({...formProv,[key]:e.target.value})} />
            </div>
          ))}
          <div className="form-group">
            <label className="label">Rubro</label>
            <select className="input" value={formProv.rubro} onChange={e=>setFormProv({...formProv,rubro:e.target.value})}>
              <option value="">— Seleccionar —</option>
              {RUBROS.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="form-group col-span-2">
            <label className="label">Dirección</label>
            <input className="input" value={formProv.direccion} onChange={e=>setFormProv({...formProv,direccion:e.target.value})}/>
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button className="btn-secondary" onClick={()=>setModalProv(null)}>Cancelar</button>
            <button className="btn-primary" onClick={saveProv} disabled={saving}>{saving?'Guardando...':'Guardar'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delPago} onClose={()=>setDelPago(null)} onConfirm={async()=>{await supabase.from('pagos_proveedores').delete().eq('id',delPago!);setDelPago(null);load()}} title="Eliminar Factura" message="¿Eliminar?" />
      <ConfirmDialog open={!!delProv} onClose={()=>setDelProv(null)} onConfirm={async()=>{await supabase.from('proveedores').delete().eq('id',delProv!);setDelProv(null);load()}} title="Eliminar Proveedor" message="¿Eliminar?" />
    </div>
  )
}
