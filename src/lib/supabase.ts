import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      perfiles: {
        Row: Perfil
        Insert: Omit<Perfil, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Perfil, 'id'>>
      }
      cursos: { Row: Curso; Insert: Omit<Curso, 'id' | 'created_at'>; Update: Partial<Curso> }
      estudiantes: { Row: Estudiante; Insert: Omit<Estudiante, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Estudiante> }
      apoderados: { Row: Apoderado; Insert: Omit<Apoderado, 'id' | 'created_at'>; Update: Partial<Apoderado> }
      personal: { Row: Personal; Insert: Omit<Personal, 'id' | 'created_at'>; Update: Partial<Personal> }
      proveedores: { Row: Proveedor; Insert: Omit<Proveedor, 'id' | 'created_at'>; Update: Partial<Proveedor> }
      comunicados: { Row: Comunicado; Insert: Omit<Comunicado, 'id' | 'created_at'>; Update: Partial<Comunicado> }
      pagos_apoderados: { Row: PagoApoderado; Insert: Omit<PagoApoderado, 'id' | 'created_at'>; Update: Partial<PagoApoderado> }
      pagos_proveedores: { Row: PagoProveedor; Insert: Omit<PagoProveedor, 'id' | 'created_at'>; Update: Partial<PagoProveedor> }
      establecimientos: { Row: Establecimiento; Insert: Omit<Establecimiento, 'id' | 'created_at'>; Update: Partial<Establecimiento> }
      asistencia: { Row: Asistencia; Insert: Omit<Asistencia, 'id' | 'created_at'>; Update: Partial<Asistencia> }
      comunicados_envios: { Row: ComunicadoEnvio; Insert: Omit<ComunicadoEnvio, 'id' | 'created_at'>; Update: Partial<ComunicadoEnvio> }
      libreta_configuracion: { Row: LibretaConfig; Insert: Omit<LibretaConfig, 'id' | 'created_at'>; Update: Partial<LibretaConfig> }
      libreta_diaria: { Row: LibretaDiaria; Insert: Omit<LibretaDiaria, 'id' | 'created_at'>; Update: Partial<LibretaDiaria> }
      estudiante_apoderado: { Row: EstudianteApoderado; Insert: Omit<EstudianteApoderado, 'id'>; Update: Partial<EstudianteApoderado> }
    }
  }
}

export interface EstudianteApoderado {
  id: string
  apoderado_id: string
  estudiante_id: string
  parentesco?: string
  es_titular: boolean
}

export type UserRole = 'super_admin' | 'direccion' | 'profesor' | 'administrativo' | 'apoderado'
export type EstadoGeneral = 'activo' | 'inactivo' | 'suspendido'
export type EstadoPago = 'pendiente' | 'pagado' | 'vencido' | 'anulado'
export type TipoComunicado = 'interno' | 'padres' | 'general'
export type NivelCurso = 'pre_basica' | 'basica' | 'media'

export interface Perfil {
  id: string
  nombre: string
  apellido: string
  rut?: string
  email: string
  telefono?: string
  rol: UserRole
  estado: EstadoGeneral
  establecimiento_id?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Establecimiento {
  id: string
  nombre: string
  rut?: string
  email_contacto?: string
  telefono?: string
  direccion?: string
  estado: 'activo' | 'inactivo'
  valor_mensualidad: number
  created_at: string
}

export interface Curso {
  id: string
  nombre: string
  nivel: NivelCurso
  año: number
  letra?: string
  profesor_jefe_id?: string
  capacidad_max: number
  estado: EstadoGeneral
  establecimiento_id: string
  created_at: string
}

export interface Estudiante {
  id: string
  rut: string
  nombre: string
  apellido: string
  fecha_nacimiento?: string
  genero?: string
  nacionalidad?: string
  direccion?: string
  curso_id?: string
  estado: EstadoGeneral
  foto_url?: string
  // Información Médica
  grupo_sangre?: string
  alergias?: string
  enfermedades_cronicas?: string
  medicamentos?: string
  prevision_salud?: string
  // Emergencia
  contacto_emergencia_nombre?: string
  contacto_emergencia_telefono?: string
  valor_mensualidad?: number
  establecimiento_id: string
  created_at: string
  updated_at: string
  cursos?: Curso
}

export interface Apoderado {
  id: string
  perfil_id?: string
  rut: string
  nombre: string
  apellido: string
  email?: string
  telefono?: string
  direccion?: string
  establecimiento_id: string
  created_at: string
}

export interface Personal {
  id: string
  perfil_id?: string
  rut: string
  nombre: string
  apellido: string
  cargo: string
  departamento?: string
  fecha_ingreso?: string
  tipo_contrato?: string
  sueldo_base?: number
  estado: EstadoGeneral
  establecimiento_id: string
  created_at: string
}

export interface Proveedor {
  id: string
  rut: string
  razon_social: string
  nombre_fantasia?: string
  rubro?: string
  contacto_nombre?: string
  contacto_email?: string
  contacto_telefono?: string
  direccion?: string
  banco?: string
  cuenta_bancaria?: string
  estado: EstadoGeneral
  establecimiento_id: string
  created_at: string
}

export interface Comunicado {
  id: string
  titulo: string
  contenido: string
  tipo: TipoComunicado
  autor_id?: string
  curso_id?: string
  fecha_publicacion: string
  fecha_expiracion?: string
  es_urgente: boolean
  estado: EstadoGeneral
  establecimiento_id: string
  created_at: string
  perfiles?: Perfil
  cursos?: Curso
  comunicados_envios?: ComunicadoEnvio[]
}

export interface ComunicadoEnvio {
  id: string
  comunicado_id: string
  enviado_por_id: string
  metodo: string
  cantidad_personas: number
  detalles: any
  created_at: string
  perfiles?: Perfil
}

export interface PagoApoderado {
  id: string
  apoderado_id: string
  estudiante_id: string
  concepto: string
  monto: number
  mes_periodo?: string
  fecha_vencimiento: string
  fecha_pago?: string
  estado: EstadoPago
  metodo_pago?: string
  comprobante_url?: string
  notas?: string
  establecimiento_id: string
  created_at: string
  apoderados?: Apoderado
  estudiantes?: Estudiante
}

export interface PagoProveedor {
  id: string
  proveedor_id: string
  concepto: string
  monto: number
  fecha_emision: string
  fecha_vencimiento: string
  fecha_pago?: string
  estado: EstadoPago
  numero_factura?: string
  notas?: string
  establecimiento_id: string
  created_at: string
  proveedores?: Proveedor
}

export type EstadoAsistencia = 'presente' | 'ausente' | 'atrasado' | 'justificado'

export interface Asistencia {
  id: string
  estudiante_id: string
  curso_id: string
  establecimiento_id: string
  fecha: string
  estado: EstadoAsistencia
  justificacion?: string
  created_at: string
}

export interface LibretaConfig {
  id: string
  establecimiento_id: string
  pregunta: string
  opciones: string[]
  permite_comentario: boolean
  orden: number
  estado: 'activo' | 'inactivo'
  created_at: string
}

export interface LibretaDiaria {
  id: string
  estudiante_id: string
  fecha: string
  registrado_por: string
  respuestas: Record<string, { r: string; c?: string }>
  comentario_general?: string
  establecimiento_id: string
  created_at: string
}
