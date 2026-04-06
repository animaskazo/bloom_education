-- 1. Crear la tabla de eventos del calendario
CREATE TABLE IF NOT EXISTS public.eventos_calendario (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fecha DATE NOT NULL,
    hora_inicio TIME,
    tipo TEXT DEFAULT 'actividad', -- 'actividad', 'feriado', 'examen', etc.
    establecimiento_id UUID REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    creado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.eventos_calendario ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso

-- Cualquier usuario del establecimiento puede ver los eventos
CREATE POLICY "Ver eventos por establecimiento" ON public.eventos_calendario
    FOR SELECT USING (
        establecimiento_id IN (
            SELECT establecimiento_id FROM public.perfiles WHERE id = auth.uid()
        )
    );

-- Solo directores y administrativos pueden crear eventos
CREATE POLICY "Directores y Administrativos pueden crear eventos" ON public.eventos_calendario
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.perfiles 
            WHERE id = auth.uid() AND rol IN ('direccion', 'administrativo', 'super_admin')
        )
    );

-- Los creadores o administrativos pueden editar sus eventos
CREATE POLICY "Directores y Administrativos pueden editar eventos" ON public.eventos_calendario
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.perfiles 
            WHERE id = auth.uid() AND rol IN ('direccion', 'administrativo', 'super_admin')
        )
    );

-- Los creadores o administrativos pueden borrar eventos
CREATE POLICY "Directores y Administrativos pueden borrar eventos" ON public.eventos_calendario
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.perfiles 
            WHERE id = auth.uid() AND rol IN ('direccion', 'administrativo', 'super_admin')
        )
    );
