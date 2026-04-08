import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rrszgzdkqlzaqbeqdohz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyc3pnemRrcWx6YXFiZXFkb2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDU0MDUsImV4cCI6MjA4NjMyMTQwNX0.1TcefrS7XMQTCUU46B528P8DPjcZk3XJ0EXODDLQKqo';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: p, error: pe } = await supabase.from('perfiles').select('*').eq('id', '5bcacd7e-acaa-4f3e-a04b-f6213584a681');
  console.log('Perfiles:', p, pe?.message);
  
  const { data: a, error: ae } = await supabase.from('apoderados').select('*').eq('perfil_id', '5bcacd7e-acaa-4f3e-a04b-f6213584a681');
  console.log('Apoderados:', a, ae?.message);
  
  const { data: e, error: ee } = await supabase.from('estudiantes').select('*').limit(1);
  console.log('Estudiante (un ejemplo):', e, ee?.message);
}

check();
