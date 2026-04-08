import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rrszgzdkqlzaqbeqdohz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyc3pnemRrcWx6YXFiZXFkb2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDU0MDUsImV4cCI6MjA4NjMyMTQwNX0.1TcefrS7XMQTCUU46B528P8DPjcZk3XJ0EXODDLQKqo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const perfil_id = '5bcacd7e-acaa-4f3e-a04b-f6213584a681';
  let establecimiento_id = '47ac7c1e-e568-42e8-9b74-a16abcb689eb'; // from seed_kinder.js
  
  console.log('Buscando apoderado...');
  let { data: apod, error: errA } = await supabase.from('apoderados').select('*').eq('perfil_id', perfil_id);
  console.log('Apoderado actual:', apod);
  
  if (!apod || apod.length === 0) {
    console.log('No existe apoderado para este perfil. Creándolo...');
    const { data: newApod, error: newErr } = await supabase.from('apoderados').insert({
      perfil_id,
      establecimiento_id
    }).select().single();
    
    if (newErr) {
      console.log('Error creando apoderado:', newErr);
      return;
    }
    apod = [newApod];
    console.log('Apoderado creado:', newApod);
  } else {
      console.log('Apoderado ya existe');
  }

  // Ahora obtenemos un estudiante
  console.log('Buscando estudiante...');
  const { data: est, error: errEst } = await supabase.from('estudiantes').select('*').limit(1);
  if (!est || est.length === 0) {
      console.log('No hay estudiantes en la base de datos');
      return;
  }
  
  const estudiante_id = est[0].id;
  const apoderado_id = apod[0].id;
  
  console.log(`Verificando vinculo apoderado ${apoderado_id} con estudiante ${estudiante_id}...`);
  const { data: link, error: errLink } = await supabase.from('estudiante_apoderado')
    .select('*')
    .eq('apoderado_id', apoderado_id)
    .eq('estudiante_id', estudiante_id);
    
  if (!link || link.length === 0) {
      console.log('No hay vinculo. Creándolo...');
      const { error: insErr } = await supabase.from('estudiante_apoderado').insert({
          apoderado_id,
          estudiante_id,
          relacion: 'padre/madre'
      });
      if (insErr) console.log('Error creando vínculo:', insErr);
      else console.log('Vínculo creado exitosamente!');
  } else {
      console.log('Vínculo ya existe.');
  }
}

run();
