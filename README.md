# EduTrack SaaS — Plataforma de Gestión Educacional

Sistema de gestión completo para complejos educacionales en Chile.

## 🚀 Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
# El archivo .env ya contiene las credenciales del proyecto Supabase

# 3. Iniciar en desarrollo
npm run dev

# 4. Construir para producción
npm run build
```

## 🗂️ Módulos del sistema

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/` | Resumen general con gráficos y alertas |
| Personal | `/personal` | CRUD funcionarios, contratos, sueldos |
| Estudiantes | `/estudiantes` | Matrícula, asignación de cursos |
| Cursos | `/cursos` | Gestión de cursos y profesores jefes |
| Comunicados | `/comunicados` | Comunicación interna |
| Padres | `/padres` | Directorio de apoderados con pupilos |
| Pagos Apoderados | `/pagos` | Cobranza, mensualidades |
| Proveedores | `/proveedores` | Facturas y pagos a proveedores |
| Configuración | `/configuracion` | Perfil y cuenta |

## 🗄️ Base de datos (Supabase)

**Proyecto:** `jardin-infantil-saas`  
**URL:** `https://rrszgzdkqlzaqbeqdohz.supabase.co`  
**Región:** Sudamérica (sa-east-1)

### Tablas creadas
- `perfiles` — Extiende auth.users con datos de perfil
- `personal` — Funcionarios del establecimiento
- `cursos` — Cursos y niveles
- `estudiantes` — Alumnos matriculados
- `apoderados` — Padres y apoderados
- `estudiante_apoderado` — Relación alumno-apoderado
- `comunicados` — Mensajes internos y a padres
- `proveedores` — Empresas proveedoras
- `pagos_apoderados` — Cobranza y mensualidades
- `pagos_proveedores` — Facturas y pagos a proveedores

## 🛠️ Stack tecnológico

- **Frontend:** React 18 + TypeScript + Vite
- **Estilos:** Tailwind CSS 3 (tema claro)
- **Tipografías:** Fraunces (display) + Plus Jakarta Sans (body)
- **Backend/DB:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth con RLS
- **Gráficos:** Recharts
- **Router:** React Router v6
- **Íconos:** Lucide React

## 👤 Roles de usuario

| Rol | Descripción |
|-----|-------------|
| `direccion` | Directivos con acceso completo |
| `profesor` | Docentes |
| `administrativo` | Personal administrativo |
| `apoderado` | Padres (acceso limitado) |

## 📋 Crear primer usuario administrador

1. Ve al dashboard de Supabase → Authentication → Users
2. Crea un usuario con email y contraseña
3. En la tabla `perfiles`, asigna `rol = 'direccion'`

O usa la API de Supabase para invitar usuarios:
```sql
-- El trigger on_auth_user_created creará automáticamente el perfil
-- Solo necesitas crear el usuario desde el dashboard de Supabase Auth
```
