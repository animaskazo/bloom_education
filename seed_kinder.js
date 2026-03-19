import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rrszgzdkqlzaqbeqdohz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyc3pnemRrcWx6YXFiZXFkb2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDU0MDUsImV4cCI6MjA4NjMyMTQwNX0.1TcefrS7XMQTCUU46B528P8DPjcZk3XJ0EXODDLQKqo';
const estId = '47ac7c1e-e568-42e8-9b74-a16abcb689eb';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const niveles = [
  { nombre: 'Sala Cuna Menor', nivel: 'pre_basica', edad: 1 },
  { nombre: 'Sala Cuna Mayor', nivel: 'pre_basica', edad: 2 },
  { nombre: 'Medio Menor', nivel: 'pre_basica', edad: 3 },
  { nombre: 'Medio Mayor', nivel: 'pre_basica', edad: 4 },
  { nombre: 'Pre-Kinder', nivel: 'pre_basica', edad: 5 },
  { nombre: 'Kinder', nivel: 'pre_basica', edad: 6 },
];

async function seed() {
  console.log('--- Iniciando Seed de Niveles de Jardín Infantil ---');
  for (const n of niveles) {
    try {
        // 1. Crear Curso
        const { data: curso, error: cErr } = await supabase.from('cursos').insert({
          nombre: n.nombre,
          nivel: n.nivel,
          año: 2026,
          capacidad_max: 20,
          estado: 'activo',
          establecimiento_id: estId
        }).select().single();

        if (cErr) {
          console.error(`Error creando curso ${n.nombre}:`, cErr.message);
          continue;
        }

        console.log(`- Curso creado: ${curso.nombre} (ID: ${curso.id})`);

        // 2. Crear 10 Estudiantes
        const names = ['Sofia', 'Mateo', 'Isabella', 'Liam', 'Valentina', 'Benjamin', 'Camila', 'Lucas', 'Mia', 'Thiago'];
        const lastNames = ['Gonzales', 'Rodriguez', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez'];

        const estudiantes = Array.from({ length: 10 }).map((_, i) => {
          const g = i % 2 === 0 ? 'M' : 'F';
          const birth = new Date();
          birth.setFullYear(2026 - n.edad);
          birth.setMonth(Math.floor(Math.random() * 12));
          birth.setDate(Math.floor(Math.random() * 28) + 1);

          return {
            rut: `${15000000 + Math.floor(Math.random() * 10000000)}-${Math.floor(Math.random() * 9)}`,
            nombre: names[i] || `Niño ${i}`,
            apellido: lastNames[i] || `Apellido ${i}`,
            fecha_nacimiento: birth.toISOString().split('T')[0],
            genero: g,
            direccion: `Avenida Jardín #${i + 100}, Comuna`,
            nacionalidad: 'Chilena',
            curso_id: curso.id,
            estado: 'activo',
            establecimiento_id: estId
          };
        });

        const { error: sErr } = await supabase.from('estudiantes').insert(estudiantes);
        if (sErr) console.error(`  Error creando estudiantes para ${n.nombre}:`, sErr.message);
        else console.log(`  OK: 10 estudiantes creados para ${n.nombre}`);
    } catch (e) {
        console.error(`Fallo inesperado nivel ${n.nombre}:`, e);
    }
  }
  console.log('--- Seed Finalizado ---');
}

seed();
