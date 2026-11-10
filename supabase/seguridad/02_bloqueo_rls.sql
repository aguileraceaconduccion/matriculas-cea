-- =====================================================================
-- 02_bloqueo_rls.sql              PASO 2 de 2  (CIERRA EL ACCESO PÚBLICO)
--
-- EJECUTAR SOLO cuando:
--   1) Ya hizo un respaldo (carpeta backups/ o respaldo desde el panel de Supabase).
--   2) Ya ejecutó 01_funciones_y_admin.sql.
--   3) Ya registró al instructor en `administradores` (ver README.md).
--   4) Ya publicó la nueva versión de la aplicación (que usa las funciones RPC).
--
-- Qué hace:   quita las políticas públicas (USING (true)) y deja solo las
--             políticas seg_* creadas en el paso 1; vuelve privado el bucket.
-- Qué NO hace: no borra tablas, filas ni archivos.  Solo cambia permisos.
--
-- Si algo sale mal, ver "Cómo revertir" al final del README.md.
-- =====================================================================

-- Guarda anti-bloqueo: sin al menos un administrador, nadie podría entrar al panel.
do $$
begin
    if not exists (select 1 from public.administradores) then
        raise exception 'ABORTADO: la tabla administradores está vacía. Registre al instructor antes de ejecutar este script.';
    end if;
end $$;

-- Quitar TODAS las políticas antiguas de las tablas de la app (las seg_* se conservan)
do $$
declare
    r record;
begin
    for r in
        select policyname, tablename
        from pg_policies
        where schemaname = 'public'
          and tablename in ('usuarios', 'solicitudes', 'alumnos', 'acudientes', 'documentos',
                            'configuracion_correo', 'historial_envios')
          and policyname not like 'seg\_%' escape '\'
    loop
        raise notice 'Eliminando política antigua: %.%', r.tablename, r.policyname;
        execute format('drop policy %I on public.%I', r.policyname, r.tablename);
    end loop;
end $$;

-- Quitar políticas antiguas de Storage que abran el bucket `expedientes`
do $$
declare
    r record;
begin
    for r in
        select policyname
        from pg_policies
        where schemaname = 'storage' and tablename = 'objects'
          and policyname not like 'seg\_%' escape '\'
          and (coalesce(qual, '') ilike '%expedientes%'
               or coalesce(with_check, '') ilike '%expedientes%'
               or qual = 'true' or with_check = 'true')
    loop
        raise notice 'Eliminando política antigua de storage: %', r.policyname;
        execute format('drop policy %I on storage.objects', r.policyname);
    end loop;
end $$;

-- RLS activo y sin acceso directo para el rol anónimo
alter table public.usuarios             enable row level security;
alter table public.solicitudes          enable row level security;
alter table public.alumnos              enable row level security;
alter table public.acudientes           enable row level security;
alter table public.documentos           enable row level security;
alter table public.configuracion_correo enable row level security;
alter table public.historial_envios     enable row level security;

revoke all on public.usuarios, public.solicitudes, public.alumnos, public.acudientes,
              public.documentos, public.configuracion_correo, public.historial_envios
    from anon;

-- Bucket privado: los archivos solo se ven con enlaces firmados temporales
insert into storage.buckets (id, name, public)
values ('expedientes', 'expedientes', false)
on conflict (id) do update set public = false;

-- Verificación: debe listar SOLO políticas seg_* para las tablas de la app
select tablename, policyname, cmd, roles
from pg_policies
where (schemaname = 'public'
       and tablename in ('usuarios', 'solicitudes', 'alumnos', 'acudientes', 'documentos',
                         'configuracion_correo', 'historial_envios'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;
