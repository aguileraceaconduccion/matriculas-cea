-- =====================================================================
-- 01_funciones_y_admin.sql        PASO 1 de 2  (ADITIVO)
--
-- Este script SOLO AGREGA: no borra tablas, no borra filas, no quita ningún
-- permiso existente. Es seguro ejecutarlo varias veces (idempotente).
-- Con él, el sitio actual sigue funcionando igual que antes.
--
-- Qué agrega:
--   * tabla `administradores` (quién es instructor) y función es_admin()
--   * funciones RPC para que el alumno trabaje SOLO con su código único
--   * políticas "seg_*" para el instructor (tablas y bucket `expedientes`)
--   * amplía los CHECK de estados/tipos para que coincidan con la aplicación
--
-- Ejecutar en: Supabase > SQL Editor.   NO ejecutar 02 hasta seguir el README.
-- =====================================================================

-- ---------- 1. Administradores -----------------------------------------
create table if not exists public.administradores (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);
alter table public.administradores enable row level security;
-- Sin políticas a propósito: nadie puede leerla/escribirla por la API.
revoke all on public.administradores from anon, authenticated;

create or replace function public.es_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists (select 1 from public.administradores where user_id = auth.uid());
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;

-- ---------- 2. Endurecer la función del trigger existente -------------
alter function public.handle_new_user() set search_path = public;

-- ---------- 3. Alinear CHECKs con la aplicación (solo se AMPLÍAN) -----
alter table public.solicitudes drop constraint if exists solicitudes_estado_check;
alter table public.solicitudes add constraint solicitudes_estado_check check (estado in (
    'Solicitud enviada', 'Alumno diligenciando', 'Pendiente pagos instructor',
    'Completo', 'Enviado a academia', 'Proceso finalizado', 'Aprobado', 'Rechazado'
));

alter table public.documentos drop constraint if exists documentos_tipo_check;
alter table public.documentos add constraint documentos_tipo_check check (tipo in (
    'foto', 'cedula_pdf', 'licencia_pdf', 'pago_pin', 'pago_teoria',
    'ficha_matricula', 'habeas_data'
));

-- ---------- 4. Funciones internas --------------------------------------
-- Valida que el código exista, que la solicitud siga abierta y que el alumno
-- pertenezca a ella. Devuelve el id de la solicitud.
create or replace function public._solicitud_editable(p_codigo text, p_alumno uuid default null)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
    s public.solicitudes;
begin
    if p_codigo is null or length(p_codigo) < 6 or length(p_codigo) > 64 then
        raise exception 'Código inválido';
    end if;
    select * into s from public.solicitudes where codigo_unico = p_codigo;
    if not found then
        raise exception 'Solicitud no encontrada';
    end if;
    if s.estado not in ('Solicitud enviada', 'Alumno diligenciando') then
        raise exception 'La solicitud ya no admite cambios';
    end if;
    if p_alumno is not null and not exists (
        select 1 from public.alumnos where id = p_alumno and solicitud_id = s.id
    ) then
        raise exception 'El alumno no pertenece a esta solicitud';
    end if;
    return s.id;
end;
$$;
revoke all on function public._solicitud_editable(text, uuid) from public, anon, authenticated;

-- Permite subir archivos al bucket solo dentro de la carpeta <alumno_id>/ de
-- una solicitud todavía abierta.
create or replace function public.puede_subir_expediente(p_name text)
returns boolean
language plpgsql stable security definer
set search_path = public
as $$
begin
    if p_name is null or p_name !~ '^[0-9a-fA-F-]{36}/[^/]+$' or p_name ~ '\.\.' then
        return false;
    end if;
    return exists (
        select 1
        from public.alumnos a
        join public.solicitudes s on s.id = a.solicitud_id
        where a.id = split_part(p_name, '/', 1)::uuid
          and s.estado in ('Solicitud enviada', 'Alumno diligenciando')
    );
exception when others then
    return false;
end;
$$;
revoke all on function public.puede_subir_expediente(text) from public;
grant execute on function public.puede_subir_expediente(text) to anon, authenticated;

-- ---------- 5. RPC para el alumno (acceden solo con su código) --------
create or replace function public.abrir_solicitud(p_codigo text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
    s public.solicitudes;
begin
    if p_codigo is null or length(p_codigo) < 6 or length(p_codigo) > 64 then
        return null;
    end if;
    select * into s from public.solicitudes where codigo_unico = p_codigo;
    if not found then
        return null;
    end if;
    if s.estado = 'Solicitud enviada' then
        update public.solicitudes set estado = 'Alumno diligenciando'
        where id = s.id returning * into s;
    end if;
    return to_jsonb(s);
end;
$$;

create or replace function public.registrar_matricula(p_codigo text, p_alumno jsonb)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
    v_sol uuid;
    v_id  uuid;
begin
    v_sol := public._solicitud_editable(p_codigo);

    select id into v_id from public.alumnos
    where solicitud_id = v_sol order by created_at desc limit 1;

    if v_id is null then
        insert into public.alumnos (solicitud_id) values (v_sol) returning id into v_id;
    end if;

    update public.alumnos set
        categoria           = left(p_alumno->>'categoria', 100),
        fecha_ingreso       = nullif(p_alumno->>'fecha_ingreso', '')::date,
        tipo_documento      = left(p_alumno->>'tipo_documento', 20),
        numero_documento    = left(p_alumno->>'numero_documento', 40),
        nombres             = left(p_alumno->>'nombres', 150),
        apellidos           = left(p_alumno->>'apellidos', 150),
        genero              = left(p_alumno->>'genero', 40),
        estado_civil        = left(p_alumno->>'estado_civil', 40),
        fecha_nacimiento    = nullif(p_alumno->>'fecha_nacimiento', '')::date,
        lugar_origen        = left(p_alumno->>'lugar_origen', 150),
        estrato             = left(p_alumno->>'estrato', 10),
        eps                 = left(p_alumno->>'eps', 150),
        nivel_formacion     = left(p_alumno->>'nivel_formacion', 150),
        ocupacion           = left(p_alumno->>'ocupacion', 150),
        email_1             = left(p_alumno->>'email_1', 200),
        email_2             = left(nullif(p_alumno->>'email_2', ''), 200),
        celular             = left(p_alumno->>'celular', 30),
        telefono_fijo       = left(nullif(p_alumno->>'telefono_fijo', ''), 30),
        direccion           = left(p_alumno->>'direccion', 300),
        contacto_emergencia = left(p_alumno->>'contacto_emergencia', 150),
        celular_emergencia  = left(p_alumno->>'celular_emergencia', 30),
        asesor              = left(p_alumno->>'asesor', 150),
        es_menor_edad       = coalesce((p_alumno->>'es_menor_edad')::boolean, false)
    where id = v_id;

    return v_id;
end;
$$;

create or replace function public.registrar_acudiente(
    p_codigo text, p_alumno uuid, p_nombre text, p_documento text,
    p_celular text, p_firma_path text
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
    perform public._solicitud_editable(p_codigo, p_alumno);
    if p_firma_path is null or p_firma_path not like p_alumno::text || '/%' then
        raise exception 'Ruta de firma inválida';
    end if;

    update public.acudientes set
        nombre = left(p_nombre, 150), documento = left(p_documento, 40),
        celular = left(p_celular, 30), firma_url = p_firma_path
    where alumno_id = p_alumno;

    if not found then
        insert into public.acudientes (alumno_id, nombre, documento, celular, firma_url)
        values (p_alumno, left(p_nombre, 150), left(p_documento, 40), left(p_celular, 30), p_firma_path);
    end if;
end;
$$;

create or replace function public.registrar_documento(
    p_codigo text, p_alumno uuid, p_tipo text, p_nombre text, p_path text
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
    perform public._solicitud_editable(p_codigo, p_alumno);
    if p_tipo not in ('foto', 'cedula_pdf', 'licencia_pdf', 'habeas_data', 'ficha_matricula') then
        raise exception 'Tipo de documento no permitido';
    end if;
    if p_path is null or p_path not like p_alumno::text || '/%' then
        raise exception 'Ruta de archivo inválida';
    end if;

    update public.documentos set nombre_archivo = left(p_nombre, 200), storage_path = p_path
    where alumno_id = p_alumno and tipo = p_tipo;

    if not found then
        insert into public.documentos (alumno_id, tipo, nombre_archivo, storage_path)
        values (p_alumno, p_tipo, left(p_nombre, 200), p_path);
    end if;
end;
$$;

create or replace function public.finalizar_matricula(p_codigo text, p_alumno uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
    v_sol uuid;
begin
    v_sol := public._solicitud_editable(p_codigo, p_alumno);
    if (select count(distinct tipo) from public.documentos
        where alumno_id = p_alumno
          and tipo in ('foto', 'cedula_pdf', 'habeas_data', 'ficha_matricula')) < 4 then
        raise exception 'Faltan documentos obligatorios';
    end if;
    update public.solicitudes set estado = 'Pendiente pagos instructor' where id = v_sol;
end;
$$;

revoke all on function public.abrir_solicitud(text)                                  from public;
revoke all on function public.registrar_matricula(text, jsonb)                       from public;
revoke all on function public.registrar_acudiente(text, uuid, text, text, text, text) from public;
revoke all on function public.registrar_documento(text, uuid, text, text, text)      from public;
revoke all on function public.finalizar_matricula(text, uuid)                        from public;
grant execute on function public.abrir_solicitud(text)                                  to anon, authenticated;
grant execute on function public.registrar_matricula(text, jsonb)                       to anon, authenticated;
grant execute on function public.registrar_acudiente(text, uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.registrar_documento(text, uuid, text, text, text)      to anon, authenticated;
grant execute on function public.finalizar_matricula(text, uuid)                        to anon, authenticated;

-- ---------- 6. Políticas del instructor (se SUMAN a las existentes) --
do $$
declare
    t text;
begin
    foreach t in array array['solicitudes', 'alumnos', 'acudientes', 'documentos',
                             'configuracion_correo', 'historial_envios']
    loop
        execute format('drop policy if exists %I on public.%I', 'seg_admin_' || t, t);
        execute format(
            'create policy %I on public.%I for all to authenticated using (public.es_admin()) with check (public.es_admin())',
            'seg_admin_' || t, t);
    end loop;
end $$;

drop policy if exists seg_usuarios_select_propio on public.usuarios;
create policy seg_usuarios_select_propio on public.usuarios
    for select to authenticated using (auth.uid() = id);
drop policy if exists seg_usuarios_update_propio on public.usuarios;
create policy seg_usuarios_update_propio on public.usuarios
    for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- 7. Políticas de Storage (bucket `expedientes`) -----------
-- Instructor: todo. Alumno anónimo: solo SUBIR (no leer, no listar, no borrar)
-- dentro de la carpeta de su solicitud abierta.
insert into storage.buckets (id, name, public)
values ('expedientes', 'expedientes', false)
on conflict (id) do nothing;      -- no cambia la visibilidad actual todavía

drop policy if exists seg_expedientes_admin on storage.objects;
create policy seg_expedientes_admin on storage.objects
    for all to authenticated
    using (bucket_id = 'expedientes' and public.es_admin())
    with check (bucket_id = 'expedientes' and public.es_admin());

drop policy if exists seg_expedientes_alumno_insert on storage.objects;
create policy seg_expedientes_alumno_insert on storage.objects
    for insert to anon, authenticated
    with check (bucket_id = 'expedientes' and public.puede_subir_expediente(name));
