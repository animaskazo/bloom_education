-- 1. Agregar columna de destinatarios con valor predeterminado 'todos'
ALTER TABLE public.eventos_calendario 
ADD COLUMN IF NOT EXISTS destinatarios TEXT DEFAULT 'todos';

-- 2. Eliminar la política anterior de visualización para actualizarla
DROP POLICY IF EXISTS "Ver eventos por establecimiento" ON public.eventos_calendario;

-- 3. Crear nueva política que filtra por destinatario según el rol del usuario
CREATE POLICY "Ver eventos por establecimiento y destinatario" ON public.eventos_calendario
    FOR SELECT USING (
        establecimiento_id IN (
            SELECT establecimiento_id FROM public.perfiles WHERE id = auth.uid()
        )
        AND (
            destinatarios = 'todos'
            OR (destinatarios = 'staff' AND (SELECT rol FROM public.perfiles WHERE id = auth.uid()) IN ('super_admin', 'direccion', 'profesor', 'administrativo'))
            OR (destinatarios = 'apoderados' AND (SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'apoderado')
        )
    );
